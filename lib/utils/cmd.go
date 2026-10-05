package utils

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"io"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"
)

var ConnectionTimeout = 60 * 30
var PipeMessageHistorySize = 500

const SSHExecutable = "ssh"

type PipeResult struct {
	cmd             *exec.Cmd
	Messages        []string
	PipeError       error
	PipeErrorReason string

	mutex        sync.Mutex
	done         chan struct{}
	ready        chan struct{}
	readyMessage string
	stopping     bool
}

type SSHPipeResult struct {
	PipeResult *PipeResult
	LocalPort  string
}

func (p *PipeResult) AppendMessage(line string) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	// Only the target's command can acknowledge this connection attempt.
	if line == p.readyMessage {
		select {
		case <-p.ready:
		default:
			close(p.ready)
		}
		return
	}
	p.Messages = append(p.Messages, line)
	if len(p.Messages) > PipeMessageHistorySize {
		p.Messages = p.Messages[len(p.Messages)-PipeMessageHistorySize:]
	}
}

func (p *PipeResult) GetMessages() []string {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	return append([]string{}, p.Messages...)
}

func (p *PipeResult) Fail(err error, reason string) {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	p.PipeError = err
	p.PipeErrorReason = reason
}

func (p *PipeResult) ResponseCode() int16 {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if p.PipeError != nil || len(p.PipeErrorReason) > 0 {
		return 500
	}

	return 200
}

func (p *PipeResult) ResponseMessage() string {
	p.mutex.Lock()
	defer p.mutex.Unlock()

	if len(p.PipeErrorReason) > 0 {
		return p.PipeErrorReason
	}

	return "success"
}

func (p *PipeResult) Run() {
	stdout, stdoutWriter, err := os.Pipe()
	if err != nil {
		p.Fail(err, "failed to get stdout Pipe")
		close(p.done)
		return
	}

	stderr, stderrWriter, err := os.Pipe()
	if err != nil {
		stdout.Close()
		stdoutWriter.Close()
		p.Fail(err, "failed to get stderr Pipe")
		close(p.done)
		return
	}

	// These pipes stay open until readers drain, independently of cmd.Wait.
	p.cmd.Stdout = stdoutWriter
	p.cmd.Stderr = stderrWriter
	err = p.cmd.Start()
	stdoutWriter.Close()
	stderrWriter.Close()
	if err != nil {
		stdout.Close()
		stderr.Close()
		p.Fail(err, "failed to start command")
		close(p.done)
		return
	}

	var readers sync.WaitGroup
	readers.Add(2)
	readMessages := func(reader io.ReadCloser, reason string) {
		defer readers.Done()
		defer reader.Close()

		scanner := bufio.NewScanner(reader)
		for scanner.Scan() {
			p.AppendMessage(scanner.Text())
		}
		if err := scanner.Err(); err != nil && !errors.Is(err, os.ErrClosed) {
			p.Fail(err, reason)
		}
	}
	go readMessages(stdout, "failed to read stdout")
	go readMessages(stderr, "failed to read stderr")

	readersDone := make(chan struct{})
	go func() {
		readers.Wait()
		close(readersDone)
	}()
	go func() {
		err := p.cmd.Wait()
		// A proxy may outlive SSH and retain an output pipe.
		if cleanupErr := stopProcessGroup(p.cmd); cleanupErr != nil {
			p.Fail(cleanupErr, "failed to stop proxy processes")
		}
		select {
		case <-readersDone:
		case <-time.After(time.Second):
			stdout.Close()
			stderr.Close()
			<-readersDone
		}
		p.mutex.Lock()
		if err != nil && !p.stopping {
			p.PipeError = err
			p.PipeErrorReason = "command exited with error"
		}
		p.mutex.Unlock()
		close(p.done)
	}()
}

func (p *PipeResult) Stop() bool {
	if p.IsRunning() {
		p.mutex.Lock()
		p.stopping = true
		p.mutex.Unlock()

		if err := stopProcessGroup(p.cmd); err != nil {
			p.Fail(err, "failed to kill process")
			return false
		}
		<-p.done
	}
	return true
}

func (p *PipeResult) IsRunning() bool {
	if p.cmd.Process == nil {
		return false
	}
	select {
	case <-p.done:
		return false
	default:
		return true
	}
}

func (p *PipeResult) Hash() string {
	return GetMD5Hash(strings.Join(p.cmd.Args, " "))
}

func Pipe(cmd exec.Cmd) *PipeResult {
	prepareProcessGroup(&cmd)
	readyMessage := "kawaiissh-ready-" + uuid.NewString()
	cmd.Env = append(cmd.Environ(), "KAWAII_SSH_READY="+readyMessage)
	return &PipeResult{
		cmd:          &cmd,
		Messages:     make([]string, 0),
		done:         make(chan struct{}),
		ready:        make(chan struct{}),
		readyMessage: readyMessage,
	}
}

func Ssh(
	ctx context.Context,
	username string,
	host string,
	localPort string,
	remoteDestination string,
	remotePort string,
	keyPath string,
) *SSHPipeResult {
	cmdStr := fmt.Sprintf(
		"%s %s@%s -L %s:%s:%s -i %s -v -o IdentitiesOnly=yes -o StrictHostKeyChecking=no "+
			"-o ExitOnForwardFailure=yes -o ConnectTimeout=10 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 "+
			"-o ControlMaster=no -o ControlPath=none -o ForkAfterAuthentication=no \"echo $KAWAII_SSH_READY; sleep %d\"",
		SSHExecutable,
		username,
		host,
		localPort,
		remoteDestination,
		remotePort,
		keyPath,
		ConnectionTimeout,
	)

	runtime.LogInfof(ctx, "Initialized SSH command cmd=%s", cmdStr)

	// The shell replaces itself so Stop targets SSH directly.
	cmd := exec.Command("/bin/sh", "-c", "exec "+cmdStr)

	pipeResult := Pipe(*cmd)

	return &SSHPipeResult{PipeResult: pipeResult, LocalPort: localPort}
}

func (sshPipe *SSHPipeResult) IsConnected() bool {
	select {
	case <-sshPipe.PipeResult.ready:
		return sshPipe.PipeResult.IsRunning()
	default:
		return false
	}
}

func (sshPipe *SSHPipeResult) WaitForConnection(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	select {
	case <-sshPipe.PipeResult.ready:
		if sshPipe.IsConnected() {
			return nil
		}
	case <-sshPipe.PipeResult.done:
	case <-ctx.Done():
		return fmt.Errorf("SSH tunnel did not become ready: %w", ctx.Err())
	}
	return errors.New("SSH exited before the tunnel became ready")
}

func SshReconnect(ctx context.Context, sshPipe *SSHPipeResult) *SSHPipeResult {
	runtime.LogInfof(ctx, "Reconnecting SSH command")
	return sshPipe.reconnect()
}

func (sshPipe *SSHPipeResult) reconnect() *SSHPipeResult {
	if !sshPipe.PipeResult.Stop() {
		return sshPipe
	}

	cmd := exec.Command(sshPipe.PipeResult.cmd.Path, sshPipe.PipeResult.cmd.Args[1:]...)

	reconnectedPipe := Pipe(*cmd)

	// Copy messages from the previous pipe
	reconnectedPipe.Messages = sshPipe.PipeResult.GetMessages()

	reconnectedPipe.Run()

	sshPipe.PipeResult = reconnectedPipe

	return sshPipe
}

func CmdExecute(ctx context.Context, cmdStr string) ([]string, error) {
	cmd := exec.Command("/bin/sh", "-c", cmdStr)

	runtime.LogInfof(ctx, "Running commdn cmd=%s", cmdStr)

	var out bytes.Buffer
	cmd.Stdout = &out

	err := cmd.Run()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(out.String(), "\n")

	return lines, nil
}

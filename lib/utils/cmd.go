package utils

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os/exec"
	"strings"
)

var ConnectionTimeout = 60 * 30

const SSHExecutable = "ssh"

type SSHPipe struct {
	cmd             *exec.Cmd
	Messages        []string
	PipeError       error
	PipeErrorReason string

	messageChannel chan string
}

func (p *SSHPipe) AppendMessage(line string) {
	p.messageChannel <- line
}

func (p *SSHPipe) Fail(err error, reason string) {
	p.PipeError = err
	p.PipeErrorReason = reason
}

func (p *SSHPipe) ResponseCode() int16 {
	if p.PipeError != nil || len(p.PipeErrorReason) > 0 {
		return 500
	}

	return 200
}

func (p *SSHPipe) ResponseMessage() string {
	if len(p.PipeErrorReason) > 0 {
		return p.PipeErrorReason
	}

	return "success"
}

func (p *SSHPipe) Run() {
	if err := p.cmd.Start(); err != nil {
		p.Fail(err, "failed to start command")
	}

	go func() {
		if err := p.cmd.Wait(); err != nil {
			p.Fail(err, "command exited with error")
		}
	}()

	go func() {
		for {
			select {
			case msg := <-p.messageChannel:
				p.Messages = append(p.Messages, msg)
			}
		}
	}()
}

func (p *SSHPipe) Stop() {
	if p.cmd.Process != nil {
		err := p.cmd.Process.Kill()

		if err != nil {
			p.Fail(err, "failed to kill process")
		}
	}
}

func (p *SSHPipe) Hash() string {
	return GetMD5Hash(strings.Join(p.cmd.Args, " "))
}

func Pipe(cmd exec.Cmd) *SSHPipe {
	pipeResult := SSHPipe{
		cmd:            &cmd,
		Messages:       make([]string, 0),
		messageChannel: make(chan string),
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		pipeResult.Fail(err, "failed to get stdout Pipe")
		return &pipeResult
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		pipeResult.Fail(err, "failed to get stderr Pipe")
		return &pipeResult
	}

	go func() {
		scanner := bufio.NewScanner(stdout)

		for scanner.Scan() {
			pipeResult.AppendMessage(scanner.Text())
		}

		if err = scanner.Err(); err != nil {
			pipeResult.Fail(err, "failed to read stdout")
		}
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)

		for scanner.Scan() {
			pipeResult.AppendMessage(scanner.Text())
		}

		if err = scanner.Err(); err != nil {
			pipeResult.Fail(err, "failed to read stderr")
		}
	}()

	return &pipeResult
}

func Ssh(
	ctx context.Context,
	username string,
	host string,
	localPort string,
	remoteDestination string,
	remotePort string,
	keyPath string,
	timeout *int,
) *SSHPipe {
	if timeout == nil {
		timeout = &ConnectionTimeout
	}

	cmdStr := fmt.Sprintf(
		"%s %s@%s -L %s:%s:%s -i %s -v -o IdentitiesOnly=yes sleep %d",
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

	cmd := exec.Command("/bin/sh", "-c", cmdStr)

	pipeResult := Pipe(*cmd)

	return pipeResult
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

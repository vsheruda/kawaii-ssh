package main

import (
	"KawaiiSSH/lib/models"
	"KawaiiSSH/lib/utils"
	"context"
	"errors"
	"fmt"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"os"
	"regexp"
	"strconv"
	"sync"
	"time"
)

// App struct
type App struct {
	ctx           context.Context
	sshPipes      map[string]*utils.SSHPipeResult
	sshPipesMutex sync.Mutex
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.sshPipes = make(map[string]*utils.SSHPipeResult)

	go ConnectionLoop(a)
}

func ConnectionLoop(a *App) {
	for {
		a.sshPipesMutex.Lock()

		for k, sshPipe := range a.sshPipes {
			if !sshPipe.PipeResult.IsRunning() {
				utils.SshReconnect(a.ctx, a.sshPipes[k])
			}
		}

		a.sshPipesMutex.Unlock()

		time.Sleep(2 * time.Second)
	}
}

func (a *App) Disconnect(hash string) models.ConnectResponse {
	runtime.LogInfof(a.ctx, "Disconnecting hash=%s", hash)
	response := a.disconnect(hash)
	runtime.LogInfof(a.ctx, "Disconnected hash=%s response_code=%d", hash, response.ResponseCode)
	return response
}

func (a *App) disconnect(hash string) models.ConnectResponse {
	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	if _, ok := a.sshPipes[hash]; !ok {
		return models.ConnectResponse{
			ID:              hash,
			Messages:        []string{},
			ResponseMessage: "Already disconnected",
			ResponseCode:    200,
		}
	}

	sshPipe := a.sshPipes[hash]

	if !sshPipe.PipeResult.Stop() {
		return models.ConnectResponse{
			ID:              hash,
			Messages:        sshPipe.PipeResult.GetMessages(),
			ResponseMessage: sshPipe.PipeResult.ResponseMessage(),
			ResponseCode:    500,
		}
	}
	delete(a.sshPipes, hash)

	return models.ConnectResponse{
		ID:              sshPipe.PipeResult.Hash(),
		Messages:        sshPipe.PipeResult.GetMessages(),
		ResponseMessage: "Disconnected",
		ResponseCode:    200,
	}
}

func (a *App) Connect(payload models.ConnectPayload) models.ConnectResponse {
	sshPipe := utils.Ssh(
		a.ctx,
		payload.Username,
		payload.Host,
		payload.LocalPort,
		payload.RemoteDestination,
		payload.RemotePort,
		payload.KeyPath,
	)
	response := a.connect(sshPipe)
	runtime.LogInfof(
		a.ctx,
		"Returning connection response info=%s response_message=%s",
		response.Messages,
		response.ResponseMessage,
	)
	return response
}

func (a *App) connect(sshPipe *utils.SSHPipeResult) models.ConnectResponse {
	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	hash := sshPipe.PipeResult.Hash()

	if _, ok := a.sshPipes[hash]; !ok {
		a.sshPipes[hash] = sshPipe

		sshPipe.PipeResult.Run()
		if err := sshPipe.WaitForConnection(a.ctx); err != nil {
			sshPipe.PipeResult.Stop()
			sshPipe.PipeResult.Fail(err, err.Error())
			delete(a.sshPipes, hash)
		}
	} else {
		sshPipe = a.sshPipes[hash]
	}

	return models.ConnectResponse{
		ID:              hash,
		IsConnected:     sshPipe.IsConnected(),
		Messages:        sshPipe.PipeResult.GetMessages(),
		ResponseMessage: sshPipe.PipeResult.ResponseMessage(),
		ResponseCode:    sshPipe.PipeResult.ResponseCode(),
	}
}

func (a *App) TestHost(configuration models.SSHConfiguration) models.TestHostResponse {
	if err := utils.TestSSHConnection(a.ctx, configuration.Username, configuration.Host, configuration.KeyPath); err != nil {
		return models.TestHostResponse{
			ResponseCode:    500,
			ResponseMessage: fmt.Sprintf("The SSH connection failed.\n\n%s", err),
		}
	}
	return models.TestHostResponse{
		ResponseCode:    200,
		ResponseMessage: fmt.Sprintf("SSH connection to %s@%s succeeded.", configuration.Username, configuration.Host),
	}
}

func (a *App) GetProfile() models.ProfileResponse {
	profile, err := models.LoadProfile()

	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to load profile error=%s", err)

		return models.ProfileResponse{
			ResponseCode: 500,
		}
	}

	return models.ProfileResponse{
		Profile:      *profile,
		Version:      Version,
		ResponseCode: 200,
	}
}

func (a *App) GetSystemHealth() models.SystemHealthResponse {
	lines, err := utils.CmdExecute(a.ctx, "ps aux | grep ssh")

	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to execute command error=%s", err)

		return models.SystemHealthResponse{ResponseCode: 500}
	}

	pattern := `[^\s]+\s+(\d+) .+ ssh ([a-zA-Z0-9._-]+)@(.+) -L (\d+):([^:]+):(\d+) -i (.+) -v -o IdentitiesOnly=yes`
	re := regexp.MustCompile(pattern)

	openTunnels := make([]models.OpenTunnel, 0)

	for _, it := range lines {
		matches := re.FindStringSubmatch(it)

		if matches == nil {
			continue
		}

		openTunnels = append(
			openTunnels,
			models.OpenTunnel{
				PID:               matches[1],
				Username:          matches[2],
				Host:              matches[3],
				LocalPort:         matches[4],
				RemoteDestination: matches[5],
				RemotePort:        matches[6],
			},
		)
	}

	return models.SystemHealthResponse{
		ResponseCode: 200,
		OpenTunnels:  openTunnels,
	}
}

func (a *App) TerminateProcesses(pids []string) error {
	runtime.LogInfof(a.ctx, "Terminating all tunnels")
	err := a.terminateProcesses(pids)
	if err != nil {
		runtime.LogErrorf(a.ctx, "Tunnel termination failed: %s", err)
	}
	return err
}

func (a *App) terminateProcesses(pids []string) error {
	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	// Cancel every retry before stopping any process, including attempts without a PID.
	pipes := a.sshPipes
	a.sshPipes = make(map[string]*utils.SSHPipeResult)
	var failures []error
	for hash, pipe := range pipes {
		if !pipe.PipeResult.Stop() {
			failures = append(failures, fmt.Errorf("could not stop tunnel %s: %s", hash, pipe.PipeResult.ResponseMessage()))
		}
	}

	// The system list can also contain tunnels left by earlier app sessions.
	for _, value := range pids {
		pid, err := strconv.Atoi(value)
		if err != nil || pid <= 0 {
			failures = append(failures, fmt.Errorf("invalid process ID %q", value))
			continue
		}
		process, err := os.FindProcess(pid)
		if err == nil {
			err = process.Kill()
			process.Release()
		}
		if err != nil && !errors.Is(err, os.ErrProcessDone) {
			failures = append(failures, fmt.Errorf("could not stop process %d: %w", pid, err))
		}
	}
	return errors.Join(failures...)
}

func (a *App) SaveProfile(profile models.Profile) {
	runtime.LogInfof(a.ctx, "Saving profile %v", profile)

	err := models.SyncProfile(&profile)

	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to save profile error=%s", err)
	}
}

func (a *App) GetConnections() []models.ConnectionStateResponse {
	connections := make([]models.ConnectionStateResponse, 0)

	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	for k, sshPipe := range a.sshPipes {
		connections = append(connections, models.ConnectionStateResponse{
			ID:          k,
			Messages:    sshPipe.PipeResult.GetMessages(),
			IsConnected: sshPipe.IsConnected(),
		})
	}

	return connections
}

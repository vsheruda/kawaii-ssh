package main

import (
	"KawaiiSSH/lib/models"
	"KawaiiSSH/lib/utils"
	"context"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"regexp"
	"time"
)

// App struct
type App struct {
	ctx      context.Context
	sshPipes map[string]*utils.SSHPipe
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.sshPipes = make(map[string]*utils.SSHPipe)
}

func (a *App) Disconnect(hash string) models.ConnectResponse {
	runtime.LogInfof(a.ctx, "Disconnecting hash=%s", hash)

	sshPipe := a.sshPipes[hash]

	sshPipe.Stop()

	delete(a.sshPipes, hash)

	runtime.LogInfof(a.ctx, "Disconnected hash=%s response_code=%d", sshPipe.Hash(), sshPipe.ResponseCode())

	return models.ConnectResponse{
		ID:              sshPipe.Hash(),
		Messages:        sshPipe.Messages,
		ResponseMessage: sshPipe.ResponseMessage(),
		ResponseCode:    sshPipe.ResponseCode(),
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
		nil,
	)

	if _, ok := a.sshPipes[sshPipe.Hash()]; !ok {
		a.sshPipes[sshPipe.Hash()] = sshPipe

		sshPipe.Run()

		time.Sleep(3 * time.Second)
	} else {
		sshPipe = a.sshPipes[sshPipe.Hash()]
	}

	runtime.LogInfof(
		a.ctx,
		"Returning connection response info=%s response_message=%s",
		sshPipe.Messages,
		sshPipe.ResponseMessage(),
	)

	return models.ConnectResponse{
		ID:              sshPipe.Hash(),
		Messages:        sshPipe.Messages,
		ResponseMessage: sshPipe.ResponseMessage(),
		ResponseCode:    sshPipe.ResponseCode(),
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
		ResponseCode: 200,
	}
}

func (a *App) GetSystemHealth() models.SystemHealthResponse {
	lines, err := utils.CmdExecute(a.ctx, "ps aux | grep ssh")

	if err != nil {
		runtime.LogErrorf(a.ctx, "Failed to execute command error=%s", err)

		return models.SystemHealthResponse{ResponseCode: 500}
	}

	pattern := `[^\s]+ (\d+) .+ ssh ([a-zA-Z0-9._-]+)@(.+) -L (\d+):([^:]+):(\d+) -i (.+) -v -o IdentitiesOnly=yes`
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

func (a *App) TerminateProcesses(pids []string) {
	for _, pid := range pids {
		_, err := utils.CmdExecute(a.ctx, "kill -9 "+pid)

		if err != nil {
			runtime.LogErrorf(a.ctx, "Failed to kill process pid=%s error=%s", pid, err)
		}
	}

	// This won't work once termination by PID is implemented.
	// Need to find a better way to know which hash to remove.
	for k, _ := range a.sshPipes {
		delete(a.sshPipes, k)
	}
}

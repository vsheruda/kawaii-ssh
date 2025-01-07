package main

import (
	"KawaiiSSH/lib/models"
	"KawaiiSSH/lib/utils"
	"context"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"regexp"
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
			if !sshPipe.IsConnected {
				continue
			}

			sshPipe.IsConnected = utils.IsConnectionOpen(a.ctx, sshPipe.LocalPort)

			if !sshPipe.IsConnected {
				utils.SshReconnect(a.ctx, a.sshPipes[k])
			}
		}

		a.sshPipesMutex.Unlock()

		time.Sleep(2 * time.Second)
	}
}

func (a *App) Disconnect(hash string) models.ConnectResponse {
	runtime.LogInfof(a.ctx, "Disconnecting hash=%s", hash)

	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	if _, ok := a.sshPipes[hash]; !ok || !a.sshPipes[hash].IsConnected {
		return models.ConnectResponse{
			ID:              hash,
			Messages:        []string{},
			ResponseMessage: "Already disconnected",
			ResponseCode:    200,
		}
	}

	sshPipe := a.sshPipes[hash]

	sshPipe.PipeResult.Stop()

	delete(a.sshPipes, hash)

	runtime.LogInfof(
		a.ctx,
		"Disconnected hash=%s response_code=%d",
		sshPipe.PipeResult.Hash(),
		sshPipe.PipeResult.ResponseCode(),
	)

	return models.ConnectResponse{
		ID:              sshPipe.PipeResult.Hash(),
		Messages:        sshPipe.PipeResult.Messages,
		ResponseMessage: sshPipe.PipeResult.ResponseMessage(),
		ResponseCode:    sshPipe.PipeResult.ResponseCode(),
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

	a.sshPipesMutex.Lock()
	defer a.sshPipesMutex.Unlock()

	hash := sshPipe.PipeResult.Hash()

	if _, ok := a.sshPipes[hash]; !ok || !a.sshPipes[hash].IsConnected {
		a.sshPipes[hash] = sshPipe

		sshPipe.PipeResult.Run()

		time.Sleep(2 * time.Second)
	} else {
		sshPipe = a.sshPipes[hash]
	}

	runtime.LogInfof(
		a.ctx,
		"Returning connection response info=%s response_message=%s",
		sshPipe.PipeResult.Messages,
		sshPipe.PipeResult.ResponseMessage(),
	)

	return models.ConnectResponse{
		ID:              hash,
		Messages:        sshPipe.PipeResult.Messages,
		ResponseMessage: sshPipe.PipeResult.ResponseMessage(),
		ResponseCode:    sshPipe.PipeResult.ResponseCode(),
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
			Messages:    sshPipe.PipeResult.Messages,
			IsConnected: sshPipe.IsConnected,
		})
	}

	return connections
}

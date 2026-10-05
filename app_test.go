package main

import (
	"KawaiiSSH/lib/utils"
	"context"
	"os/exec"
	"testing"
	"time"
)

func TestInitialConnectionFailureIsNotRetried(t *testing.T) {
	for _, test := range []struct{ name, command string }{
		{"authentication failure", "echo 'Permission denied (publickey).' >&2; exit 255"},
		{"clean exit without forwarding", "exit 0"},
		{"handshake timeout", "exec /bin/sleep 30"},
	} {
		t.Run(test.name, func(t *testing.T) {
			ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
			defer cancel()
			a := &App{ctx: ctx, sshPipes: make(map[string]*utils.SSHPipeResult)}
			pipe := utils.Pipe(*exec.Command("/bin/sh", "-c", test.command))
			t.Cleanup(func() { pipe.Stop() })
			response := a.connect(&utils.SSHPipeResult{PipeResult: pipe})
			if response.ResponseCode != 500 || len(a.sshPipes) != 0 || pipe.IsRunning() {
				t.Fatalf("failed attempt remains owned: response=%+v, pipes=%d, running=%v",
					response, len(a.sshPipes), pipe.IsRunning())
			}
		})
	}
}

func TestConnectionStateReflectsProcessExit(t *testing.T) {
	a := &App{ctx: context.Background(), sshPipes: make(map[string]*utils.SSHPipeResult)}
	pipe := utils.Pipe(*exec.Command("/bin/sh", "-c",
		"echo 'debug1: Entering interactive session.' >&2; exec /bin/sleep 30"))
	t.Cleanup(func() { pipe.Stop() })
	response := a.connect(&utils.SSHPipeResult{PipeResult: pipe})
	if response.ResponseCode != 200 || len(a.sshPipes) != 1 {
		t.Fatalf("ready connection was not retained: %+v", response)
	}
	if connections := a.GetConnections(); len(connections) != 1 || !connections[0].IsConnected {
		t.Fatalf("ready tunnel was not connected: %+v", connections)
	}
	pipe.Stop()
	if connections := a.GetConnections(); len(connections) != 1 || connections[0].IsConnected {
		t.Fatalf("exited tunnel was still connected: %+v", connections)
	}
}

package main

import (
	"KawaiiSSH/lib/utils"
	"context"
	"os/exec"
	"strconv"
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

func TestTerminateAllCancelsTrackedTunnelsWithoutProcessList(t *testing.T) {
	a := &App{ctx: context.Background(), sshPipes: make(map[string]*utils.SSHPipeResult)}
	running := utils.Pipe(*exec.Command("/bin/sh", "-c", "echo \"$KAWAII_SSH_READY\"; exec /bin/sleep 30"))
	t.Cleanup(func() { running.Stop() })
	if response := a.connect(&utils.SSHPipeResult{PipeResult: running}); response.ResponseCode != 200 {
		t.Fatalf("could not start fixture: %+v", response)
	}
	failed := utils.Pipe(*exec.Command("/nonexistent/kawaiissh-test"))
	failed.Run()
	a.sshPipes[failed.Hash()] = &utils.SSHPipeResult{PipeResult: failed}

	if err := a.terminateProcesses(nil); err != nil {
		t.Fatal(err)
	}
	if running.IsRunning() || len(a.GetConnections()) != 0 {
		t.Fatal("termination left processes or retry entries behind")
	}
	if err := a.terminateProcesses(nil); err != nil {
		t.Fatalf("repeated termination failed: %v", err)
	}
	// A later explicit connection must still work after cancellation.
	replacement := utils.Pipe(*exec.Command("/bin/sh", "-c", "echo \"$KAWAII_SSH_READY\"; exec /bin/sleep 30"))
	t.Cleanup(func() { replacement.Stop() })
	if response := a.connect(&utils.SSHPipeResult{PipeResult: replacement}); response.ResponseCode != 200 || !response.IsConnected {
		t.Fatalf("explicit connection after termination failed: %+v", response)
	}
}

func TestTerminateAllHandlesAnExitedProcessSnapshot(t *testing.T) {
	a := &App{ctx: context.Background(), sshPipes: make(map[string]*utils.SSHPipeResult)}
	pipe := utils.Pipe(*exec.Command("/bin/sh", "-c", "echo $$; echo \"$KAWAII_SSH_READY\"; exec /bin/sleep 30"))
	t.Cleanup(func() { pipe.Stop() })
	if response := a.connect(&utils.SSHPipeResult{PipeResult: pipe}); response.ResponseCode != 200 {
		t.Fatalf("could not start fixture: %+v", response)
	}
	pid := pipe.GetMessages()[0]
	if err := a.terminateProcesses([]string{pid}); err != nil {
		t.Fatalf("the process snapshot must tolerate tracked processes already stopped: %v", err)
	}
	if pipe.IsRunning() || len(a.GetConnections()) != 0 {
		t.Fatal("termination left a tracked tunnel behind")
	}
}

func TestTerminateAllStopsUntrackedProcesses(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "/bin/sleep", "30")
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	a := &App{sshPipes: make(map[string]*utils.SSHPipeResult)}
	if err := a.terminateProcesses([]string{strconv.Itoa(cmd.Process.Pid)}); err != nil {
		cmd.Process.Kill()
		cmd.Wait()
		t.Fatal(err)
	}
	cmd.Wait()
	if ctx.Err() != nil {
		t.Fatal("termination left the untracked process running")
	}
}

func TestConnectionStateReflectsProcessExit(t *testing.T) {
	a := &App{ctx: context.Background(), sshPipes: make(map[string]*utils.SSHPipeResult)}
	pipe := utils.Pipe(*exec.Command("/bin/sh", "-c",
		"echo \"$KAWAII_SSH_READY\"; exec /bin/sleep 30"))
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

func TestDisconnectRemovesFailedRetry(t *testing.T) {
	a := &App{ctx: context.Background(), sshPipes: make(map[string]*utils.SSHPipeResult)}
	pipe := utils.Pipe(*exec.Command("/bin/sh", "-c", "exit 255"))
	t.Cleanup(func() { pipe.Stop() })
	pipe.Run()
	deadline := time.Now().Add(time.Second)
	for pipe.IsRunning() && time.Now().Before(deadline) {
		time.Sleep(time.Millisecond)
	}
	if pipe.ResponseCode() != 500 {
		t.Fatal("the retry did not fail")
	}
	hash := pipe.Hash()
	a.sshPipes[hash] = &utils.SSHPipeResult{PipeResult: pipe}
	response := a.disconnect(hash)
	if response.ResponseCode != 200 || len(a.GetConnections()) != 0 {
		t.Fatalf("cancellation kept the failed retry: %+v", response)
	}
	if response := a.disconnect(hash); response.ResponseCode != 200 {
		t.Fatalf("repeated cleanup before deletion failed: %+v", response)
	}
}

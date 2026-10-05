package utils

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"testing"
	"time"
)

func waitForPipe(t *testing.T, pipe *PipeResult) {
	t.Helper()
	select {
	case <-pipe.done:
	case <-time.After(5 * time.Second):
		t.Fatal("process or output readers did not finish")
	}
}

func waitForListener(t *testing.T, pipe *PipeResult) {
	t.Helper()
	if pipe.cmd.Process == nil {
		t.Fatalf("listener process did not start: %s", pipe.ResponseMessage())
	}
	ready := fmt.Sprintf("ready %d", pipe.cmd.Process.Pid)
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if slices.Contains(pipe.GetMessages(), ready) {
			return
		}
		if !pipe.IsRunning() {
			t.Fatalf("listener failed: %v", pipe.GetMessages())
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatalf("listener did not start: %v", pipe.GetMessages())
}

func TestReconnectReleasesPreviousListener(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	address := listener.Addr().String()
	listener.Close()

	cmd := exec.Command("/bin/sh", "-c", `exec "$@"`, "test-tunnel",
		os.Args[0], "-test.run=^TestTunnelProcess$", "--", address)
	tunnel := &SSHPipeResult{PipeResult: Pipe(*cmd)}
	t.Cleanup(func() { tunnel.PipeResult.Stop() })
	tunnel.PipeResult.Run()
	waitForListener(t, tunnel.PipeResult)

	for i := 0; i < 10; i++ {
		previous := tunnel.PipeResult
		t.Cleanup(func() { previous.Stop() })
		tunnel.reconnect()
		if previous.IsRunning() || previous.cmd.ProcessState == nil {
			t.Fatal("reconnect did not stop and wait for the previous process")
		}
		if !tunnel.PipeResult.IsRunning() {
			t.Fatal("replacement process did not start")
		}
		waitForListener(t, tunnel.PipeResult)
	}
	if !tunnel.PipeResult.Stop() || !tunnel.PipeResult.Stop() {
		t.Fatal("stopping a tunnel must be safe to repeat")
	}
	if tunnel.PipeResult.ResponseCode() != 200 {
		t.Fatal("an intentional stop must not report a command failure")
	}
}

func TestTunnelReadinessResetsOnReconnect(t *testing.T) {
	pipe := Pipe(*exec.Command("/bin/sleep", "30"))
	tunnel := &SSHPipeResult{PipeResult: pipe}
	t.Cleanup(func() { tunnel.PipeResult.Stop() })
	pipe.Run()
	if tunnel.IsConnected() {
		t.Fatal("process startup was reported as a ready tunnel")
	}
	pipe.AppendMessage("debug1: Local forwarding listening on 127.0.0.1 port 1234.")
	pipe.AppendMessage("bind [127.0.0.1]:1234: Address already in use")
	if tunnel.IsConnected() {
		t.Fatal("a listener attempt was reported as a ready tunnel")
	}
	pipe.AppendMessage("debug1: Entering interactive session.")
	if tunnel.IsConnected() {
		t.Fatal("proxy diagnostics were accepted as target readiness")
	}
	pipe.AppendMessage(pipe.readyMessage)
	if err := tunnel.WaitForConnection(context.Background()); err != nil {
		t.Fatal(err)
	}
	for i := 0; i < PipeMessageHistorySize; i++ {
		pipe.AppendMessage("later output")
	}
	if !tunnel.IsConnected() {
		t.Fatal("trimming old messages lost readiness")
	}
	tunnel.reconnect()
	if tunnel.PipeResult.Hash() != pipe.Hash() {
		t.Fatal("the readiness token changed the connection identity")
	}
	tunnel.PipeResult.AppendMessage(pipe.readyMessage)
	if tunnel.IsConnected() {
		t.Fatal("the replacement inherited the previous tunnel's readiness")
	}
	tunnel.PipeResult.AppendMessage(tunnel.PipeResult.readyMessage)
	tunnel.PipeResult.cmd.Process.Kill()
	waitForPipe(t, tunnel.PipeResult)
	if tunnel.IsConnected() {
		t.Fatal("an exited process was reported as connected")
	}
}

func TestFailedReconnectsStayDisconnected(t *testing.T) {
	tunnel := &SSHPipeResult{PipeResult: Pipe(*exec.Command("/bin/sh", "-c", "exit 1"))}
	t.Cleanup(func() { tunnel.PipeResult.Stop() })
	tunnel.PipeResult.Run()
	for i := 0; i < 3; i++ {
		waitForPipe(t, tunnel.PipeResult)
		tunnel.reconnect()
		if tunnel.IsConnected() {
			t.Fatal("a failed replacement was reported as connected")
		}
	}
}

// This test also provides a local tunnel process for the reconnect test.
func TestTunnelProcess(t *testing.T) {
	if len(os.Args) < 3 || os.Args[len(os.Args)-2] != "--" {
		return
	}
	listener, err := net.Listen("tcp", os.Args[len(os.Args)-1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	defer listener.Close()
	fmt.Printf("ready %d\n", os.Getpid())
	for {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		conn.Close()
	}
}

func TestPipeCompletesAfterExitOrStartFailure(t *testing.T) {
	for _, test := range []struct {
		name string
		cmd  *exec.Cmd
		code int16
	}{
		{"success", exec.Command("/bin/sh", "-c", "exit 0"), 200},
		{"failure", exec.Command("/bin/sh", "-c", "exit 1"), 500},
		{"missing executable", exec.Command(filepath.Join(t.TempDir(), "missing")), 500},
	} {
		t.Run(test.name, func(t *testing.T) {
			pipe := Pipe(*test.cmd)
			t.Cleanup(func() { pipe.Stop() })
			pipe.Run()
			waitForPipe(t, pipe)
			if pipe.IsRunning() || pipe.ResponseCode() != test.code {
				t.Fatalf("unexpected state: running=%v, code=%d", pipe.IsRunning(), pipe.ResponseCode())
			}
		})
	}
}

func TestPipeKeepsRecentOutput(t *testing.T) {
	cmd := exec.Command("/bin/sh", "-c", "i=0; while [ $i -lt 600 ]; do echo line-$i; i=$((i+1)); done")
	pipe := Pipe(*cmd)
	t.Cleanup(func() { pipe.Stop() })
	pipe.Run()
	deadline := time.Now().Add(5 * time.Second)
	for pipe.IsRunning() && time.Now().Before(deadline) {
		pipe.GetMessages()
		pipe.ResponseCode()
		pipe.ResponseMessage()
		time.Sleep(time.Millisecond)
	}
	waitForPipe(t, pipe)
	messages := pipe.GetMessages()
	if len(messages) != PipeMessageHistorySize || messages[0] != "line-100" || messages[len(messages)-1] != "line-599" {
		t.Fatalf("unexpected output history: %v", messages)
	}
	messages[0] = "changed"
	if pipe.GetMessages()[0] == "changed" {
		t.Fatal("the output snapshot shares mutable storage")
	}
}

func TestPipeCapturesBothOutputStreams(t *testing.T) {
	pipe := Pipe(*exec.Command("/bin/sh", "-c", "echo stdout; echo stderr >&2"))
	t.Cleanup(func() { pipe.Stop() })
	pipe.Run()
	waitForPipe(t, pipe)
	messages := pipe.GetMessages()
	if len(messages) != 2 || !slices.Contains(messages, "stdout") || !slices.Contains(messages, "stderr") {
		t.Fatalf("unexpected output: %v", messages)
	}
}

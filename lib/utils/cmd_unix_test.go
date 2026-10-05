//go:build !windows

package utils

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"

	"golang.org/x/crypto/ssh"
)

func waitForPIDFile(t *testing.T, path string) int {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		data, err := os.ReadFile(path)
		if err == nil {
			if pid, err := strconv.Atoi(strings.TrimSpace(string(data))); err == nil {
				return pid
			}
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("child process did not start")
	return 0
}

func TestSSHProxyCleanup(t *testing.T) {
	ssh, err := exec.LookPath("ssh")
	if err != nil {
		t.Skip("OpenSSH is not installed")
	}
	for _, action := range []string{"stop", "unexpected exit"} {
		t.Run(action, func(t *testing.T) {
			proxy := filepath.Join(t.TempDir(), "proxy")
			if err := os.WriteFile(proxy, []byte("#!/bin/sh\necho $$ > \"$0.pid\"\nexec /bin/sleep 30\n"), 0700); err != nil {
				t.Fatal(err)
			}
			pipe := Pipe(*exec.Command(ssh, "-F", "/dev/null", "-o", "BatchMode=yes",
				"-o", "ProxyCommand="+proxy, "unused.invalid"))
			t.Cleanup(func() { pipe.Stop() })
			pipe.Run()
			pid := waitForPIDFile(t, proxy+".pid")
			t.Cleanup(func() { syscall.Kill(pid, syscall.SIGKILL) })
			if action == "stop" {
				stopped := make(chan bool, 1)
				go func() { stopped <- pipe.Stop() }()
				select {
				case ok := <-stopped:
					if !ok {
						t.Fatal("Stop failed")
					}
				case <-time.After(3 * time.Second):
					t.Fatal("Stop blocked on the proxy's output pipe")
				}
			} else {
				if err := pipe.cmd.Process.Kill(); err != nil {
					t.Fatal(err)
				}
			}
			waitForPipe(t, pipe)
			deadline := time.Now().Add(3 * time.Second)
			for time.Now().Before(deadline) {
				if errors.Is(syscall.Kill(pid, 0), syscall.ESRCH) {
					return
				}
				time.Sleep(5 * time.Millisecond)
			}
			t.Fatal("the SSH proxy survived its parent")
		})
	}
}

func TestPipeBoundsDetachedOutputCleanup(t *testing.T) {
	pidFile := filepath.Join(t.TempDir(), "pid")
	cmd := exec.Command("/bin/sh", "-c",
		`"$1" -test.run=^TestDetachedOutputProcess$ -- --hold-output "$2" &
while [ ! -s "$2" ]; do sleep 0.01; done`, "test-parent", os.Args[0], pidFile)
	pipe := Pipe(*cmd)
	t.Cleanup(func() { pipe.Stop() })
	pipe.Run()
	pid := waitForPIDFile(t, pidFile)
	t.Cleanup(func() { syscall.Kill(pid, syscall.SIGKILL) })
	select {
	case <-pipe.done:
	case <-time.After(3 * time.Second):
		t.Fatal("an escaped child blocked process cleanup")
	}
	if pipe.IsRunning() || pipe.cmd.ProcessState == nil {
		t.Fatal("the parent was not reaped")
	}
}

func TestDetachedOutputProcess(t *testing.T) {
	if len(os.Args) < 3 || os.Args[len(os.Args)-2] != "--hold-output" {
		return
	}
	if _, err := syscall.Setsid(); err != nil {
		os.Exit(1)
	}
	if err := os.WriteFile(os.Args[len(os.Args)-1], []byte(strconv.Itoa(os.Getpid())), 0600); err != nil {
		os.Exit(1)
	}
	time.Sleep(30 * time.Second)
}

func TestOpenSSHTunnelReadiness(t *testing.T) {
	executable, err := exec.LookPath("ssh")
	if err != nil {
		t.Skip("OpenSSH is not installed")
	}
	_, key, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := ssh.NewSignerFromKey(key)
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		name                        string
		occupied, jump, unavailable bool
	}{
		{name: "direct"},
		{name: "occupied port", occupied: true},
		{name: "jump host", jump: true},
		{name: "jump host with occupied port", jump: true, occupied: true},
		{name: "jump host with unavailable target", jump: true, unavailable: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			server, err := net.Listen("tcp4", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer server.Close()
			serverDone := make(chan struct{})
			go func() {
				defer close(serverDone)
				raw, err := server.Accept()
				if err != nil {
					return
				}
				defer raw.Close()
				config := &ssh.ServerConfig{NoClientAuth: true}
				config.AddHostKey(signer)
				conn, channels, requests, err := ssh.NewServerConn(raw, config)
				if err != nil {
					return
				}
				defer conn.Close()
				go ssh.DiscardRequests(requests)
				for incoming := range channels {
					channel, requests, err := incoming.Accept()
					if err != nil {
						continue
					}
					go func() {
						defer channel.Close()
						for request := range requests {
							request.Reply(request.Type == "exec", nil)
							if request.Type == "exec" {
								var payload struct{ Command string }
								if ssh.Unmarshal(request.Payload, &payload) == nil {
									// Emulate only the target's acknowledgement, without executing commands.
									echo := strings.SplitN(payload.Command, ";", 2)[0]
									if strings.HasPrefix(echo, "echo kawaiissh-ready-") {
										fmt.Fprintln(channel, strings.TrimPrefix(echo, "echo "))
									}
								}
							}
						}
					}()
				}
			}()
			var proxyArguments []string
			if test.jump {
				jump, err := net.Listen("tcp4", "127.0.0.1:0")
				if err != nil {
					t.Fatal(err)
				}
				defer jump.Close()
				go func() {
					raw, err := jump.Accept()
					if err != nil {
						return
					}
					defer raw.Close()
					config := &ssh.ServerConfig{NoClientAuth: true}
					config.AddHostKey(signer)
					conn, channels, requests, err := ssh.NewServerConn(raw, config)
					if err != nil {
						return
					}
					defer conn.Close()
					go ssh.DiscardRequests(requests)
					for incoming := range channels {
						channel, requests, err := incoming.Accept()
						if err != nil {
							continue
						}
						go ssh.DiscardRequests(requests)
						go func() {
							defer channel.Close()
							if test.unavailable {
								io.Copy(io.Discard, channel)
								return
							}
							target, err := net.DialTimeout("tcp", server.Addr().String(), time.Second)
							if err != nil {
								return
							}
							defer target.Close()
							go func() { io.Copy(target, channel); target.Close() }()
							io.Copy(channel, target)
						}()
					}
				}()
				proxy := fmt.Sprintf("%s -F /dev/null -v -T -o BatchMode=yes -o StrictHostKeyChecking=no "+
					"-o UserKnownHostsFile=/dev/null -o GlobalKnownHostsFile=/dev/null -W unused.invalid:22 -p %d tester@127.0.0.1",
					executable, jump.Addr().(*net.TCPAddr).Port)
				proxyArguments = []string{"-o", "ProxyCommand=" + proxy}
			}
			reservation, err := net.Listen("tcp4", "127.0.0.1:0")
			if err != nil {
				t.Fatal(err)
			}
			defer reservation.Close()
			localAddress := reservation.Addr().String()
			if !test.occupied {
				reservation.Close()
			}
			args := []string{"-c", `exec "$@" "echo $KAWAII_SSH_READY; sleep 30"`, "test-ssh",
				executable, "-F", "/dev/null", "-v", "-T",
				"-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=no",
				"-o", "UserKnownHostsFile=/dev/null", "-o", "GlobalKnownHostsFile=/dev/null",
				"-o", "ExitOnForwardFailure=yes", "-L", localAddress + ":127.0.0.1:22"}
			args = append(args, proxyArguments...)
			args = append(args, "-p", strconv.Itoa(server.Addr().(*net.TCPAddr).Port), "tester@127.0.0.1")
			cmd := exec.Command("/bin/sh", args...)
			tunnel := &SSHPipeResult{PipeResult: Pipe(*cmd)}
			t.Cleanup(func() { tunnel.PipeResult.Stop() })
			tunnel.PipeResult.Run()
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			err = tunnel.WaitForConnection(ctx)
			wantReady := !test.occupied && !test.unavailable
			if (err == nil) != wantReady || tunnel.IsConnected() != wantReady {
				t.Fatalf("incorrect readiness: wantReady=%v, err=%v, output=%v", wantReady, err, tunnel.PipeResult.GetMessages())
			}
			if test.unavailable && !strings.Contains(strings.Join(tunnel.PipeResult.GetMessages(), "\n"), "Entering interactive session.") {
				t.Fatal("the jump process did not emit the misleading readiness message")
			}
			tunnel.PipeResult.Stop()
			server.Close()
			select {
			case <-serverDone:
			case <-time.After(3 * time.Second):
				t.Fatal("the SSH connection was not closed")
			}
		})
	}
}

package utils

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"
)

func fakeSSH(t *testing.T) (keyPath, directory string) {
	t.Helper()
	directory = t.TempDir()
	script := `#!/bin/sh
printf '%s\n' "$@" > "$KAWAII_SSH_TEST_DIRECTORY/args"
case "$KAWAII_SSH_TEST_MODE" in
    failure) echo 'Permission denied (publickey).' >&2; exit 255 ;;
    timeout) echo $$ > "$KAWAII_SSH_TEST_DIRECTORY/pid"; exec /bin/sleep 30 ;;
esac
`
	if err := os.WriteFile(filepath.Join(directory, "ssh"), []byte(script), 0700); err != nil {
		t.Fatal(err)
	}
	keyPath = filepath.Join(directory, "test key")
	if err := os.WriteFile(keyPath, []byte("test fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("PATH", directory+string(os.PathListSeparator)+os.Getenv("PATH"))
	t.Setenv("KAWAII_SSH_TEST_DIRECTORY", directory)
	t.Setenv("KAWAII_SSH_TEST_MODE", "success")
	return keyPath, directory
}

func TestSSHConnectionUsesExplicitCredentialsWithoutShellExpansion(t *testing.T) {
	keyPath, directory := fakeSSH(t)
	marker := filepath.Join(directory, "unexpected")
	host := "example.invalid; touch " + marker
	home, err := os.UserHomeDir()
	if err != nil {
		t.Fatal(err)
	}
	relativeKey, err := filepath.Rel(home, keyPath)
	if err != nil {
		t.Fatal(err)
	}
	if err := TestSSHConnection(context.Background(), "tester", host, "~/"+relativeKey); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(directory, "args"))
	if err != nil {
		t.Fatal(err)
	}
	args := strings.Split(strings.TrimSpace(string(data)), "\n")
	wantEnd := []string{"-l", "tester", "-i", keyPath, "--", host, "true"}
	if len(args) < len(wantEnd) || !slices.Equal(args[len(args)-len(wantEnd):], wantEnd) {
		t.Fatalf("credentials were not passed as separate arguments: %v", args)
	}
	for _, option := range []string{"BatchMode=yes", "IdentitiesOnly=yes", "ClearAllForwardings=yes", "ControlPath=none", "ControlMaster=no", "ForkAfterAuthentication=no"} {
		if !slices.Contains(args, option) {
			t.Errorf("the test must set %s", option)
		}
	}
	if _, err := os.Stat(marker); !os.IsNotExist(err) {
		t.Fatal("the host value was interpreted as a shell command")
	}
}

func TestSSHConnectionReportsAuthenticationFailure(t *testing.T) {
	keyPath, _ := fakeSSH(t)
	t.Setenv("KAWAII_SSH_TEST_MODE", "failure")
	err := TestSSHConnection(context.Background(), "tester", "example.invalid", keyPath)
	if err == nil || !strings.Contains(err.Error(), "Permission denied (publickey).") {
		t.Fatalf("expected the SSH diagnostic, got %v", err)
	}
}

func TestSSHConnectionRejectsMissingFieldsAndInvalidKeys(t *testing.T) {
	keyPath, directory := fakeSSH(t)
	for _, test := range []struct{ username, host, key string }{
		{"", "example.invalid", keyPath},
		{"tester", " ", keyPath},
		{"tester", "example.invalid", ""},
		{"tester", "example.invalid", filepath.Join(directory, "missing")},
		{"tester", "example.invalid", directory},
	} {
		if err := TestSSHConnection(context.Background(), test.username, test.host, test.key); err == nil {
			t.Errorf("invalid input succeeded: %+v", test)
		}
	}
	if _, err := os.Stat(filepath.Join(directory, "args")); !os.IsNotExist(err) {
		t.Fatal("invalid input started an SSH process")
	}
}

func TestSSHConnectionTimeoutReapsProcess(t *testing.T) {
	keyPath, directory := fakeSSH(t)
	t.Setenv("KAWAII_SSH_TEST_MODE", "timeout")
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	started := time.Now()
	err := TestSSHConnection(ctx, "tester", "example.invalid", keyPath)
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected a timeout, got %v", err)
	}
	if time.Since(started) > 3*time.Second {
		t.Fatal("the test did not stop promptly after its deadline")
	}
	data, err := os.ReadFile(filepath.Join(directory, "pid"))
	if err != nil {
		t.Fatal(err)
	}
	pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil {
		t.Fatal(err)
	}
	if err := syscall.Kill(pid, 0); !errors.Is(err, syscall.ESRCH) {
		t.Fatalf("SSH process %d still exists after the timeout: %v", pid, err)
	}
}

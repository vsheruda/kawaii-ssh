package utils

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

func TestSSHConnection(ctx context.Context, username, host, keyPath string) error {
	username = strings.TrimSpace(username)
	host = strings.TrimSpace(host)
	keyPath = strings.TrimSpace(keyPath)
	if username == "" || host == "" || keyPath == "" {
		return errors.New("Enter a host, username, and key path.")
	}

	if strings.HasPrefix(keyPath, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return fmt.Errorf("The home directory could not be found: %w", err)
		}
		keyPath = filepath.Join(home, keyPath[2:])
	}
	key, err := os.Stat(keyPath)
	if err != nil {
		return fmt.Errorf("The key file could not be opened: %w", err)
	}
	if !key.Mode().IsRegular() {
		return errors.New("The key path must point to a file.")
	}

	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, SSHExecutable,
		"-T",
		"-o", "BatchMode=yes",
		"-o", "IdentitiesOnly=yes",
		"-o", "StrictHostKeyChecking=no",
		"-o", "ConnectTimeout=10",
		"-o", "ClearAllForwardings=yes",
		"-o", "ControlPath=none",
		"-o", "ControlMaster=no",
		"-o", "ForkAfterAuthentication=no",
		"-l", username, "-i", keyPath, "--", host, "true",
	)
	cmd.WaitDelay = time.Second
	output, err := cmd.CombinedOutput()
	if errors.Is(ctx.Err(), context.DeadlineExceeded) {
		return fmt.Errorf("The SSH connection test timed out: %w", ctx.Err())
	}
	if ctx.Err() != nil {
		return ctx.Err()
	}
	if err != nil {
		if message := strings.TrimSpace(string(output)); message != "" {
			return errors.New(message)
		}
		return fmt.Errorf("The SSH connection test failed: %w", err)
	}
	return nil
}

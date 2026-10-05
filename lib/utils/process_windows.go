package utils

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"strconv"
	"time"
)

func prepareProcessGroup(cmd *exec.Cmd) {}

func stopProcessGroup(cmd *exec.Cmd) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	if err := exec.CommandContext(ctx, "taskkill", "/T", "/F", "/PID", strconv.Itoa(cmd.Process.Pid)).Run(); err == nil {
		return nil
	}
	err := cmd.Process.Kill()
	if errors.Is(err, os.ErrProcessDone) {
		return nil
	}
	return err
}

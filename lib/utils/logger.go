package utils

import (
	"github.com/wailsapp/wails/v2/pkg/logger"
	"os"
	"path/filepath"
)

const LogFilename = ".kawaiissh_log.txt"

type CombinedLogger struct {
	loggers []logger.Logger
}

func (l CombinedLogger) Print(message string) {
	for _, it := range l.loggers {
		it.Print(message)
	}
}

func (l CombinedLogger) Trace(message string) {
	for _, it := range l.loggers {
		it.Trace(message)
	}
}

func (l CombinedLogger) Debug(message string) {
	for _, it := range l.loggers {
		it.Debug(message)
	}
}

func (l CombinedLogger) Info(message string) {
	for _, it := range l.loggers {
		it.Info(message)
	}
}

func (l CombinedLogger) Warning(message string) {
	for _, it := range l.loggers {
		it.Warning(message)
	}
}

func (l CombinedLogger) Error(message string) {
	for _, it := range l.loggers {
		it.Error(message)
	}
}

func (l CombinedLogger) Fatal(message string) {
	for _, it := range l.loggers {
		it.Fatal(message)
	}
}

func GetLogger() logger.Logger {
	homeDir, err := os.UserHomeDir()

	if err != nil {
		return nil
	}

	logFilePath := filepath.Join(homeDir, LogFilename)

	return &CombinedLogger{
		[]logger.Logger{
			logger.NewFileLogger(logFilePath),
			logger.NewDefaultLogger(),
		},
	}
}

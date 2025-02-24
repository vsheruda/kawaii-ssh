package main

import (
	"KawaiiSSH/lib/utils"
	"embed"
	"fmt"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/logger"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

var Version = "0.8.1"

func main() {
	// Create an instance of the app structure
	app := NewApp()

	log := utils.GetLogger()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "KawaiiSSH",
		Width:  864,
		Height: 480,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Mac: &mac.Options{
			About: &mac.AboutInfo{
				Title: "KawaiiSSH",
				Message: fmt.Sprintf(
					"A subjectively good take on a ssh GUI for simple tunneling.\n Version: %s",
					Version,
				),
				Icon: icon,
			},
		},
		LogLevel:           logger.INFO,
		LogLevelProduction: logger.INFO,
		Logger:             log,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

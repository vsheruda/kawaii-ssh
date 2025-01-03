package main

import (
	"KawaiiSSH/lib/utils"
	"embed"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte

func main() {
	// Create an instance of the app structure
	app := NewApp()

	log := utils.GetLogger()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "KawaiiSSH",
		Width:  854,
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
				Title:   "KawaiiSSH",
				Message: "A subjectively good take on a ssh GUI for simple tunneling.",
				Icon:    icon,
			},
		},
		Logger: log,
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

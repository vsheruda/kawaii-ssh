package models

import (
	"encoding/json"
	"github.com/google/uuid"
	"io"
	"os"
	"path/filepath"
)

const ProfileFilename = ".kawaiissh_profile.json"

type SSHConfiguration struct {
	Name     string `json:"name"`
	Host     string `json:"host"`
	Username string `json:"username"`
	KeyPath  string `json:"key_path"`
}

type Tunnel struct {
	ID                   string `json:"id"`
	SSHConfigurationName string `json:"ssh_configuration_name"`
	LocalPort            string `json:"local_port"`
	RemotePort           string `json:"remote_port"`
	RemoteDestination    string `json:"remote_destination"`
}

type ViewSettings struct {
	Grouped bool `json:"grouped"`
	Compact bool `json:"compact"`
}

type Application struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	TunnelIDs []string `json:"tunnel_ids"`
}

type Profile struct {
	SSHConfigurations []SSHConfiguration `json:"ssh_configurations"`
	Tunnels           []Tunnel           `json:"tunnels"`
	ViewSettings      ViewSettings       `json:"view_settings"`
	Applications      []Application      `json:"applications"`
}

func saveProfile(path string, profile *Profile) error {
	file, err := os.Create(path)

	if err != nil {
		return err
	}

	jsonData, err := json.MarshalIndent(profile, "", "    ")

	if err != nil {
		return err
	}

	defer file.Close()

	_, err = file.Write(jsonData)

	if err != nil {
		return err
	}

	return nil
}

func verifyProfileExists(path string) error {
	_, err := os.Stat(path)

	if os.IsNotExist(err) {
		emptyProfile := Profile{
			Tunnels:           make([]Tunnel, 0),
			SSHConfigurations: make([]SSHConfiguration, 0),
			ViewSettings:      ViewSettings{Grouped: false, Compact: false},
		}

		return saveProfile(path, &emptyProfile)
	} else if err != nil {
		return err
	}

	return nil
}

func verifyProfileIntegrity(path string, profile *Profile) error {
	hasChanged := false

	for i := range profile.Tunnels {
		if profile.Tunnels[i].ID == "" {
			profile.Tunnels[i].ID = uuid.New().String()

			hasChanged = true
		}
	}

	if hasChanged {
		return saveProfile(path, profile)
	}

	return nil
}

func SyncProfile(profile *Profile) error {
	homeDir, err := os.UserHomeDir()

	if err != nil {
		return err
	}

	profilePath := filepath.Join(homeDir, ProfileFilename)

	return saveProfile(profilePath, profile)
}

func LoadProfile() (*Profile, error) {
	homeDir, err := os.UserHomeDir()

	if err != nil {
		return nil, err
	}

	profilePath := filepath.Join(homeDir, ProfileFilename)

	err = verifyProfileExists(profilePath)

	if err != nil {
		return nil, err
	}

	file, err := os.Open(profilePath)

	if err != nil {
		return nil, err
	}
	defer file.Close()

	data, err := io.ReadAll(file)

	if err != nil {
		return nil, err
	}

	var profile Profile

	if err = json.Unmarshal(data, &profile); err != nil {
		return nil, err
	}

	err = verifyProfileIntegrity(profilePath, &profile)

	if err != nil {
		return nil, err
	}

	return &profile, nil
}

package models

type ConnectPayload struct {
	Host              string
	Username          string
	KeyPath           string
	LocalPort         string
	RemotePort        string
	RemoteDestination string
}

type ConnectResponse struct {
	ID              string   `json:"id"`
	Messages        []string `json:"messages"`
	ResponseMessage string   `json:"responseMessage"`
	ResponseCode    int16    `json:"responseCode"`
}

type ProfileResponse struct {
	ResponseCode int16   `json:"responseCode" required:"true"`
	Profile      Profile `json:"profile"`
}

type OpenTunnel struct {
	PID               string `json:"pid"`
	Username          string `json:"username"`
	Host              string `json:"host"`
	KeyPath           string `json:"keyPath"`
	LocalPort         string `json:"localPort"`
	RemotePort        string `json:"remotePort"`
	RemoteDestination string `json:"remoteDestination"`
}

type SystemHealthResponse struct {
	ResponseCode int16        `json:"responseCode" required:"true"`
	OpenTunnels  []OpenTunnel `json:"openTunnels"`
}

type ConnectionStateResponse struct {
	ID          string   `json:"id"`
	Messages    []string `json:"messages"`
	IsConnected bool     `json:"is_connected"`
}

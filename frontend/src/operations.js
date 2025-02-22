import {
    Connect,
    Disconnect,
    GetSystemHealth,
    TerminateProcesses,
} from '../wailsjs/go/main/App.js';
import { ConnectionStatus } from './const.js';

function connect(tunnel) {
    console.log('Connecting to ', tunnel.remote_destination);

    const payload = {
        Username: tunnel.ssh_configuration.username,
        Host: tunnel.ssh_configuration.host,
        KeyPath: tunnel.ssh_configuration.key_path,
        LocalPort: tunnel.local_port,
        RemoteDestination: tunnel.remote_destination,
        RemotePort: tunnel.remote_port,
    };

    return Connect(payload)
        .then((response) => {
            if (response.responseCode >= 400) {
                return Promise.reject(response);
            }

            return {
                hash: response.id,
                status: ConnectionStatus.CONNECTED,
                stdout: response.messages,
            };
        })
        .catch((response) => {
            console.error(response);

            return Promise.reject();
        });
}

function disconnect(tunnel) {
    console.log('Disconnecting from ', tunnel.remote_destination);

    return Disconnect(tunnel.connection.hash)
        .then((response) => {
            if (response.responseCode >= 400) {
                return Promise.reject(response);
            }

            return {
                hash: response.id,
                status: ConnectionStatus.DISCONNECTED,
                stdout: response.messages,
            };
        })
        .catch((response) => {
            console.error(response);

            return Promise.reject();
        });
}

function getSystemHealth() {
    return GetSystemHealth()
        .then((response) => {
            if (response.responseCode >= 400) {
                return Promise.reject(response);
            }

            return response.openTunnels;
        })
        .catch((response) => {
            console.error(response);

            return Promise.reject(response);
        });
}

function terminateProcesses(pids) {
    return TerminateProcesses(pids)
        .then((response) => {
            if (response.responseCode >= 400) {
                return Promise.reject(response);
            }
        })
        .catch((response) => {
            console.error(response);

            return Promise.reject(response);
        });
}

export { connect, disconnect, getSystemHealth, terminateProcesses };

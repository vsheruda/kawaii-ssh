import { ConnectionStatus } from './const.js';
import app from './App.jsx';

const isSameTunnel = (t1) => (t2) => {
    return t1.id === t2.id;
};

const isSameSSHConfig = (c1) => (c2) => {
    return (
        c1.name === c2.name &&
        c1.host === c2.host &&
        c1.username === c2.username &&
        c1.key_path === c2.key_path
    );
};

const handleViewSettingsChange =
    (setProfile) =>
    ({ grouped, compact }) => {
        setProfile((prevState) => ({
            ...prevState,
            view_settings: { grouped, compact },
        }));
    };

const handleConnectionsStateChange =
    (connections, setConnections) => (openConnections) => {
        // Reset connection status
        for (const key in connections) {
            connections[key].status = ConnectionStatus.DISCONNECTED;
        }

        // Set newly fetched connection status
        for (const connection of openConnections) {
            const tunnel = Object.values(connections).find(
                (it) => it.hash === connection.id
            );

            if (!tunnel) {
                continue;
            }

            console.log('Updating connection: ', tunnel, ' with:', connection);

            tunnel.status = connection.is_connected
                ? ConnectionStatus.CONNECTED
                : ConnectionStatus.DISCONNECTED;
            tunnel.stdout = connection.messages;
        }

        console.log('New connection state: ', connections);

        setConnections((prevState) => ({ ...prevState, ...connections }));
    };

const handleConnectionStateChange = (tunnel, setConnections) => (newState) => {
    setConnections((prevState) => ({ ...prevState, [tunnel.id]: newState }));
};

const handleTunnelStateChange =
    (profile, setProfile) =>
    (tunnel, { newState = null, isNew = false }) => {
        const currentState = isNew
            ? {}
            : profile.tunnels.find(isSameTunnel(tunnel));

        if (newState) {
            currentState.id = currentState.id || newState.id; // They are expected to be the same
            currentState.local_port = newState.local_port;
            currentState.remote_destination = newState.remote_destination;
            currentState.remote_port = newState.remote_port;
            currentState.ssh_configuration_name =
                newState.ssh_configuration_name;
        }

        if (isNew) {
            profile.tunnels.push(currentState);
        }

        setProfile((prevState) => ({ ...prevState, tunnels: profile.tunnels }));
    };

const handleSSHConfigurationStateChange =
    (profile, setProfile) =>
    (sshConfiguration, { name, username, host, key_path }, isNew = false) => {
        const currentState = isNew
            ? {}
            : profile.ssh_configurations.find(
                  isSameSSHConfig(sshConfiguration)
              );

        console.log(
            'Updating SSH configuration: ',
            currentState,
            ` to: name=${name} username=${username} host=${host} key_path=${key_path}`
        );

        currentState.name = name;
        currentState.username = username;
        currentState.host = host;
        currentState.key_path = key_path;

        if (isNew) {
            profile.ssh_configurations.push(currentState);
        }

        setProfile((prevState) => ({
            ...prevState,
            ssh_configurations: profile.ssh_configurations,
        }));
    };

const handleApplicationConfigurationStateChange =
    (profile, setProfile) =>
    (application, { name, tunnelIds }, isNew = false) => {
        const currentState = isNew
            ? { id: application.id }
            : profile.applications.find((it) => it.id === application.id);

        console.log(
            'Updating Applications configuration: ',
            currentState,
            ` to: name=${name} tunnel_ids=${tunnelIds}`
        );

        currentState.name = name;
        currentState.tunnel_ids = tunnelIds;

        if (isNew) {
            profile.applications.push(currentState);
        }

        setProfile((prevState) => ({
            ...prevState,
            applications: profile.applications,
        }));
    };

const getValueOrSubstr = (value, limit, suffix = '...') => {
    if (value.length <= limit) {
        return value;
    }

    return value.substring(0, limit) + suffix;
};

export {
    handleTunnelStateChange,
    handleSSHConfigurationStateChange,
    handleConnectionsStateChange,
    handleConnectionStateChange,
    handleViewSettingsChange,
    handleApplicationConfigurationStateChange,
    isSameTunnel,
    isSameSSHConfig,
    getValueOrSubstr,
};

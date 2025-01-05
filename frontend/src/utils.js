import { ConnectionStatus } from "./const.js";

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

const handleConnectionsStateChange = (profile, setProfile) => (connections) => {
    for (const connection of connections) {
        const tunnel = profile.tunnels.find(
            (it) => it.connection?.hash === connection.id
        );

        if (!tunnel) {
            continue;
        }

        tunnel.connection.status = connection.is_connected ? ConnectionStatus.CONNECTED : ConnectionStatus.DISCONNECTED;
        tunnel.connection.stdout = connection.messages;
    }

    setProfile((prevState) => ({ ...prevState, tunnels: profile.tunnels }));
};

const handleTunnelStateChange =
    (profile, setProfile) =>
    (tunnel, { newState = null, connectionState = null, isNew = false }) => {
        const currentState = isNew
            ? {}
            : profile.tunnels.find(isSameTunnel(tunnel));

        if (connectionState) {
            currentState.connection = connectionState;
        }

        if (newState) {
            currentState.id = currentState.id || newState.id; // They are expected to be the same
            currentState.local_port = newState.local_port;
            currentState.remote_destination = newState.remote_destination;
            currentState.remote_port = newState.remote_port;
            currentState.ssh_configuration_name =
                newState.ssh_configuration_name;
        }

        console.log(
            `Tunnel ${currentState.local_port}:${currentState.remote_destination} changed state to`,
            currentState.connection?.status,
            currentState
        );

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

const getFlatTunnels = (profile) => {
    return profile.tunnels.map((tunnel) => ({
        ...tunnel,
        ssh_configuration: profile.ssh_configurations.find(
            (it) => it.name === tunnel.ssh_configuration_name
        ),
    }));
};

export {
    handleTunnelStateChange,
    handleSSHConfigurationStateChange,
    handleConnectionsStateChange,
    getFlatTunnels,
    isSameTunnel,
    isSameSSHConfig,
};

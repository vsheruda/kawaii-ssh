import React, { useEffect, useRef, useState } from 'react';
import './ConnectionDetails.css';
import TerminalStdout from '../../components/TerminalStdout/TerminalStdout.jsx';
import { ConnectionStatus } from '../../const.js';
import { useLocation, useNavigate } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';
import {
    getFlatTunnels,
    handleTunnelStateChange,
    isSameTunnel,
} from '../../utils.js';
import { connect, disconnect } from '../../operations.js';

function ConnectionDetails() {
    const location = useLocation();
    const { setProfile, profile } = useProfile();
    const navigate = useNavigate();

    const onTunnelStateChange = handleTunnelStateChange(profile, setProfile);

    let tunnel = getFlatTunnels(profile).find(
        isSameTunnel(location.state.tunnel)
    );

    if (!tunnel) {
        tunnel = location.state.tunnel;
    }

    const [hasChanged, setHasChanged] = useState(false);
    const [host, setHost] = useState(tunnel.ssh_configuration_name);
    const [localPort, setLocalPort] = useState(tunnel.local_port);
    const [remotePort, setRemotePort] = useState(tunnel.remote_port);
    const [remoteDestination, setRemoteDestination] = useState(
        tunnel.remote_destination
    );
    const [isLoading, setIsLoading] = useState(false);
    const terminalContainerRef = useRef(null);

    useEffect(() => {
        const hasDifferentValue =
            location.state.tunnel.ssh_configuration_name !== host ||
            location.state.tunnel.local_port !== localPort ||
            location.state.tunnel.remote_port !== remotePort ||
            location.state.tunnel.remote_destination !== remoteDestination;

        setHasChanged(hasDifferentValue);
    }, [host, localPort, remotePort, remoteDestination]);

    const onSaveClick = () => {
        onTunnelStateChange(tunnel, {
            isNew: location.state.isNew,
            newState: {
                id: tunnel.id,
                local_port: localPort,
                remote_destination: remoteDestination,
                remote_port: remotePort,
                ssh_configuration_name: host,
            },
        });

        // Overwrite navigation state to fix hasChanged behavior.
        location.state.tunnel = getFlatTunnels(profile).find(
            isSameTunnel(location.state.tunnel)
        );
        // Reset is new to enable connection
        location.state.isNew = false;
        setHasChanged(false);
    };

    const onDeleteClick = () => {
        setProfile((prevState) => ({
            ...prevState,
            tunnels: prevState.tunnels.filter(
                (it) => !isSameTunnel(tunnel)(it)
            ),
        }));

        navigate('/connection-list');
    };

    const onConnectClick = () => {
        setIsLoading(true);

        connect(tunnel)
            .then((connectionState) =>
                onTunnelStateChange(tunnel, { connectionState })
            )
            .finally(() => setIsLoading(false));
    };

    const onDisconnectClick = () => {
        setIsLoading(true);

        disconnect(tunnel)
            .then((connectionState) =>
                onTunnelStateChange(tunnel, { connectionState })
            )
            .finally(() => setIsLoading(false));
    };

    const getActionButton = () => {
        if (isLoading) {
            return <button className="btn">Loading...</button>;
        }

        if (tunnel?.connection?.status === ConnectionStatus.CONNECTED) {
            return (
                <button className="btn" onClick={onDisconnectClick}>
                    Disconnect
                </button>
            );
        }

        return (
            <button
                disabled={hasChanged || location.state.isNew}
                className="btn"
                onClick={onConnectClick}
            >
                Connect
            </button>
        );
    };

    useEffect(() => {
        terminalContainerRef.current.scrollTop =
            terminalContainerRef.current.scrollHeight;
    }, [tunnel.connection, isLoading]);

    return (
        <div className={'connection-details-container'}>
            <div className={'connection-details'}>
                <div className={'connection-settings'}>
                    <div className={'input-row'}>
                        <label htmlFor={'host'}>Host Config</label>
                        <select
                            id={'host'}
                            value={host}
                            disabled={
                                tunnel.connection?.status ===
                                ConnectionStatus.CONNECTED
                            }
                            onChange={({ target: { value } }) => setHost(value)}
                        >
                            <option key={'-'} value="---" name="---">
                                ---
                            </option>
                            {profile?.ssh_configurations?.map((it) => (
                                <option key={it.name} value={it.name}>
                                    {it.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className={'input-row'}>
                        <label htmlFor={'local-port'}>Tunnel</label>
                        <input
                            id={'local-port'}
                            disabled={
                                tunnel.connection?.status ===
                                ConnectionStatus.CONNECTED
                            }
                            onChange={({ target: { value } }) =>
                                setLocalPort(value)
                            }
                            autoComplete="off"
                            name="local-port"
                            type="text"
                            placeholder={'Local Port'}
                            value={localPort}
                            max={5}
                        />
                        <input
                            id={'remote-destination'}
                            disabled={
                                tunnel.connection?.status ===
                                ConnectionStatus.CONNECTED
                            }
                            onChange={({ target: { value } }) =>
                                setRemoteDestination(value)
                            }
                            autoComplete="off"
                            name="remote-destination"
                            type="text"
                            placeholder={'Remote Destination'}
                            value={remoteDestination}
                        />
                        <input
                            id={'remote-port'}
                            disabled={
                                tunnel.connection?.status ===
                                ConnectionStatus.CONNECTED
                            }
                            onChange={({ target: { value } }) =>
                                setRemotePort(value)
                            }
                            autoComplete="off"
                            name="remote-port"
                            type="text"
                            placeholder={'Remote Port'}
                            value={remotePort}
                            max={5}
                        />
                    </div>
                    <div className={'control-panel'}>
                        <button
                            disabled={!hasChanged}
                            onClick={onSaveClick}
                            className="btn"
                        >
                            Save
                        </button>
                        <button
                            disabled={
                                tunnel.connection?.status ===
                                    ConnectionStatus.CONNECTED || isLoading
                            }
                            onClick={onDeleteClick}
                            className="btn"
                        >
                            Delete
                        </button>
                        {getActionButton()}
                        <div
                            className={`status-circle ${tunnel.connection?.status}`}
                        ></div>
                    </div>
                </div>
                <TerminalStdout
                    messages={tunnel.connection?.stdout}
                    isLoading={isLoading}
                    connectionState={tunnel.connection?.status}
                    scrollRef={terminalContainerRef}
                />
            </div>
        </div>
    );
}

export default ConnectionDetails;

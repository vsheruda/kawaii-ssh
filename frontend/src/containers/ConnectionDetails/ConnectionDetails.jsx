import React, { useEffect, useRef, useState } from 'react';
import './ConnectionDetails.css';
import TerminalStdout from '../../components/TerminalStdout/TerminalStdout.jsx';
import { ConnectionStatus, isConnectionActive } from '../../const.js';
import { useLocation, useNavigate } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';
import {
    handleConnectionStateChange,
    handleTunnelStateChange,
    isSameTunnel,
} from '../../utils.js';
import { connect, disconnect } from '../../operations.js';
import DeleteButton from '../../components/DeleteButton/DeleteButton.jsx';
import Dialog from '../../components/Dialog/Dialog.jsx';

function ConnectionDetails() {
    const location = useLocation();
    const { setProfile, profile, setConnections } = useProfile();
    const navigate = useNavigate();

    const onTunnelStateChange = handleTunnelStateChange(profile, setProfile);

    const tunnel =
        profile.tunnels.find(isSameTunnel(location.state.tunnel)) ||
        location.state.tunnel;

    const onConnectionStateChange = handleConnectionStateChange(
        tunnel,
        setConnections
    );

    const [hasChanged, setHasChanged] = useState(false);
    const [host, setHost] = useState(tunnel.ssh_configuration_name);
    const [localPort, setLocalPort] = useState(tunnel.local_port);
    const [remotePort, setRemotePort] = useState(tunnel.remote_port);
    const [remoteDestination, setRemoteDestination] = useState(
        tunnel.remote_destination
    );
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const isActive = isConnectionActive(tunnel.connection);
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
        if (isActive || isLoading) return;
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
        location.state.tunnel = profile.tunnels.find(
            isSameTunnel(location.state.tunnel)
        );
        // Reset is new to enable connection
        location.state.isNew = false;
        setHasChanged(false);
    };

    const onDeleteClick = async () => {
        if (isActive || isLoading) return;
        setIsLoading(true);
        try {
            // Confirm cleanup even when the last status poll reported disconnected.
            onConnectionStateChange(await disconnect(tunnel));
            setProfile((prevState) => ({
                ...prevState,
                tunnels: prevState.tunnels.filter(
                    (it) => !isSameTunnel(tunnel)(it)
                ),
            }));
            navigate('/connection-list');
        } catch {
            setErrorMessage(
                'The connection could not be stopped. Try again before deleting it.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    const onConnectClick = () => {
        setIsLoading(true);

        connect(tunnel)
            .then((connectionState) => onConnectionStateChange(connectionState))
            .finally(() => setIsLoading(false));
    };

    const onDisconnectClick = () => {
        setIsLoading(true);

        disconnect(tunnel)
            .then((connectionState) => onConnectionStateChange(connectionState))
            .catch(() =>
                setErrorMessage(
                    'The connection could not be stopped. Please try again.'
                )
            )
            .finally(() => setIsLoading(false));
    };

    const getActionButton = () => {
        if (isLoading) {
            return <button className="btn">Loading...</button>;
        }

        if (isActive) {
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
                            disabled={isActive || isLoading}
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
                            disabled={isActive || isLoading}
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
                            disabled={isActive || isLoading}
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
                            disabled={isActive || isLoading}
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
                            disabled={!hasChanged || isActive || isLoading}
                            onClick={onSaveClick}
                            className="btn"
                        >
                            Save
                        </button>
                        <DeleteButton
                            itemType="connection"
                            itemName={`${tunnel.local_port} → ${tunnel.remote_destination}:${tunnel.remote_port}`}
                            disabled={isActive || isLoading}
                            onConfirm={onDeleteClick}
                        />
                        {getActionButton()}
                        <div
                            className={`status-circle ${tunnel.connection?.status}`}
                        ></div>
                        {tunnel.connection?.status ===
                            ConnectionStatus.RECONNECTING && (
                            <span role="status">Reconnecting…</span>
                        )}
                    </div>
                </div>
                <TerminalStdout
                    messages={tunnel.connection?.stdout}
                    isLoading={isLoading}
                    connectionState={tunnel.connection?.status}
                    scrollRef={terminalContainerRef}
                />
            </div>
            <Dialog
                open={!!errorMessage}
                title="Connection cleanup failed"
                message={errorMessage}
                onClose={() => setErrorMessage(null)}
            />
        </div>
    );
}

export default ConnectionDetails;

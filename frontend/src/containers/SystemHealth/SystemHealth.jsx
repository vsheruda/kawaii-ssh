import React, { useEffect, useState } from 'react';
import { getSystemHealth, terminateProcesses } from '../../operations.js';
import './SystemHealth.css';
import { useProfile } from '../../context/ProfileContext.jsx';
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';
import Dialog from '../../components/Dialog/Dialog.jsx';
import { ConnectionStatus } from '../../const.js';

function SystemHealth() {
    const [refresh, setRefresh] = useState(0);
    const [openTunnels, setOpenTunnels] = useState([]);
    const [isTerminating, setIsTerminating] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const { setConnections } = useProfile();

    useEffect(() => {
        getSystemHealth()
            .then(setOpenTunnels)
            .catch((error) => {
                setErrorMessage(
                    error?.message || 'Could not refresh the tunnel list.'
                );
            });
    }, [refresh]);

    const onTerminateAll = async () => {
        setIsTerminating(true);
        setErrorMessage(null);
        try {
            await terminateProcesses(openTunnels.map((tunnel) => tunnel.pid));
            setConnections((previous) =>
                Object.fromEntries(
                    Object.entries(previous).map(([id, connection]) => [
                        id,
                        {
                            ...connection,
                            status: ConnectionStatus.DISCONNECTED,
                        },
                    ])
                )
            );
        } catch (error) {
            setErrorMessage(error?.message || String(error));
        } finally {
            setRefresh((value) => value + 1);
            setIsTerminating(false);
        }
    };

    return (
        <div className={'system-health-container'}>
            <div className={'system-health'}>
                <SectionHeader title={'Open Tunnels'} displayTip={false} />
                <div className={'open-tunnels'}>
                    <div className={'control-panel'}>
                        <button
                            disabled={isTerminating}
                            onClick={() => setRefresh(refresh + 1)}
                        >
                            Refresh
                        </button>
                        <button
                            disabled={isTerminating}
                            onClick={onTerminateAll}
                        >
                            {isTerminating ? 'Terminating…' : 'Terminate All'}
                        </button>
                    </div>
                    <div className={'open-tunnels-list'}>
                        {openTunnels.map((tunnel) => (
                            <div
                                className={'open-tunnel-card'}
                                key={tunnel.pid}
                            >
                                <span className={'pid'}>{tunnel.pid}</span>
                                <span>
                                    {tunnel.username}@{tunnel.host}
                                </span>
                                <span>
                                    {tunnel.localPort}:
                                    {tunnel.remoteDestination}:
                                    {tunnel.remotePort}
                                </span>
                                <span>{tunnel.keyPath}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Dialog
                open={!!errorMessage}
                title="Tunnel cleanup failed"
                message={errorMessage}
                onClose={() => setErrorMessage(null)}
            />
        </div>
    );
}

export default SystemHealth;

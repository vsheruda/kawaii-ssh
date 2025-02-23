import React, { useEffect, useState } from 'react';
import { getSystemHealth, terminateProcesses } from '../../operations.js';
import './SystemHealth.css';
import { useProfile } from '../../context/ProfileContext.jsx';
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';

function SystemHealth() {
    const [refresh, setRefresh] = useState(0);
    const [openTunnels, setOpenTunnels] = useState([]);
    const { reloadProfile } = useProfile();

    useEffect(() => {
        getSystemHealth().then(setOpenTunnels);
    }, [refresh]);

    const onTerminateAll = () => {
        if (openTunnels.length === 0) return;

        terminateProcesses(openTunnels.map((tunnel) => tunnel.pid)).finally(
            () => {
                setRefresh(refresh + 1);
                reloadProfile();
            }
        );
    };

    return (
        <div className={'system-health-container'}>
            <div className={'system-health'}>
                <SectionHeader title={'Open Tunnels'} displayTip={false} />
                <div className={'open-tunnels'}>
                    <div className={'control-panel'}>
                        <button onClick={() => setRefresh(refresh + 1)}>
                            Refresh
                        </button>
                        <button
                            disabled={openTunnels.length === 0}
                            onClick={onTerminateAll}
                        >
                            Terminate All
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
        </div>
    );
}

export default SystemHealth;

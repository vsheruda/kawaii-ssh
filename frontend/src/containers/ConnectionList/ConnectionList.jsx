import React, { useState } from 'react';
import './ConnectionList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import ConnectionCard from '../../components/ConnectionCard/ConnectionCard.jsx';
import { handleConnectionStateChange } from '../../utils.js';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import { ConnectionStatus } from '../../const.js';

function ConnectionGroup({ title, tunnels, setConnections }) {
    return (
        <div className={'connection-group'}>
            <span className={'title'}>{title}</span>
            <div className={'group-cards'}>
                {tunnels.map((tunnel) => (
                    <ConnectionCard
                        key={tunnel.id}
                        tunnel={tunnel}
                        onChange={handleConnectionStateChange(tunnel, setConnections)}
                    />
                ))}
            </div>
        </div>
    );
}

function ConnectionList() {
    const { isLoading, profile, setConnections } = useProfile();
    const navigate = useNavigate();

    const [isGroupedView, setIsGroupedView] = useState(true);
    const [isCompactView, setIsCompactView] = useState(false);
    const [showConnectedOnly, setShowConnectedOnly] = useState(false);

    const getConnectionView = () => {
        if (isLoading) return [];

        let tunnels = profile.tunnels || [];

        if (showConnectedOnly) {
            tunnels = tunnels.filter(
                (it) => it.connection?.status === ConnectionStatus.CONNECTED
            );
        }

        if (isGroupedView) {
            return Object.entries(
                _.groupBy(tunnels, (it) => it.ssh_configuration_name)
            ).map(([hostName, tunnels]) => (
                <ConnectionGroup
                    key={hostName}
                    title={hostName}
                    tunnels={tunnels}
                    setConnections={setConnections}
                />
            ));
        }

        return tunnels.map((tunnel) => (
            <ConnectionCard
                key={tunnel.id}
                tunnel={tunnel}
                onChange={handleConnectionStateChange(tunnel, setConnections)}
            />
        ));
    };

    const onAddClick = () => {
        navigate('/connection-details', {
            state: {
                tunnel: {
                    id: uuid(),
                    local_port: '',
                    remote_port: '',
                    remote_destination: '',
                    ssh_configuration_name: '',
                },
                isNew: true,
            },
        });
    };

    return (
        <div className={'connection-list-container'}>
            <div
                className={
                    'connection-list' +
                    (isGroupedView ? ' grouped' : '') +
                    (isCompactView ? ' compact' : '')
                }
            >
                <div className={'connection-list-items'}>
                    {!isLoading && getConnectionView()}
                </div>
                <AddCardPlaceholder onClick={onAddClick} />
            </div>
        </div>
    );
}

export default ConnectionList;

import React, { useState } from 'react';
import './ConnectionList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import ConnectionCard from '../../components/ConnectionCard/ConnectionCard.jsx';
import {
    handleConnectionStateChange,
    handleViewSettingsChange,
} from '../../utils.js';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import { ConnectionStatus } from '../../const.js';
import { HiOutlineCollection } from 'react-icons/hi';
import { FaObjectUngroup, FaRegObjectGroup } from 'react-icons/fa';
import { PiPlugsConnectedFill } from 'react-icons/pi';
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';

function ConnectionGroup({ title, tunnels, setConnections }) {
    return (
        <div className={'connection-group'}>
            <span className={'title'}>{title}</span>
            <div className={'group-cards'}>
                {tunnels.map((tunnel) => (
                    <ConnectionCard
                        key={tunnel.id}
                        tunnel={tunnel}
                        onChange={handleConnectionStateChange(
                            tunnel,
                            setConnections
                        )}
                    />
                ))}
            </div>
        </div>
    );
}

function ConnectionControl({
    onViewSettingsChange,
    isGroupedView,
    isCompactView,
    showConnectedOnly,
    setShowConnectedOnly,
    displayControl,
}) {
    return (
        <div className={'connection-control'}>
            <div className={`left ${displayControl ? '' : ' full-width'}`}>
                <SectionHeader
                    title={'Tunnels'}
                    tipMessage={
                        'Create a new tunnel to connect to a remote server.'
                    }
                    displayTip={!displayControl}
                />
            </div>
            {displayControl ? (
                <div className={'right'}>
                    <div className={'section'}>
                        <span
                            className={
                                !isGroupedView && !isCompactView ? 'active' : ''
                            }
                            title={'List view'}
                            onClick={() => {
                                onViewSettingsChange({
                                    grouped: false,
                                    compact: false,
                                });
                            }}
                        >
                            <HiOutlineCollection />
                        </span>
                        <span
                            className={
                                isGroupedView && !isCompactView ? 'active' : ''
                            }
                            title={'Group view'}
                            onClick={() => {
                                onViewSettingsChange({
                                    grouped: true,
                                    compact: false,
                                });
                            }}
                        >
                            <FaRegObjectGroup />
                        </span>
                        <span
                            className={
                                isGroupedView && isCompactView ? 'active' : ''
                            }
                            title={'Compact group view'}
                            onClick={() => {
                                onViewSettingsChange({
                                    grouped: true,
                                    compact: true,
                                });
                            }}
                        >
                            <FaObjectUngroup />
                        </span>
                    </div>
                    <div className={'section'}>
                        <span
                            className={showConnectedOnly ? 'active' : ''}
                            title={'Show connected only'}
                            onClick={() => {
                                setShowConnectedOnly(!showConnectedOnly);
                            }}
                        >
                            <PiPlugsConnectedFill />
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ConnectionList() {
    const { isLoading, profile, setProfile, setConnections } = useProfile();
    const navigate = useNavigate();

    const isCompactView = profile?.view_settings?.compact;
    const isGroupedView = profile?.view_settings?.grouped;
    const [showConnectedOnly, setShowConnectedOnly] = useState(false);

    const onViewSettingsChange = handleViewSettingsChange(setProfile);

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
            <ConnectionControl
                onViewSettingsChange={onViewSettingsChange}
                setShowConnectedOnly={setShowConnectedOnly}
                showConnectedOnly={showConnectedOnly}
                isCompactView={isCompactView}
                isGroupedView={isGroupedView}
                displayControl={profile.tunnels.length > 0}
            />
            <div
                className={
                    'connection-list' +
                    (isGroupedView ? ' grouped' : '') +
                    (isCompactView ? ' compact' : '')
                }
            >
                <div className={'items'}>
                    {!isLoading && getConnectionView()}
                </div>
                <AddCardPlaceholder onClick={onAddClick} />
            </div>
        </div>
    );
}

export default ConnectionList;

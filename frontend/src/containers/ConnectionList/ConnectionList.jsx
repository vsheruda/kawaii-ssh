import React from 'react';
import './ConnectionList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import ConnectionCard from '../../components/ConnectionCard/ConnectionCard.jsx';
import { getFlatTunnels, handleTunnelStateChange } from '../../utils.js';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';
import { v4 as uuid } from 'uuid';

function ConnectionList() {
    const { isLoading, setProfile, profile } = useProfile();
    const navigate = useNavigate();

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
            <div className={'connection-list'}>
                {!isLoading &&
                    getFlatTunnels(profile)?.map((tunnel) => (
                        <ConnectionCard
                            key={tunnel.id}
                            tunnel={tunnel}
                            onChange={handleTunnelStateChange(
                                profile,
                                setProfile
                            )}
                        />
                    ))}
                <AddCardPlaceholder onClick={onAddClick} />
            </div>
        </div>
    );
}

export default ConnectionList;

import React, { useState } from 'react';
import './ConnectionCard.css';
import 'react-toggle/style.css';
import { ConnectionStatus } from '../../const.js';
import Toggle from 'react-toggle';
import { IoDesktopSharp, IoSettingsSharp } from 'react-icons/io5';
import { useNavigate } from 'react-router';
import { connect, disconnect } from '../../operations.js';

function ConnectionCard({ tunnel, onChange }) {
    const navigate = useNavigate();
    const [isEnabled, setIsEnabled] = useState(
        tunnel.connection?.status === ConnectionStatus.CONNECTED
    );
    const [isLoading, setIsLoading] = useState(false);

    const toDestination = (value, limit = 32) => {
        if (value.length <= limit) {
            return value;
        }

        return value.substring(0, limit) + '...';
    };

    const onEditClick = () => {
        navigate('/connection-details', { state: { tunnel } });
    };

    const onToggleChange = (e) => {
        setIsLoading(true);
        const newEnabledState = e.target.checked;

        setIsEnabled(newEnabledState);

        if (newEnabledState) {
            connect(tunnel)
                .then((connectionState) =>
                    onChange(tunnel, { connectionState })
                )
                .catch(() => setIsEnabled(false))
                .finally(() => setIsLoading(false));
        } else {
            disconnect(tunnel)
                .then((connectionState) =>
                    onChange(tunnel, { connectionState })
                )
                .finally(() => setIsLoading(false));
        }
    };

    return (
        <div className={`connection-card-container ${isLoading && 'loading'}`}>
            <div className={'connection-card'}>
                <div className={'port-container'}>
                    <span className={'port'}>{tunnel.local_port}</span>
                    <Toggle
                        checked={isEnabled}
                        disabled={isLoading}
                        icons={false}
                        onChange={onToggleChange}
                    />
                </div>
                <span className={'destination'}>
                    {toDestination(tunnel.remote_destination)}
                </span>
                <div className={'host-container'}>
                    <span className={'host'}>
                        <IoDesktopSharp />
                        <span className={'name'}>
                            {tunnel.ssh_configuration?.name || '---'}
                        </span>
                    </span>
                    <span className={'edit'} onClick={onEditClick}>
                        <IoSettingsSharp />
                        {'Edit'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default ConnectionCard;

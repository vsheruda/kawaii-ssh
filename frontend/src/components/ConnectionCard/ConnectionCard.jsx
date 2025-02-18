import React, { useState } from 'react';
import './ConnectionCard.css';
import 'react-toggle/style.css';
import { ConnectionStatus } from '../../const.js';
import Toggle from 'react-toggle';
import { IoDesktopSharp, IoSettingsSharp } from 'react-icons/io5';
import { useNavigate } from 'react-router';
import { connect, disconnect } from '../../operations.js';

const NAME_LOOKUP_MAP = {
    6379: 'Redis',
    5432: 'PostgreSQL',
    3306: 'MySQL',
    5439: 'Redshift',
    443: 'HTTPS',
    80: 'HTTP',
};

function ConnectionCard({ tunnel, onChange }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const isEnabled = tunnel.connection?.status === ConnectionStatus.CONNECTED;

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

        if (newEnabledState) {
            connect(tunnel)
                .then(onChange)
                .finally(() => setIsLoading(false));
        } else {
            disconnect(tunnel)
                .then(onChange)
                .finally(() => setIsLoading(false));
        }
    };

    const getCardName = (tunnel) => {
        return NAME_LOOKUP_MAP[tunnel.remote_port] || tunnel.local_port;
    };

    return (
        <div className={`connection-card-container ${isLoading && 'loading'}`}>
            <div className={'connection-card'}>
                <div className={'port-container'}>
                    <span className={'port'}>{getCardName(tunnel)}</span>
                    <Toggle
                        checked={isEnabled || isLoading}
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

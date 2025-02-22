import React, { useState } from 'react';
import './ApplicationCard.css';
import 'react-toggle/style.css';
import { ConnectionStatus, PORT_NAME_LOOKUP_MAP } from '../../const.js';
import { useNavigate } from 'react-router';
import { getValueOrSubstr, handleConnectionStateChange } from '../../utils.js';
import Toggle from 'react-toggle';
import { IoSettingsSharp } from 'react-icons/io5';
import { connect, disconnect } from '../../operations.js';

const ApplicationTunnel = ({ tunnel }) => {
    const isEnabled = tunnel.connection?.status === ConnectionStatus.CONNECTED;

    return (
        <div className={'tunnel'}>
            <div className={`state ${isEnabled && 'connected'}`} />
            <div className={'name'}>
                <span>
                    {PORT_NAME_LOOKUP_MAP[tunnel.remote_port] ||
                        tunnel.local_port}
                    :
                </span>{' '}
                {tunnel.remote_destination}
            </div>
        </div>
    );
};

function ApplicationCard({ id, name, tunnels, setConnections }) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const onToggleChange = (e) => {
        setIsLoading(true);
        const newEnabledState = e.target.checked;

        const promises = tunnels.map((tunnel) => {
            const onChange = handleConnectionStateChange(
                tunnel,
                setConnections
            );

            if (newEnabledState) {
                return connect(tunnel).then(onChange);
            } else {
                return disconnect(tunnel).then(onChange);
            }
        });

        Promise.all(promises).finally(() => setIsLoading(false));
    };

    const onClick = () => {
        navigate('/application-details', { state: { application_id: id } });
    };

    const isEnabled =
        isLoading ||
        tunnels.every(
            (it) => it.connection?.status === ConnectionStatus.CONNECTED
        );

    return (
        <div className={`application-card-container ${isLoading && 'loading'}`}>
            <div className={'application-card'}>
                <div className={'header'}>
                    <div className={'name'}>{getValueOrSubstr(name, 18)}</div>
                    <div className={'control'}>
                        <Toggle
                            checked={isEnabled || isLoading}
                            disabled={isLoading}
                            icons={false}
                            onChange={onToggleChange}
                        />
                        <div className={'edit'} onClick={onClick}>
                            <IoSettingsSharp />
                        </div>
                    </div>
                </div>
                <div className={'tunnels'}>
                    {tunnels.map((it, i) => (
                        <ApplicationTunnel key={i} tunnel={it} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default ApplicationCard;

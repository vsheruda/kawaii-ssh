import React from 'react';
import './HostSettingsCard.css';
import { CiGlobe } from 'react-icons/ci';
import { LuKeySquare } from 'react-icons/lu';
import { useNavigate } from 'react-router';

const toName = (it) => it.slice(0, 20);

const toHostName = (it) => {
    if (it.length <= 20) {
        return it;
    }

    return it.slice(0, 17) + '...';
};

const toKeyName = (it) => it.split('/').reverse()[0].slice(0, 27);

function HostSettingsCard({ sshConfiguration, onChange }) {
    const navigate = useNavigate();

    const onClick = () =>
        navigate('/host-settings-details', { state: { sshConfiguration } });

    return (
        <div className={'host-settings-container'}>
            <div className={'host-settings-card'} onClick={onClick}>
                <span className={'name'}>{toName(sshConfiguration.name)}</span>
                <span className={'host'}>
                    <CiGlobe />
                    {toHostName(sshConfiguration.host)}
                </span>
                <span className={'key'}>
                    <LuKeySquare />
                    {toKeyName(sshConfiguration.key_path)}
                </span>
            </div>
        </div>
    );
}

export default HostSettingsCard;

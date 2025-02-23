import React from 'react';
import { useProfile } from '../../context/ProfileContext.jsx';
import HostSettingsCard from '../../components/HostSettingsCard/HostSettingsCard.jsx';
import './HostSettingsList.css';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';

function HostSettingsList() {
    const { isLoading, profile } = useProfile();
    const navigate = useNavigate();

    const onAddClick = () => {
        navigate('/host-settings-details', {
            state: {
                sshConfiguration: {
                    host: '',
                    name: '',
                    username: '',
                    key_path: '',
                },
                isNew: true,
            },
        });
    };

    return (
        <div className={'host-settings-list-container'}>
            <div className={'host-settings-list'}>
                <SectionHeader
                    title={'Host Settings'}
                    tipMessage={
                        'Create a new host configuration to connect to a remote server.'
                    }
                    displayTip={profile.ssh_configurations.length === 0}
                />
                <div className={'items'}>
                    {!isLoading &&
                        profile?.ssh_configurations?.map((it, index) => (
                            <HostSettingsCard
                                key={index}
                                sshConfiguration={it}
                            />
                        ))}
                    <AddCardPlaceholder onClick={onAddClick} />
                </div>
            </div>
        </div>
    );
}

export default HostSettingsList;

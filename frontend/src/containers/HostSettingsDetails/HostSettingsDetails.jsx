import React, { useEffect, useState } from 'react';
import './HostSettingsDetails.css';
import { useLocation, useNavigate } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';
import {
    handleSSHConfigurationStateChange,
    isSameSSHConfig,
} from '../../utils.js';

function HostSettingsDetails() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setProfile, profile } = useProfile();

    const onSSHConfigurationStateChange = handleSSHConfigurationStateChange(
        profile,
        setProfile
    );

    // Lookup config from the global state to avoid using cached navigation version
    let sshConfiguration = profile.ssh_configurations.find(
        isSameSSHConfig(location.state.sshConfiguration)
    );

    // fallback to avoid crashes during updates
    if (!sshConfiguration) {
        sshConfiguration = location.state.sshConfiguration;
    }

    const [hasChanged, setHasChanged] = useState(false);
    const [infoMessage, setInfoMessage] = useState(null);
    const [name, setName] = useState(sshConfiguration.name);
    const [remoteHost, setRemoveHost] = useState(sshConfiguration.host);
    const [remoteUsername, setRemoteUsername] = useState(
        sshConfiguration.username
    );
    const [keyPath, setKeyPath] = useState(sshConfiguration.key_path);

    const onSaveClick = () => {
        onSSHConfigurationStateChange(
            sshConfiguration,
            {
                name,
                username: remoteUsername,
                host: remoteHost,
                key_path: keyPath,
            },
            location.state.isNew
        );

        // Immediate navigation fixes invalid lookup of the ssh config from profile
        // by outdated location.state.sshConfiguration
        navigate('/host-settings');
    };

    const onDeleteClick = () => {
        const isUsed =
            profile.tunnels.filter(
                (tunnel) =>
                    tunnel.ssh_configuration_name === sshConfiguration.name
            ).length > 0;

        if (isUsed) {
            setInfoMessage('Error: The tunnel is in use.');
            setTimeout(() => {
                setInfoMessage(null);
            }, 5000);
            return;
        }

        setProfile((prevState) => ({
            ...prevState,
            ssh_configurations: prevState.ssh_configurations.filter(
                (it) => !isSameSSHConfig(sshConfiguration)(it)
            ),
        }));

        navigate('/host-settings');
    };

    useEffect(() => {
        const hasDifferentValue =
            location.state.sshConfiguration.name !== name ||
            location.state.sshConfiguration.host !== remoteHost ||
            location.state.sshConfiguration.username !== remoteUsername ||
            location.state.sshConfiguration.key_path !== keyPath;

        setHasChanged(hasDifferentValue);
    }, [name, remoteHost, remoteUsername, keyPath]);

    return (
        <div className={'host-settings-details-container'}>
            <div className={'host-settings-details'}>
                <div className={'input'}>
                    <label htmlFor="name">Name</label>
                    <input
                        id="name"
                        disabled={!location.state.isNew}
                        onChange={({ target: { value } }) => setName(value)}
                        autoComplete="off"
                        name="name"
                        type="text"
                        placeholder={'Server Name'}
                        value={name}
                    />
                </div>
                <div className={'input'}>
                    <label htmlFor="host">Host</label>
                    <input
                        id="host"
                        onChange={({ target: { value } }) =>
                            setRemoveHost(value)
                        }
                        autoComplete="off"
                        name="remote-host"
                        type="text"
                        placeholder={'192.168.1.0'}
                        value={remoteHost}
                    />
                </div>
                <div className={'input'}>
                    <label htmlFor="username">Username</label>
                    <input
                        id="username"
                        onChange={({ target: { value } }) =>
                            setRemoteUsername(value)
                        }
                        autoComplete="off"
                        name="remote-username"
                        type="text"
                        placeholder={'ubuntu'}
                        value={remoteUsername}
                    />
                </div>
                <div className={'input'}>
                    <label htmlFor="key-path">Key Path</label>
                    <input
                        id="key-path"
                        onChange={({ target: { value } }) => setKeyPath(value)}
                        autoComplete="off"
                        name="private-key-path"
                        type="text"
                        value={keyPath}
                    />
                </div>
                <div className={'control-panel'}>
                    <button
                        disabled={!hasChanged}
                        onClick={onSaveClick}
                        className="btn"
                    >
                        Save
                    </button>
                    <button className="btn">Test</button>
                    <button
                        disabled={hasChanged}
                        className="btn"
                        onClick={onDeleteClick}
                    >
                        Delete
                    </button>
                    <span className={'info-message'}>{infoMessage}</span>
                </div>
            </div>
        </div>
    );
}

export default HostSettingsDetails;

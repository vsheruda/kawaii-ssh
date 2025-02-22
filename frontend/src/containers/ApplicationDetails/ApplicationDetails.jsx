import React, { useEffect, useState } from 'react';
import './ApplicationDetails.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import { useLocation, useNavigate } from 'react-router';
import Select from 'react-select';
import { groupBy, pipe, map, entries } from 'lodash/fp';
import { handleApplicationConfigurationStateChange } from '../../utils.js';

function getTunnelLabel(tunnel) {
    return `${tunnel.remote_destination}:${tunnel.remote_port}`;
}

const getTunnelsOptions = pipe(
    groupBy('ssh_configuration.name'),
    entries,
    map(([name, tunnels]) => ({
        label: name,
        options: tunnels.map((it) => ({
            value: it.id,
            label: getTunnelLabel(it),
        })),
    }))
);

function ApplicationDetails() {
    const location = useLocation();
    const { profile, setProfile } = useProfile();
    const navigate = useNavigate();

    let application = profile.applications.find(
        (it) => it.id === location.state.application_id
    );

    const onApplicationStateChange = handleApplicationConfigurationStateChange(
        profile,
        setProfile
    );

    const isNew = Boolean(!application);

    if (!application) {
        application = {
            id: location.state.application_id,
            name: '',
            tunnel_ids: [],
        };
    }

    const [hasChanged, setHasChanged] = useState(false);
    const [name, setName] = useState(application.name);
    const [tunnelIds, setTunnelIds] = useState(application.tunnel_ids);

    useEffect(() => {
        const hasDifferentValue =
            application.name !== name || application.tunnel_ids !== tunnelIds;

        setHasChanged(hasDifferentValue);
    }, [name, tunnelIds]);

    const onSaveClick = () => {
        onApplicationStateChange(application, { name, tunnelIds }, isNew);

        navigate('/application-list');
    };

    const onDeleteClick = () => {
        setProfile((prevState) => ({
            ...prevState,
            applications: prevState.applications.filter(
                (it) => it.id !== application.id
            ),
        }));

        navigate('/application-list');
    };

    return (
        <div className={'application-details-container'}>
            <div className={'application-details'}>
                <div className={'row header'}>
                    <h2>Application Configuration</h2>
                    <span>
                        Bundle multiple connections as a single application to
                        allow seamless tunneling to multiple destinations in one
                        click.
                    </span>
                </div>
                <div className={'row'}>
                    <label htmlFor={'name'}>Application Name</label>
                    <div className={'input'}>
                        <input
                            id={'name'}
                            onChange={({ target: { value } }) => setName(value)}
                            name="name"
                            type="text"
                            value={name}
                        />
                    </div>
                </div>
                <div className={'row'}>
                    <label htmlFor={'tunnels'}>Tunnels</label>
                    <div className={'input'}>
                        <Select
                            id={'tunnels'}
                            name="tunnels"
                            className={'tunnels-select'}
                            classNamePrefix={'tunnels-select'}
                            options={getTunnelsOptions(profile.tunnels)}
                            isMulti
                            onChange={(event) =>
                                setTunnelIds(event.map((it) => it.value))
                            }
                            value={tunnelIds.map((id) => ({
                                value: id,
                                label: getTunnelLabel(
                                    profile.tunnels.find((it) => it.id === id)
                                ),
                            }))}
                        />
                    </div>
                </div>
                <div className={'row control-panel'}>
                    <button
                        disabled={!hasChanged}
                        onClick={onSaveClick}
                        className="btn"
                    >
                        Save
                    </button>
                    <button onClick={onDeleteClick} className="btn">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ApplicationDetails;

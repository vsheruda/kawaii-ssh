import React, { useState } from 'react';
import './ApplicationList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';
import { v4 as uuid } from 'uuid';
import ApplicationCard from '../../components/ApplicationCard/ApplicationCard.jsx';
import SectionHeader from '../../components/SectionHeader/SectionHeader.jsx';

function ApplicationList() {
    const { profile, setConnections } = useProfile();
    const navigate = useNavigate();

    const onAddClick = () => {
        navigate('/application-details', {
            state: {
                application_id: uuid(),
                isNew: true,
            },
        });
    };

    const getTunnels = (tunnelIds) =>
        profile.tunnels.filter((it) => tunnelIds.includes(it.id));

    return (
        <div className={'application-list-container'}>
            <div className={'application-list'}>
                <SectionHeader
                    title={'Applications'}
                    tipMessage={
                        'Bundle multiple tunnels under one application to allow seamless connection in one click.'
                    }
                    displayTip={profile.applications.length === 0}
                />
                <div className={'items'}>
                    {profile.applications.map((it, index) => (
                        <ApplicationCard
                            key={index}
                            id={it.id}
                            name={it.name}
                            tunnels={getTunnels(it.tunnel_ids)}
                            setConnections={setConnections}
                        />
                    ))}
                </div>
                <AddCardPlaceholder onClick={onAddClick} />
            </div>
        </div>
    );
}

export default ApplicationList;

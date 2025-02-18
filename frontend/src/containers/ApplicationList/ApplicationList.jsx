import React, { useState } from 'react';
import './ApplicationList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';

function ApplicationList() {
    const { isLoading, profile, setProfile, setConnections } = useProfile();
    const navigate = useNavigate();

    return (
        <div className={'application-list-container'}>

            <div className={ 'application-list' }>
                <div className={'items'}>
                </div>
                <AddCardPlaceholder onClick={() => {}} />
            </div>
        </div>
    );
}

export default ApplicationList;

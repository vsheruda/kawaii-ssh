import React, { useState } from 'react';
import './ApplicationList.css';

import { useProfile } from '../../context/ProfileContext.jsx';
import AddCardPlaceholder from '../../components/AddCardPlaceholder/AddCardPlaceholder.jsx';
import { useNavigate } from 'react-router';

function ApplicationDetails() {
    const { isLoading, profile, setProfile, setConnections } = useProfile();
    const navigate = useNavigate();

    return (
        <div className={'application-details-container'}>

            <div
                className={ 'application-details' }
            >
            </div>
        </div>
    );
}

export default ApplicationDetails;

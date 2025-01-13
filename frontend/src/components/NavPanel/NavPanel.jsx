import React from 'react';
import './NavPanel.css';
import { IoDesktopSharp } from 'react-icons/io5';
import { MdElectricBolt } from 'react-icons/md';
import { PiPlugsConnectedFill } from 'react-icons/pi';
import { IoIosSave } from 'react-icons/io';
import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';

function NavPanel() {
    const { isSyncing, version } = useProfile();
    const location = useLocation();

    const isSelected = (paths) => paths.includes(location.pathname);

    return (
        <div className={ 'nav-panel-container' }>
            <div className={ 'nav-panel' }>
                <Link
                    to={ '/connection-list' }
                    className={ `nav-item ${ isSelected(['/', '/connection-list', '/connection-details']) && 'selected' }` }
                >
                    <PiPlugsConnectedFill title={ 'Connection List' }/>
                </Link>
                <Link
                    to={ '/host-settings' }
                    className={ `nav-item ${ isSelected(['/host-settings', '/host-settings-details']) && 'selected' }` }
                >
                    <IoDesktopSharp title={ 'Host Settings' }/>
                </Link>
                <Link
                    to={ '/system-health' }
                    className={ `nav-item ${ isSelected(['/system-health']) && 'selected' }` }
                >
                    <MdElectricBolt title={ 'System Health' }/>
                </Link>
                <div className={ "nav-item bottom" }>
                    { isSyncing && <IoIosSave className={ 'sync-progress' }/> }
                    { version && <span className={ 'version' }>v{ version }</span> }
                </div>
            </div>
        </div>
    );
}

export default NavPanel;

import React from 'react';
import './NavPanel.css';
import { IoDesktopSharp } from 'react-icons/io5';
import { MdElectricBolt } from 'react-icons/md';
import { PiPlugsConnectedFill } from 'react-icons/pi';
import { IoIosSave } from 'react-icons/io';
import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';

function NavPanel() {
    const { isSyncing } = useProfile();
    const location = useLocation();

    const isSelected = (paths) => paths.includes(location.pathname);

    return (
        <div className={'nav-panel'}>
            <Link
                to={'/connection-list'}
                className={`nav-item ${isSelected(['/', '/connection-list', '/connection-details']) && 'selected'}`}
            >
                <PiPlugsConnectedFill title={'Connection List'} />
            </Link>
            <Link
                to={'/host-settings'}
                className={`nav-item ${isSelected(['/host-settings', '/host-settings-details']) && 'selected'}`}
            >
                <IoDesktopSharp title={'Host Settings'} />
            </Link>
            <Link
                to={'/system-health'}
                className={`nav-item ${isSelected(['/system-health']) && 'selected'}`}
            >
                <MdElectricBolt title={'System Health'} />
            </Link>
            {isSyncing && <IoIosSave className={'nav-item sync-progress'} />}
        </div>
    );
}

export default NavPanel;

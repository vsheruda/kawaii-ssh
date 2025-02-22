import React, { useState } from 'react';
import './NavPanel.css';
import { IoDesktopSharp } from 'react-icons/io5';
import { MdElectricBolt } from 'react-icons/md';
import { PiPlugsConnectedFill, PiPackageDuotone } from 'react-icons/pi';
import { IoIosSave } from 'react-icons/io';
import { Link, useLocation } from 'react-router';
import { useProfile } from '../../context/ProfileContext.jsx';
import { VscPaintcan } from 'react-icons/vsc';

const THEMES = ['', 'light', 'vintage-modern', 'neon', 'pink'];

function NavPanel() {
    const { isSyncing, version } = useProfile();
    const location = useLocation();

    const [themeIndex, setThemeIndex] = useState(0);

    const isSelected = (paths) => paths.includes(location.pathname);

    const changeTheme = () => {
        if (themeIndex >= THEMES.length - 1) {
            setThemeIndex(0);
        } else {
            setThemeIndex(themeIndex + 1);
        }
    };

    document.documentElement.className = THEMES[themeIndex];

    return (
        <div className={'nav-panel-container'}>
            <div className={'nav-panel'}>
                <Link
                    to={'/application-list'}
                    className={`nav-item ${isSelected(['/', '/application-list', '/application-details']) && 'selected'}`}
                >
                    <PiPackageDuotone title={'Application List'} />
                </Link>
                <Link
                    to={'/connection-list'}
                    className={`nav-item ${isSelected(['/connection-list', '/connection-details']) && 'selected'}`}
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
                <div className={'nav-item bottom'}>
                    {isSyncing && <IoIosSave className={'sync-progress'} />}
                    <VscPaintcan className={'theme'} onClick={changeTheme} />
                    {version && <span className={'version'}>v{version}</span>}
                </div>
            </div>
        </div>
    );
}

export default NavPanel;

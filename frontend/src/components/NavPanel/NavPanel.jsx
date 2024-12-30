import React from 'react';
import './NavPanel.css';
import { GrHomeRounded } from 'react-icons/gr';
import { IoDesktopSharp } from 'react-icons/io5';
import { MdElectricBolt } from 'react-icons/md';
import { IoIosSave } from "react-icons/io";
import { Link } from 'react-router';
import { useProfile } from "../../context/ProfileContext.jsx";

function NavPanel() {
    const { isSyncing } = useProfile();
    return (
        <div className={'nav-panel'}>
            <Link to={'/connection-list'} className={'nav-item'}>
                <GrHomeRounded title={'Connection List'} />
            </Link>
            <Link to={'/host-settings'} className={'nav-item'}>
                <IoDesktopSharp title={'Host Settings'} />
            </Link>
            <Link to={'/system-health'} className={'nav-item'}>
                <MdElectricBolt title={'System Health'} />
            </Link>
            {isSyncing && <IoIosSave className={'nav-item sync-progress'}/>}
        </div>
    );
}

export default NavPanel;

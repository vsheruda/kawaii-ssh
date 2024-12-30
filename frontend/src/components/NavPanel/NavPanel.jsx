import React from 'react';
import './NavPanel.css';
import { GrHomeRounded } from 'react-icons/gr';
import { IoDesktopSharp } from 'react-icons/io5';
import { MdElectricBolt } from 'react-icons/md';
import { Link } from 'react-router';

function NavPanel() {
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
        </div>
    );
}

export default NavPanel;

import React from 'react';
import './SectionHeader.css';
import { FaLightbulb } from 'react-icons/fa';

function SectionHeader({ title, tipMessage, displayTip }) {
    return (
        <div className={'section-header'}>
            <h2>{title}</h2>
            {displayTip ? (
                <div className={'tip'}>
                    <FaLightbulb />
                    <span>{tipMessage}</span>
                </div>
            ) : null}
        </div>
    );
}

export default SectionHeader;

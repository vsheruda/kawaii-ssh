import React from 'react';
import { GrAddCircle } from 'react-icons/gr';
import './AddCardPlaceholder.css';

function AddCardPlaceholder({ onClick }) {
    return (
        <div className={'add-card-container'}>
            <div className={'add-card'} onClick={onClick}>
                <div className={'add-card-button'}>
                    <GrAddCircle />
                </div>
            </div>
        </div>
    );
}

export default AddCardPlaceholder;

import React from 'react';
import { GrAddCircle } from 'react-icons/gr';
import './AddCardPlaceholder.css';

function AddCardPlaceholder({ onClick }) {
    return (
        <div className={'add-card-container'} onClick={onClick}>
            <div className={'add-card'}>
                <div className={'add-card-button'}>
                    <GrAddCircle />
                </div>
            </div>
        </div>
    );
}

export default AddCardPlaceholder;

import React, { useState } from 'react';
import Dialog from '../Dialog/Dialog.jsx';

function DeleteButton({ itemType, itemName, onConfirm, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);

    const confirmDelete = () => {
        setIsOpen(false);
        onConfirm();
    };

    return (
        <>
            <button
                type="button"
                className="btn"
                disabled={disabled}
                onClick={() => setIsOpen(true)}
            >
                Delete
            </button>
            <Dialog
                open={isOpen}
                title={`Delete ${itemType}?`}
                message={`You are about to delete “${itemName || `this ${itemType}`}”. This action cannot be undone.`}
                onClose={() => setIsOpen(false)}
            >
                <button type="button" onClick={() => setIsOpen(false)}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="dialog-confirm"
                    disabled={disabled}
                    onClick={confirmDelete}
                >
                    Delete
                </button>
            </Dialog>
        </>
    );
}

export default DeleteButton;

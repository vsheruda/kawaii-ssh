import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Dialog.css';

function Dialog({ open, title, message, onClose, children }) {
    const dialogRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog.open) {
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open]);

    return createPortal(
        <dialog
            ref={dialogRef}
            className="dialog"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onCancel={onClose}
        >
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{message}</p>
            <div className="dialog-actions">
                {children || (
                    <button type="button" onClick={onClose}>
                        OK
                    </button>
                )}
            </div>
        </dialog>,
        document.body
    );
}

export default Dialog;

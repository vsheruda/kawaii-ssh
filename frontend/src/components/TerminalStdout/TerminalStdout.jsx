import React from 'react';
import './TerminalStdout.css';
import { ConnectionStatus } from '../../const.js';

function TerminalStdout({ messages, connectionState, isLoading, scrollRef }) {
    const getTerminalContent = () => {
        if (
            isLoading &&
            (!messages?.length ||
                connectionState === ConnectionStatus.DISCONNECTED)
        ) {
            return <div className={'terminal-single-message'}>Loading...</div>;
        }

        if (
            connectionState === ConnectionStatus.CONNECTED ||
            messages?.length > 0
        ) {
            return messages?.map((message, index) => (
                <p key={index} className={'terminal-line'}>
                    {'> '}
                    {message}
                </p>
            ));
        }

        return <div className={'terminal-single-message'}>- NO SIGNAL -</div>;
    };

    return (
        <div className={'terminal-stdout'}>
            <div className={'terminal'} ref={scrollRef}>
                {getTerminalContent()}
            </div>
        </div>
    );
}

export default TerminalStdout;

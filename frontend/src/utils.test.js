import assert from 'node:assert/strict';
import test from 'node:test';
import { ConnectionStatus, isConnectionActive } from './const.js';
import { handleConnectionsStateChange } from './utils.js';

test('retained tunnels stay active through failure and recovery', () => {
    let state = {
        tunnel: { hash: 'ssh-1', status: ConnectionStatus.CONNECTED },
    };
    const update = (response) =>
        handleConnectionsStateChange(state, (apply) => {
            state = apply(state);
        })(response);

    update([
        { id: 'ssh-1', is_connected: false, messages: ['Permission denied.'] },
    ]);
    assert.equal(state.tunnel.status, ConnectionStatus.RECONNECTING);
    assert.equal(isConnectionActive(state.tunnel), true);
    assert.equal(state.tunnel.hash, 'ssh-1');

    update([{ id: 'ssh-1', is_connected: true, messages: [] }]);
    assert.equal(state.tunnel.status, ConnectionStatus.CONNECTED);

    update([]);
    assert.equal(state.tunnel.status, ConnectionStatus.DISCONNECTED);
    assert.equal(isConnectionActive(state.tunnel), false);
});

test('a late poll cannot reactivate a cancelled tunnel', () => {
    let state = {
        tunnel: { hash: 'ssh-1', status: ConnectionStatus.RECONNECTING },
    };
    const applyPoll = handleConnectionsStateChange(state, (apply) => {
        state = apply(state);
    });
    const cancelled = { hash: 'ssh-1', status: ConnectionStatus.DISCONNECTED };
    state = { tunnel: cancelled };
    applyPoll([{ id: 'ssh-1', is_connected: false, messages: [] }]);
    assert.equal(state.tunnel, cancelled);
});

test('a late poll cannot hide a newly connected tunnel', () => {
    let state = {
        tunnel: { hash: 'old', status: ConnectionStatus.DISCONNECTED },
    };
    const applyPoll = handleConnectionsStateChange(state, (apply) => {
        state = apply(state);
    });
    const connected = { hash: 'new', status: ConnectionStatus.CONNECTED };
    state = { tunnel: connected };
    applyPoll([]);
    assert.equal(state.tunnel, connected);
});

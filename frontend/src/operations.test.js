import assert from 'node:assert/strict';
import test from 'node:test';
import { connect, disconnect, terminateProcesses } from './operations.js';
import { ConnectionStatus } from './const.js';

test('connect keeps a retained attempt reconnecting until it is ready', async () => {
    globalThis.window = {
        go: {
            main: {
                App: {
                    Connect: async () => ({
                        id: 'ssh-1',
                        is_connected: false,
                        responseCode: 200,
                        messages: [],
                    }),
                },
            },
        },
    };
    const connection = await connect({
        ssh_configuration: {},
        remote_destination: 'test',
    });
    assert.equal(connection.status, ConnectionStatus.RECONNECTING);
    assert.equal(connection.hash, 'ssh-1');
});

test('terminate all accepts the void result and allows an empty process snapshot', async () => {
    let requestedPids;
    globalThis.window = {
        go: {
            main: {
                App: {
                    TerminateProcesses: async (pids) => {
                        requestedPids = pids;
                    },
                },
            },
        },
    };
    await terminateProcesses([]);
    assert.deepEqual(requestedPids, []);
});

test('terminate all preserves backend cleanup errors', async () => {
    const failure = new Error('Could not stop a tunnel');
    globalThis.window = {
        go: {
            main: {
                App: {
                    TerminateProcesses: async () => {
                        throw failure;
                    },
                },
            },
        },
    };
    await assert.rejects(
        terminateProcesses(['123']),
        (error) => error === failure
    );
});

test('disconnect waits for backend cancellation before releasing the UI', async () => {
    let finish;
    let requestedHash;
    globalThis.window = {
        go: {
            main: {
                App: {
                    Disconnect: (hash) => {
                        requestedHash = hash;
                        return new Promise((resolve) => {
                            finish = resolve;
                        });
                    },
                },
            },
        },
    };
    let settled = false;
    const pending = disconnect({ connection: { hash: 'ssh-1' } }).then(
        (result) => {
            settled = true;
            return result;
        }
    );
    await Promise.resolve();
    assert.equal(settled, false);
    assert.equal(requestedHash, 'ssh-1');
    finish({ id: 'ssh-1', responseCode: 200, messages: [] });
    assert.equal((await pending).status, ConnectionStatus.DISCONNECTED);
});

test('disconnect rejects failed cleanup and handles tunnels that never started', async (t) => {
    t.mock.method(console, 'error', () => {});
    globalThis.window = {
        go: {
            main: {
                App: {
                    Disconnect: async () => ({ responseCode: 500 }),
                },
            },
        },
    };
    await assert.rejects(disconnect({ connection: { hash: 'ssh-1' } }));
    const result = await disconnect({});
    assert.equal(result.status, ConnectionStatus.DISCONNECTED);
});

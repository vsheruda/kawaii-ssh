const ConnectionStatus = {
    CONNECTED: 'connected',
    ERROR: 'error',
    DISCONNECTED: 'disconnected',
};

const PORT_NAME_LOOKUP_MAP = {
    6379: 'Redis',
    5432: 'PostgreSQL',
    3306: 'MySQL',
    5439: 'Redshift',
    443: 'HTTPS',
    80: 'HTTP',
};

export { ConnectionStatus, PORT_NAME_LOOKUP_MAP };

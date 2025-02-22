import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    GetProfile,
    SaveProfile,
    GetConnections,
} from '../../wailsjs/go/main/App.js';
import { handleConnectionsStateChange } from '../utils.js';
import { ConnectionStatus } from '../const.js';

const ProfileContext = createContext({});

const CONNECTION_STATE_REFRESH_INTERVAL = 5000;

export const ProfileProvider = ({ children }) => {
    const [forceProfileReload, setForceProfileReload] = useState(0);
    const [forceConnectionStateUpdate, setForceConnectionStateUpdate] =
        useState(0);
    const [version, setVersion] = useState('');
    const [profile, setProfile] = useState({
        ssh_configurations: [],
        tunnels: [],
        applications: [],
    });
    const [connections, setConnections] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const debounceProfileSync = useRef(null);
    const connectionStateTimeout = useRef(null);

    const reloadProfile = () => setForceProfileReload(forceProfileReload + 1);
    const updateConnectionsStates = () =>
        setForceConnectionStateUpdate(forceConnectionStateUpdate + 1);
    const scheduleUpdateConnectionsStates = () =>
        setTimeout(
            () => updateConnectionsStates(),
            CONNECTION_STATE_REFRESH_INTERVAL
        );

    const onConnectionsStateChange = handleConnectionsStateChange(
        connections,
        setConnections
    );

    useEffect(() => {
        if (debounceProfileSync.current) {
            clearTimeout(debounceProfileSync.current);
        }

        if (!isSyncing) {
            setIsSyncing(true);
        }

        debounceProfileSync.current = setTimeout(() => {
            SaveProfile(profile)
                .catch(console.error)
                .finally(() => setIsSyncing(false));
        }, 3000);

        return () => clearTimeout(debounceProfileSync.current);
    }, [profile]);

    useEffect(() => {
        setIsLoading(true);

        GetProfile()
            .then(({ profile, version }) => {
                console.log('Loaded profile', profile);

                setProfile(profile);
                setVersion(version);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [forceProfileReload]);

    useEffect(() => {
        const hasOpenConnections =
            Object.values(connections).filter(
                (it) => it.status === ConnectionStatus.CONNECTED
            ).length === 0;

        if (hasOpenConnections) {
            scheduleUpdateConnectionsStates();
            return;
        }

        GetConnections().then((response) => {
            console.log('Fetched connection states', response, profile.tunnels);
            onConnectionsStateChange(response);

            scheduleUpdateConnectionsStates();
        });
    }, [forceConnectionStateUpdate]);

    useEffect(() => {
        if (connectionStateTimeout.current) {
            return;
        }

        connectionStateTimeout.current = scheduleUpdateConnectionsStates();
    }, []);

    return (
        <ProfileContext.Provider
            value={{
                version,
                setProfile,
                // Assemble profile data for easier data access
                profile: {
                    ...profile,
                    tunnels: [
                        ...profile.tunnels.map((tunnel) => ({
                            ...tunnel,
                            connection: connections[tunnel.id],
                            ssh_configuration: profile.ssh_configurations.find(
                                (it) =>
                                    it.name === tunnel.ssh_configuration_name
                            ),
                        })),
                    ],
                    applications: profile.applications,
                },
                isLoading,
                setIsLoading,
                reloadProfile,
                isSyncing,
                setConnections,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { GetProfile, SaveProfile } from '../../wailsjs/go/main/App.js';

const ProfileContext = createContext({});

export const ProfileProvider = ({ children }) => {
    const [forceProfileReload, setForceProfileReload] = useState(0);
    const [profile, setProfile] = useState({
        ssh_configurations: [],
        tunnels: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const debounceProfileSync = useRef(null);

    const reloadProfile = () => setForceProfileReload(forceProfileReload + 1);

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
            .then(({ profile }) => {
                console.log('Loaded profile', profile);

                setProfile(profile);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [forceProfileReload]);

    return (
        <ProfileContext.Provider
            value={{
                profile,
                setProfile,
                isLoading,
                setIsLoading,
                reloadProfile,
                isSyncing,
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => useContext(ProfileContext);

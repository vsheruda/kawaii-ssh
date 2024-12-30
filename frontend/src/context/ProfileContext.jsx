import React, { createContext, useContext, useEffect, useState } from 'react';
import { GetProfile } from '../../wailsjs/go/main/App.js';

const ProfileContext = createContext({});

export const ProfileProvider = ({ children }) => {
    const [forceProfileReload, setForceProfileReload] = useState(0);
    const [profile, setProfile] = useState({
        ssh_configurations: [],
        tunnels: [],
    });
    const [isLoading, setIsLoading] = useState(false);

    const reloadProfile = () => setForceProfileReload(forceProfileReload + 1);

    useEffect(() => {
        console.log('Profile context updated', profile);
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
            }}
        >
            {children}
        </ProfileContext.Provider>
    );
};

// Custom hook for accessing the context
export const useProfile = () => useContext(ProfileContext);

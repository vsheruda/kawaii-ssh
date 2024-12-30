import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './style.css';
import App from './App';
import ConnectionDetails from './containers/ConnectionDetails/ConnectionDetails.jsx';
import ConnectionList from './containers/ConnectionList/ConnectionList.jsx';
import HostSettingsList from './containers/HostSettingsList/HostSettingsList.jsx';
import SystemHealth from './containers/SystemHealth/SystemHealth.jsx';
import HostSettingsDetails from './containers/HostSettingsDetails/HostSettingsDetails.jsx';

const container = document.getElementById('root');

const root = createRoot(container);

root.render(
    <React.StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<App />}>
                    <Route index element={<ConnectionList />} />
                    <Route
                        path={'connection-details'}
                        element={<ConnectionDetails />}
                    />
                    <Route
                        path={'connection-list'}
                        element={<ConnectionList />}
                    />
                    <Route
                        path={'host-settings'}
                        element={<HostSettingsList />}
                    />
                    <Route
                        path={'host-settings-details'}
                        element={<HostSettingsDetails />}
                    />
                    <Route path={'system-health'} element={<SystemHealth />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </React.StrictMode>
);

import './App.css';
import NavPanel from './components/NavPanel/NavPanel.jsx';
import { Outlet } from 'react-router';
import { ProfileProvider } from './context/ProfileContext.jsx';

function App() {
    return (
        <div id="app">
            <ProfileProvider>
                <NavPanel />
                <Outlet />
            </ProfileProvider>
        </div>
    );
}

export default App;

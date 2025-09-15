// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useLocation } from 'react-router-dom';
import MainInterface from './components/MainInterface';
import OverlayPage from './components/OverlayPage';
import './App.css';

// Wrapper component to extract channel name from URL params
function OverlayPageWrapper() {
  const { channelName } = useParams<{ channelName: string }>();
  
  if (!channelName) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        color: 'white', 
        background: 'black' 
      }}>
        <p>Invalid channel name</p>
      </div>
    );
  }
  
  return <OverlayPage channelName={channelName} />;
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const isOverlayRoute = location.pathname.startsWith('/overlay/');
  
  return (
    <div className={`app ${isOverlayRoute ? 'overlay-route' : ''}`}>
      <Routes>
        {/* Main interface route */}
        <Route path="/" element={<MainInterface />} />
        
        {/* OBS overlay route */}
        <Route path="/overlay/:channelName" element={<OverlayPageWrapper />} />
      </Routes>
    </div>
  );
}

export default App;
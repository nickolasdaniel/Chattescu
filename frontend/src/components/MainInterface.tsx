// frontend/src/components/MainInterface.tsx

import React, { useState } from 'react';
import './MainInterface.css';

interface MainInterfaceState {
  currentChannel: string | null;
}

function MainInterface() {
  const [state, setState] = useState<MainInterfaceState>({
    currentChannel: null
  });

  const handleJoinChannel = (channelName: string) => {
    if (channelName.trim()) {
      console.log('Generating URL for channel:', channelName);
      setState(prev => ({
        ...prev,
        currentChannel: channelName.trim().toLowerCase()
      }));
    }
  };


  const generateOverlayURL = () => {
    if (state.currentChannel) {
      return `${window.location.origin}/overlay/${state.currentChannel}`;
    }
    return '';
  };

  return (
    <div className="main-interface">
      <div className="interface-header">
        <h1>Chattescu - Kick Chat Overlay</h1>
      </div>

      <div className="interface-content">
        <div className="main-panel">
          <div className="channel-input-section">
            <h2>Enter Kick Channel Name</h2>
            <p>Enter a Kick channel name to generate the OBS overlay URL</p>
            
            <div className="input-group">
              <input
                type="text"
                placeholder="Example: hyghman, tyceno"
                value={state.currentChannel || ''}
                onChange={(e) => {
                  const channelName = e.target.value.toLowerCase().trim();
                  setState(prev => ({ ...prev, currentChannel: channelName }));
                }}
                className="channel-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && state.currentChannel) {
                    handleJoinChannel(state.currentChannel);
                  }
                }}
              />
              <button
                onClick={() => {
                  if (state.currentChannel) {
                    handleJoinChannel(state.currentChannel);
                  }
                }}
                className="connect-button"
                disabled={!state.currentChannel}
              >
                Generate URL
              </button>
            </div>
          </div>

          {state.currentChannel && (
            <div className="overlay-section">
              <h3>OBS Browser Source URL</h3>
              <div className="overlay-url-container">
                <label htmlFor="overlay-url">Copy this URL for your OBS Browser Source:</label>
                <div className="url-input-group">
                  <input
                    id="overlay-url"
                    type="text"
                    value={generateOverlayURL()}
                    readOnly
                    className="overlay-url-input"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateOverlayURL());
                    }}
                    className="copy-button"
                  >
                    Copy
                  </button>
                </div>
                <div className="overlay-instructions">
                  <h4>OBS Setup Instructions:</h4>
                  <ol>
                    <li>Add a "Browser Source" to your scene</li>
                    <li>Paste the URL above into the URL field</li>
                    <li>Set width to 400px and height to 600px</li>
                    <li>Check "Shutdown source when not visible"</li>
                    <li>Click "OK" to add the overlay</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainInterface;

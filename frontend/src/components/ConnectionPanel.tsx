// frontend/src/components/ConnectionPanel.tsx

import React, { useState } from 'react';
import './ConnectionPanel.css';

interface ConnectionPanelProps {
  isConnected: boolean;
  currentChannel: string | null;
  connectionError: string | null;
  onJoinChannel: (channelName: string) => void;
  onLeaveChannel: () => void;
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  isConnected,
  currentChannel,
  connectionError,
  onJoinChannel,
  onLeaveChannel
}) => {
  const [channelInput, setChannelInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelInput.trim() && isConnected) {
      onJoinChannel(channelInput);
      setChannelInput('');
    }
  };

  return (
    <div className="connection-panel">
      <div className="panel-header">
        <h2>Chattescu</h2>
        <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {connectionError && (
        <div className="error-message">
          {connectionError}
        </div>
      )}

      {currentChannel ? (
        <div className="current-channel">
          <div className="channel-info">
            <span className="channel-label">Connected to:</span>
            <span className="channel-name">{currentChannel}</span>
          </div>
          <button 
            onClick={onLeaveChannel}
            className="leave-button"
          >
            Leave Channel
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="channel-form">
          <div className="input-group">
            <input
              type="text"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              placeholder="Enter channel name..."
              className="channel-input"
              disabled={!isConnected}
            />
            <button 
              type="submit"
              disabled={!isConnected || !channelInput.trim()}
              className="join-button"
            >
              Join
            </button>
          </div>
        </form>
      )}

      <div className="instructions">
        <p>Enter a Kick channel name to connect to their chat overlay.</p>
        <p>Example: <code>tyceno</code>, <code>hyghman</code></p>
      </div>
    </div>
  );
};

export default ConnectionPanel;
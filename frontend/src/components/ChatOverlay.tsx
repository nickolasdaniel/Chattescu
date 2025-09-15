// frontend/src/components/ChatOverlay.tsx

import React from 'react';
import ChatMessage from './ChatMessage';
import { ChatMessage as ChatMessageType, ChannelInfo, SevenTVEmote } from '../types';
import './ChatOverlay.css';

interface ChatOverlayProps {
  messages: ChatMessageType[];
  emotes: SevenTVEmote[];
  channelInfo: ChannelInfo | null;
  isWebSocketConnected: boolean;
  hasReceivedMessages: boolean;
  isConnecting: boolean;
  currentChannel: string | null;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ 
  messages, 
  emotes, 
  channelInfo, 
  isWebSocketConnected,
  hasReceivedMessages,
  isConnecting,
  currentChannel
}) => {
  const renderContent = () => {
    // If we're connecting to a channel, show waiting message
    if (isConnecting && currentChannel) {
      return (
        <div className="waiting-message">
          <div className="system-message">
            <span className="waiting-dots">
              Waiting for messages
              <span className="dot-1">.</span>
              <span className="dot-2">.</span>
              <span className="dot-3">.</span>
            </span>
          </div>
        </div>
      );
    }
    
    // If no channel is connected, display nothing
    if (!channelInfo) {
      return null;
    }
    
    // If messages have arrived, display them
    if (messages.length > 0) {
      return messages.map((message) => (
        <ChatMessage
          key={message.id}
          message={message}
          emotes={emotes}
          channelInfo={channelInfo}
        />
      ));
    }
    
    // If we're waiting for the WebSocket to confirm connection
    if (!isWebSocketConnected) {
      return (
        <div className="waiting-message">
          <div className="system-message">
            <span className="waiting-dots">
              Waiting for messages
              <span className="dot-1">.</span>
              <span className="dot-2">.</span>
              <span className="dot-3">.</span>
            </span>
          </div>
        </div>
      );
    }

    // If we're connected but there are no messages yet
    if (messages.length === 0 && !hasReceivedMessages) {
      return (
        <div className="welcome-message">
          <div className="system-message">
            Connected to {channelInfo.username}'s chat!
          </div>
        </div>
      );
    }
    
    // Fallback: should not be reached
    return null;
  };

  return (
    <div className="chat-overlay">
      <div className="chat-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default ChatOverlay;
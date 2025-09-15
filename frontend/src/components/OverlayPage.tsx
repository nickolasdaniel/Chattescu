// frontend/src/components/OverlayPage.tsx

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import ChatOverlay from './ChatOverlay';
import { ChatMessage, ChannelInfo, SevenTVEmote } from '../types';
import './OverlayPage.css';

interface OverlayPageState {
  socket: typeof Socket | null;
  isConnected: boolean;
  messages: ChatMessage[];
  channelInfo: ChannelInfo | null;
  emotes: SevenTVEmote[];
  connectionError: string | null;
  isWebSocketConnected: boolean;
  hasReceivedMessages: boolean;
  isConnecting: boolean;
  channelName: string | null;
}

interface OverlayPageProps {
  channelName: string;
}

function OverlayPage({ channelName }: OverlayPageProps) {
  const [state, setState] = useState<OverlayPageState>({
    socket: null,
    isConnected: false,
    messages: [],
    channelInfo: null,
    emotes: [],
    connectionError: null,
    isWebSocketConnected: false,
    hasReceivedMessages: false,
    isConnecting: true,
    channelName: channelName
  });

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      console.log('Overlay connected to Chattescu backend');
      setState(prev => ({ ...prev, socket, isConnected: true, connectionError: null }));
      
      // Auto-join the channel when connected
      if (channelName) {
        console.log('Auto-joining channel:', channelName);
        socket.emit('joinChannel', channelName.toLowerCase());
      }
    });

    socket.on('disconnect', () => {
      console.log('Overlay disconnected from backend');
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('chatMessage', (message: ChatMessage) => {
      setState(prev => ({
        ...prev,
        messages: [...prev.messages.slice(-14), message],
        hasReceivedMessages: true
      }));
    });

    socket.on('channelConnected', (channelInfo: ChannelInfo) => {
      console.log('Overlay connected to channel:', channelInfo.username);
      setState(prev => ({
        ...prev,
        channelInfo,
        messages: [],
        connectionError: null,
        isWebSocketConnected: true,
        hasReceivedMessages: false,
        isConnecting: false
      }));
      
      // Send badge data after channel is connected
      fetchAndSendBadgeData(channelName.toLowerCase(), socket);
    });

    socket.on('emotesLoaded', (emotes: SevenTVEmote[]) => {
      console.log('Overlay emotes loaded:', emotes.length);
      setState(prev => ({ ...prev, emotes }));
    });

    socket.on('connectionError', (error: string) => {
      console.error('Overlay connection error:', error);
      setState(prev => ({
        ...prev,
        connectionError: error,
        isWebSocketConnected: false,
        isConnecting: false
      }));
    });

    setState(prev => ({ ...prev, socket }));

    return () => {
      socket.disconnect();
    };
  }, [channelName]);

  const fetchAndSendBadgeData = async (channelName: string, socket: typeof Socket) => {
    try {
      console.log('Overlay fetching badge data for:', channelName);
      const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Overlay successfully fetched channel data:', data);
        
        socket.emit('badgeData', {
          channelName,
          subscriber_badges: data.subscriber_badges || [],
          channelInfo: {
            id: data.id?.toString(),
            slug: data.slug,
            username: data.user?.username,
            chatroom: {
              id: data.chatroom?.id?.toString(),
              channel_id: data.chatroom?.channel_id?.toString()
            }
          }
        });
        console.log('Overlay sent badge data to backend');
      } else {
        console.error('Overlay failed to fetch channel data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Overlay error fetching badge data:', error);
    }
  };

  // Show loading state while connecting
  if (state.isConnecting) {
    return (
      <div className="overlay-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to {channelName}...</p>
      </div>
    );
  }

  // Show error state if connection failed
  if (state.connectionError) {
    return (
      <div className="overlay-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to connect to {channelName}</p>
        <p className="error-details">{state.connectionError}</p>
      </div>
    );
  }

  // Show the chat overlay
  return (
    <div className="overlay-page">
      <ChatOverlay
        messages={state.messages}
        emotes={state.emotes}
        channelInfo={state.channelInfo}
        isWebSocketConnected={state.isWebSocketConnected}
        hasReceivedMessages={state.hasReceivedMessages}
        isConnecting={state.isConnecting}
        currentChannel={state.channelName}
      />
    </div>
  );
}

export default OverlayPage;

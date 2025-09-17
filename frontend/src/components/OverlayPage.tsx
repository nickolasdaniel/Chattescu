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
    // Set dynamic page title based on channel
    document.title = `${channelName} - Chattescu`;
    
    // Set dynamic meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `Live chat overlay for ${channelName} on Kick`);
    }
    
    // Environment-based backend URL configuration
    const getBackendUrl = () => {
      // Production check
      if (process.env.NODE_ENV === 'production') {
        return process.env.REACT_APP_BACKEND_URL || 'https://your-backend-app.railway.app';
      }
      // Development fallback
      return process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    };
    
    const backendUrl = getBackendUrl();
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Connecting to backend: ${backendUrl} (env: ${process.env.NODE_ENV})`);
    }
    const socket = io(backendUrl);

    socket.on('connect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Overlay connected to Chattescu backend');
      }
      setState(prev => ({ ...prev, socket, isConnected: true, connectionError: null }));
      
      // Auto-join the channel when connected
      if (channelName) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Auto-joining channel:', channelName);
        }
        socket.emit('joinChannel', channelName.toLowerCase());
      }
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Overlay disconnected from backend');
      }
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('chatMessage', (message: ChatMessage) => {
      setState(prev => {
        // More efficient message array management
        const newMessages = prev.messages.length >= 28 
          ? [...prev.messages.slice(-27), message]  // Keep 27 + new = 28 total
          : [...prev.messages, message];
        
        return {
          ...prev,
          messages: newMessages,
          hasReceivedMessages: true
        };
      });
    });

    socket.on('channelConnected', (channelInfo: ChannelInfo) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('Overlay connected to channel:', channelInfo.username);
      }
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('Overlay emotes loaded:', emotes.length);
        console.log('First 5 emotes:', emotes.slice(0, 5).map(e => ({ name: e.name, type: e.type, url: e.url.substring(0, 50) + '...' })));
      }
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('Overlay fetching badge data for:', channelName);
      }
      const response = await fetch(`https://kick.com/api/v2/channels/${channelName}`);
      
      if (response.ok) {
        const data = await response.json();
        if (process.env.NODE_ENV !== 'production') {
          console.log('Overlay successfully fetched channel data:', data);
        }
        
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
        if (process.env.NODE_ENV !== 'production') {
          console.log('Overlay sent badge data to backend');
        }

        // Fetch 7TV channel emotes directly from frontend using user_id
        await fetchChannelEmotes(data.user_id?.toString(), socket);
      } else {
        console.error('Overlay failed to fetch channel data:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Overlay error fetching badge data:', error);
    }
  };

  const fetchChannelEmotes = async (kickUserId: string | undefined, socket: typeof Socket) => {
    if (!kickUserId) {
      console.log('No Kick user ID available for 7TV emotes');
      return;
    }

    try {
      console.log(`🎭 Frontend fetching 7TV emotes for Kick user ID: ${kickUserId}`);
      const response = await fetch(`https://7tv.io/v3/users/kick/${kickUserId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎭 7TV API response:', data);
        
        if (data.emote_set?.emotes) {
          const channelEmotes = data.emote_set.emotes.map((emote: any) => ({
            name: emote.name,
            url: `https://cdn.7tv.app/emote/${emote.id}/2x.webp`,
            type: 'channel' as const,
            animated: emote.data?.animated || false
          }));
          
          console.log(`🎭 Found ${channelEmotes.length} channel emotes:`, channelEmotes.slice(0, 5).map((e: any) => e.name));
          
          // Add to existing emotes
          setState(prev => ({
            ...prev,
            emotes: [...prev.emotes, ...channelEmotes]
          }));
        } else {
          console.log('🎭 No 7TV emote set found for this channel');
        }
      } else if (response.status === 404) {
        console.log('🎭 Channel not linked to 7TV');
      } else {
        console.error('🎭 Failed to fetch 7TV emotes:', response.status);
      }
    } catch (error) {
      console.error('🎭 Error fetching 7TV emotes:', error);
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

// src/server.ts

import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { ChatController } from './controllers/ChatController';
import { ClientToServerEvents, ServerToClientEvents } from './types';

const app = express();
const server = http.createServer(app);

// Configure CORS for WebSocket
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const chatController = new ChatController(io);

// Handle WebSocket connections
io.on('connection', (socket: Socket) => {
  console.log(`⚡️ Client connected: ${socket.id}`);
  
  // Forward socket events to the ChatController
  socket.on('joinChannel', (channelName: string) => {
    chatController.handleJoinChannel(socket, channelName);
  });
  
  socket.on('leaveChannel', () => {
    chatController.handleLeaveChannel(socket);
  });
  
  socket.on('badgeData', (data) => {
    // Corrected the method call to pass only one argument
    chatController.handleBadgeData(data);
  });
  
  socket.on('disconnect', () => {
    chatController.handleDisconnect(socket);
  });
});

app.get('/', (req, res) => {
  res.send('Chattescu Backend is running!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🔥 Server is running on port ${PORT}`);
});
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const ChatController_1 = require("./controllers/ChatController");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
const chatController = new ChatController_1.ChatController(io);
io.on('connection', (socket) => {
    console.log(`⚡️ Client connected: ${socket.id}`);
    socket.on('joinChannel', (channelName) => {
        chatController.handleJoinChannel(socket, channelName);
    });
    socket.on('leaveChannel', () => {
        chatController.handleLeaveChannel(socket);
    });
    socket.on('badgeData', (data) => {
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
//# sourceMappingURL=server.js.map
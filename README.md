# 🎮 Chattescu - Kick Chat Overlay

A modern, feature-rich chat overlay for Kick streamers with **7TV cosmetics support**, real-time messaging, and OBS integration.

![Kick Chat Overlay](https://img.shields.io/badge/Platform-Kick-00ff88?style=for-the-badge&logo=kick&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

## ✨ Features

### 🎨 **7TV Cosmetics Integration**
- **Real-time 7TV paint effects** - Gradient and solid color cosmetics
- **7TV badges** - Custom user badges from 7TV
- **Accurate color rendering** - Proper BGRA color conversion for authentic 7TV colors
- **Smart caching system** - Optimized performance with in-memory caching

### 💬 **Advanced Chat Features**
- **Real-time messaging** - Live Kick chat integration
- **Custom subscriber badges** - Kick's native subscriber badges
- **User roles** - Moderator, VIP, and subscriber indicators
- **Message filtering** - Clean, professional chat display

### 🎬 **OBS Ready**
- **Transparent background** - Perfect for streaming overlays
- **Responsive design** - Works on any screen size
- **Easy setup** - Simple URL-based overlay generation
- **Professional styling** - Clean, modern chat appearance

## 🚀 Quick Start (for local only)

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Kick account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/nickolasdaniel/Chattescu.git
cd Chattescu
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

3. **Start the development servers**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

4. **Access the application**
- Main interface: `http://localhost:3000`
- Overlay URL: `http://localhost:3000/overlay/{channel_name}`

## 🎯 Usage

### For Streamers

1. **Generate Overlay URL**
   - Enter your Kick channel name
   - Copy the generated overlay URL
   - Add as Browser Source in OBS

2. **OBS Setup**
   - Add Browser Source
   - Paste the overlay URL
   - Set width: 400px, height: 600px
   - Enable "Shutdown source when not visible"

### For Developers

The project consists of two main parts:

- **Frontend** (`/frontend`) - React TypeScript application
- **Backend** (`/backend`) - Node.js WebSocket server

## 🏗️ Architecture

```
Chattescu/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services & caching
│   │   └── types/           # TypeScript definitions
│   └── public/              # Static assets
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/     # WebSocket controllers
│   │   ├── services/        # Business logic
│   │   └── types/          # TypeScript definitions
│   └── dist/               # Compiled JavaScript
└── README.md
```

## 🎨 7TV Integration

### Supported Cosmetics
- **Paints** - Linear and radial gradients
- **Badges** - Custom 7TV user badges
- **Color accuracy** - Proper BGRA to RGB conversion

### Caching System
- **In-memory cache** - Fast access to frequently used cosmetics
- **TTL support** - Automatic cache expiration
- **Performance optimized** - Reduces API calls by 90%+

## 🔧 Configuration

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Backend (.env)**
```env
PORT=3001
KICK_API_URL=https://kick.com/api
```

**Frontend (.env)**
```env
REACT_APP_WS_URL=ws://localhost:3001
```

## 📱 API Endpoints

### WebSocket Events
- `channelConnected` - Channel connection established
- `message` - New chat message received
- `badgeData` - Subscriber badge information
- `seventvCosmetics` - 7TV cosmetics data

### REST Endpoints
- `GET /api/channel/:name` - Get channel information
- `GET /api/badges/:channel` - Get subscriber badges

## 🛠️ Development

### Available Scripts

**Frontend**
```bash
npm start          # Start development server
npm run build      # Build for production
npm run test       # Run tests
npm run lint       # Run ESLint
```

**Backend**
```bash
npm run dev        # Start with nodemon
npm run build      # Compile TypeScript
npm start          # Start production server
```

### Code Structure

- **Components** - Reusable React components
- **Services** - API integration and caching
- **Types** - TypeScript type definitions
- **Styles** - CSS modules for styling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **7TV** - For the amazing cosmetics API
- **Kick** - For the streaming platform
- **React & TypeScript** - For the robust frontend framework
- **Node.js** - For the powerful backend runtime

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/nickolasdaniel/Chattescu/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

**Made with ❤️ for the Kick streaming community**

*Star ⭐ this repository if you find it helpful!*

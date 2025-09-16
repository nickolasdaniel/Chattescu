# Chattescu Deployment Guide

## Environment Setup

### Frontend Environment Variables

For **Vercel deployment**, set these environment variables in your Vercel dashboard:

```
REACT_APP_BACKEND_URL=https://your-backend-app.railway.app
```

### Backend Environment Variables

For **Railway deployment**, these are automatically set:
- `PORT` - Automatically provided by Railway
- `NODE_ENV=production` - Set by Railway

### Local Development

Create these files locally (they're gitignored):

**frontend/.env.development:**
```
REACT_APP_BACKEND_URL=http://localhost:3001
```

**backend/.env.development:**
```
PORT=3001
NODE_ENV=development
```

## Deployment Steps

### 1. Deploy Backend to Railway
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repo
3. Select `backend` folder
4. Railway auto-deploys!
5. Copy the generated URL (e.g., `https://chattescu-backend-production.railway.app`)

### 2. Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Connect GitHub repo
3. Set root directory to `frontend`
4. Add environment variable: `REACT_APP_BACKEND_URL` = Railway URL from step 1
5. Deploy!

### 3. Your Production URLs
- **Main App**: `https://chattescu.vercel.app`
- **Overlay**: `https://chattescu.vercel.app/overlay/{channelname}`

## Features
- ✅ Multi-channel support
- ✅ 7TV emotes integration
- ✅ Custom subscriber badges
- ✅ Real-time chat overlay
- ✅ Auto-reconnection
- ✅ Environment-based configuration

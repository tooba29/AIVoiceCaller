# AI Voice Caller - Deployment Guide

A full-stack SaaS application for AI-powered voice calling campaigns with React frontend, Express.js backend, and PostgreSQL database.

## 🚀 Deployment Options

### Option 1: Railway (Recommended)
Railway provides easy deployment with built-in PostgreSQL and is perfect for full-stack applications.

### Option 2: Render.com
Free tier available with PostgreSQL support.

### Option 3: Heroku
Classic platform with PostgreSQL add-on.

---

## 📋 Prerequisites

- PostgreSQL database (hosted or cloud)
- ElevenLabs API account
- Twilio account
- Node.js 18+ environment

---

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key"
SESSION_SECRET="your-super-secure-session-secret"

# ElevenLabs AI
ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Server Configuration
PORT=3000
NODE_ENV=production

# CORS (for production)
FRONTEND_URL="https://your-frontend-domain.com"
```

---

## 🚄 Railway Deployment (Step-by-Step)

### 1. **Prepare Your Repository**
```bash
# Ensure your code is committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 2. **Deploy to Railway**
1. Go to [Railway.app](https://railway.app)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your AI Voice Caller repository

### 3. **Add PostgreSQL Database**
1. In your Railway project dashboard
2. Click "+ New Service"
3. Select "Database" → "PostgreSQL"
4. Railway will automatically provide the `DATABASE_URL`

### 4. **Configure Environment Variables**
In your Railway project settings, add all the environment variables from above.

### 5. **Custom Start Command**
In Railway settings, set the start command:
```bash
npm run build && npm start
```

### 6. **Domain Setup**
1. Railway provides a free `.railway.app` domain
2. Or add your custom domain in settings

---

## 🎨 Render.com Deployment

### 1. **Create Web Service**
1. Go to [Render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New" → "Web Service"
4. Connect your repository

### 2. **Configure Service**
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment**: Node.js

### 3. **Add PostgreSQL**
1. Create new PostgreSQL database in Render
2. Copy the connection string to `DATABASE_URL`

### 4. **Set Environment Variables**
Add all required environment variables in the Render dashboard.

---

## ⚡ Heroku Deployment

### 1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

### 2. **Create Heroku App**
```bash
heroku create your-app-name
```

### 3. **Add PostgreSQL**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

### 4. **Set Environment Variables**
```bash
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set ELEVENLABS_API_KEY="your-elevenlabs-key"
heroku config:set TWILIO_ACCOUNT_SID="your-twilio-sid"
# ... add all other env vars
```

### 5. **Deploy**
```bash
git push heroku main
```

---

## 🗃️ Database Setup

### 1. **Run Migrations**
After deployment, run database migrations:

```bash
# For Railway/Render (using their terminal/console)
npm run db:migrate

# For Heroku
heroku run npm run db:migrate
```

### 2. **Seed Default Data** (Optional)
```bash
npm run db:seed
```

---

## 🔍 Health Checks

### 1. **Backend Health Check**
Your app should respond at: `https://your-app.com/api/health`

### 2. **Database Connection**
Check if PostgreSQL is connected properly.

### 3. **External APIs**
Verify ElevenLabs and Twilio integration.

---

## 🛠️ Build Process

The application uses a two-step build process:

1. **Frontend Build**: `npm run build:client`
   - Builds React app to `dist/public`
   - Handles static assets and routing

2. **Backend Build**: `npm run build:server`
   - Compiles TypeScript server to `dist/server`
   - Includes API routes and WebSocket handlers

---

## 📱 Features Included

✅ **User Authentication** (JWT + Sessions)  
✅ **Campaign Management** (Create, Edit, Delete)  
✅ **Lead Management** (CSV Upload)  
✅ **Voice Cloning** (ElevenLabs)  
✅ **Real-time Calling** (Twilio + WebSocket)  
✅ **Audio Conversations** (Play/Download)  
✅ **Test Calls Section** (NEW!)  
✅ **Dashboard Analytics** (Real-time Stats)  
✅ **Knowledge Base** (PDF Upload & Training)  
✅ **Light Theme UI** (Modern Design)  

---

## 🎯 Post-Deployment Checklist

- [ ] Database connected and migrated
- [ ] Environment variables set correctly
- [ ] ElevenLabs API working
- [ ] Twilio webhook URLs configured
- [ ] Frontend routing working
- [ ] WebSocket connections established
- [ ] File uploads functioning
- [ ] Audio playback working
- [ ] Test call functionality verified

---

## 🆘 Troubleshooting

### Common Issues:

**1. Database Connection Errors**
- Verify `DATABASE_URL` format
- Check database credentials
- Ensure database exists

**2. ElevenLabs API Errors**
- Verify API key is valid
- Check rate limits
- Ensure sufficient credits

**3. Twilio Issues**
- Verify webhook URLs point to your domain
- Check account SID and auth token
- Ensure phone number is verified

**4. Build Failures**
- Check Node.js version (18+)
- Verify all dependencies installed
- Review build logs for errors

---

## 📞 Support

If you encounter issues during deployment, check the application logs and verify all environment variables are set correctly.

---

**🎉 Your AI Voice Caller application is now deployed and ready to handle voice campaigns!** 
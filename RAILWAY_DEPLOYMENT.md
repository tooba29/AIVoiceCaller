# Railway Deployment Guide

## 🚀 Quick Deploy Steps

### 1. Prerequisites
- Push your code to GitHub
- Create a Railway account at https://railway.app

### 2. Railway Setup
1. **Create New Project** in Railway
2. **Connect GitHub Repository**
3. **Add PostgreSQL Database Service**
4. **Set Environment Variables** (see below)

### 3. Environment Variables to Set in Railway

**Required Variables:**
```
NODE_ENV=production
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
SESSION_SECRET=your_secure_session_secret_here
```

**Note:** Replace the placeholder values above with your actual API keys and credentials.

**Automatically Provided by Railway:**
- `DATABASE_URL` (from PostgreSQL service)
- `PORT` (Railway sets this automatically)
- `RAILWAY_PUBLIC_DOMAIN` (your app's URL)

### 4. Database Setup
1. Railway will automatically create the PostgreSQL database
2. The `DATABASE_URL` will be automatically connected
3. Your app will run migrations on startup

### 5. Deploy
1. Railway will automatically build using the `Dockerfile`
2. The build process will:
   - Install dependencies
   - Build the client (React/Vite)
   - Build the server (TypeScript)
   - Start the application

### 6. Verify Deployment
- Check Railway logs for any errors
- Visit your app URL (Railway will provide this)
- Test the voice calling functionality

## 🔧 Files Created/Modified

### New Files:
- `Dockerfile` - Docker configuration for Railway
- `railway.json` - Railway deployment settings
- `.dockerignore` - Exclude unnecessary files from build
- `RAILWAY_DEPLOYMENT.md` - This guide

### Modified Files:
- `server/index.ts` - Updated port binding for Railway
- `.env` - Updated for Railway environment variables

## 🚨 Common Issues & Solutions

### Build Fails
- Check that all environment variables are set
- Verify the Dockerfile syntax
- Check Railway build logs

### Database Connection Issues
- Ensure PostgreSQL service is running
- Verify DATABASE_URL is automatically set
- Check database migrations

### Port Binding Issues
- Railway requires binding to `0.0.0.0`
- Use `process.env.PORT` for port configuration

### Environment Variables Missing
- Double-check all required variables are set in Railway
- Sensitive data should be in Railway environment variables, not in code

## 📞 Support
If you encounter issues:
1. Check Railway logs
2. Verify all environment variables
3. Ensure PostgreSQL service is connected
4. Check the GitHub repository is properly connected

## 🎉 Success!
Once deployed, your AI Voice Caller will be available at your Railway-provided URL and ready to make calls! 
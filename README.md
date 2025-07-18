# AI Voice Caller - Full Stack SaaS Application

A comprehensive SaaS application for AI-powered voice calling campaigns with React frontend, Express.js backend, and PostgreSQL database.

## 🚀 Features

- **Campaign Management**: Create, edit, and manage voice campaigns
- **AI Voice Integration**: ElevenLabs AI for realistic voice generation
- **Lead Management**: Upload leads via CSV and track call progress
- **Real-time Analytics**: Monitor campaign performance and statistics
- **Voice Cloning**: Clone voices by uploading voice samples
- **Knowledge Base**: Upload PDFs to provide AI context
- **Twilio Integration**: Automated outbound calling

## 📋 Prerequisites

- **Node.js 18+** environment
- **PostgreSQL database** (hosted or cloud)
- **ElevenLabs API account** for voice generation
- **Twilio account** for outbound calling
- **Git repository** (GitHub recommended)

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
SESSION_SECRET="your-super-secure-session-secret"

# ElevenLabs AI
ELEVENLABS_API_KEY="your-elevenlabs-api-key"
ELEVENLABS_AGENT_ID="your-elevenlabs-agent-id"

# Twilio
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"  
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Server Configuration
PORT=5000
NODE_ENV=production
```

## 🚀 Deployment Guide

### Railway (Recommended)

Railway provides easy deployment with built-in PostgreSQL and is perfect for full-stack applications.

#### Quick Deploy Steps:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create Railway Project**
   - Go to [Railway](https://railway.app)
   - Click "Start a New Project"
   - Connect your GitHub repository

3. **Add PostgreSQL Database**
   - In Railway dashboard, click "Add Service"
   - Select "PostgreSQL"
   - Railway will automatically provide `DATABASE_URL`

4. **Set Environment Variables**
   In Railway dashboard, go to Variables and add:
   ```
   NODE_ENV=production
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   SESSION_SECRET=your_secure_session_secret
   ```

5. **Deploy**
   - Railway will automatically build using the `Dockerfile`
   - Monitor deployment in Railway logs
   - Your app will be available at the provided Railway URL

#### Railway Features Configured:
- ✅ Docker-based deployment with Alpine Linux
- ✅ Automatic PostgreSQL integration
- ✅ Environment variable management
- ✅ SSL/HTTPS enabled by default
- ✅ Automatic domain assignment
- ✅ Build optimization with layer caching

### Alternative Deployment Options

#### Render.com
- Free tier available with PostgreSQL support
- Similar setup to Railway
- Connect GitHub repository and add environment variables

#### Heroku
- Classic platform with PostgreSQL add-on
- Requires Heroku CLI for deployment
- Add PostgreSQL addon and configure environment variables

## 🛠️ Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd AIVoiceCaller
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

```
AIVoiceCaller/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Route pages
│   │   ├── hooks/          # Custom hooks
│   │   └── lib/            # Utilities
├── server/                 # Express backend
│   ├── auth.ts            # Authentication logic
│   ├── auth-routes.ts     # Auth endpoints
│   ├── routes.ts          # API endpoints
│   ├── storage.ts         # Database operations
│   └── index.ts           # Server entry point
├── shared/                 # Shared types/schemas
├── drizzle/               # Database migrations
├── Dockerfile             # Container configuration
├── railway.json           # Railway deployment config
└── package.json           # Dependencies and scripts
```

## 🔐 Security Features

- **Session-based authentication** with PostgreSQL store
- **Password hashing** with bcrypt
- **CSRF protection** with SameSite cookies
- **Environment variable encryption** in production
- **Input validation** with Zod schemas
- **SQL injection prevention** with parameterized queries

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### Leads & Calls
- `POST /api/upload-csv` - Upload leads via CSV
- `GET /api/campaigns/:id/leads` - Get campaign leads
- `POST /api/make-outbound-call` - Make test call
- `POST /api/start-campaign` - Start campaign

### Voice Management
- `GET /api/voices` - Get available voices
- `POST /api/clone-voice` - Clone voice from audio
- `GET /api/voice-preview/:id` - Preview voice

## 🔧 Build Process

The application uses Docker for deployment:

1. **Build Stage**:
   - Install Node.js dependencies
   - Build React frontend with Vite
   - Compile TypeScript backend
   - Optimize for production

2. **Runtime Stage**:
   - Serve static files from `dist/public`
   - Run Express server on port 5000
   - Handle API routes and WebSocket connections

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema
- `npm run db:generate` - Generate migrations
- `npm run db:studio` - Open database studio

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**: Check that all environment variables are set
2. **Database Connection**: Verify DATABASE_URL is correct
3. **API Errors**: Check server logs for detailed error messages
4. **Voice Issues**: Verify ElevenLabs API key and agent ID
5. **Call Issues**: Check Twilio credentials and phone number format

### Deployment Logs:
Monitor Railway logs for real-time deployment status and error messages.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

## 🚨 Important Notes

- **Environment Variables**: Never commit `.env` files to version control
- **API Keys**: Keep all API keys secure and rotate them regularly
- **Database**: Ensure PostgreSQL is properly configured and accessible
- **Monitoring**: Set up proper logging and monitoring in production
- **Backups**: Implement regular database backups for production data

For support or questions, please create an issue in the GitHub repository. 
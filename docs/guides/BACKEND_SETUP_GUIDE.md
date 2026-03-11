# ChatApp Backend Development Setup Guide

This guide will help you set up and run the ChatApp backend API server for development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher) - **Required for this monorepo**
- **MongoDB** (v5.0 or higher) - For primary database
- **Redis** (v6.0 or higher) - For caching and sessions (optional)
- **Git**

## Architecture Overview

The backend is built with:

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis (optional, graceful fallback)
- **Real-time**: Socket.io for WebSocket connections
- **Authentication**: JWT tokens with bcryptjs
- **File Upload**: Multer for handling file uploads
- **Security**: Helmet, CORS, rate limiting
- **Monitoring**: Sentry for error tracking
- **Validation**: Zod for runtime validation

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts    # MongoDB connection
│   │   └── redis.ts        # Redis connection
│   ├── controllers/        # Route controllers
│   ├── middlewares/        # Express middlewares
│   ├── models/            # Mongoose models
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── Dockerfile
```

## Setup Instructions

### 1. Install Dependencies

**From the project root**, install all workspace dependencies:

```bash
cd chatapp
pnpm install
```

This will install backend dependencies automatically.

### 2. Environment Configuration

Create environment file for the backend:

```bash
cd chatapp/backend
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
MONGO_URI=mongodb://localhost:27017/chatapp

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# CORS Configuration
CLIENT_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_PATH=./uploads

# Sentry Configuration (optional)
SENTRY_DSN=your-sentry-dsn-here

# Supabase Configuration (optional)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Setup

#### MongoDB (Required)

**Option 1: Local MongoDB**
```bash
# Install MongoDB locally
# On macOS with Homebrew:
brew install mongodb-community

# On Ubuntu:
sudo apt-get install mongodb

# On Windows: Download and install from mongodb.com

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod              # Linux
```

**Option 2: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free cluster
3. Get connection string
4. Update `MONGO_URI` in `.env`

#### Redis (Optional but Recommended)

**Option 1: Local Redis**
```bash
# Install Redis locally
# On macOS with Homebrew:
brew install redis

# On Ubuntu:
sudo apt-get install redis-server

# On Windows: Use WSL or Docker

# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

**Option 2: Redis Cloud**
1. Create account at [Redis Cloud](https://redis.com/try-free/)
2. Get connection string
3. Update `REDIS_URL` in `.env`

### 4. Start Development Server

Run the backend development server:

```bash
# From project root
pnpm --filter backend dev

# Or navigate to backend directory
cd chatapp/backend && pnpm dev
```

The server will start at: **http://localhost:4000**

## Available Scripts

Here are the main pnpm scripts available:

### Development
- `pnpm --filter backend dev` - Start development server with hot reload
- `pnpm --filter backend build` - Compile TypeScript to JavaScript
- `pnpm --filter backend start` - Start production server

### Quality Assurance
- `pnpm --filter backend test` - Run Jest tests
- `pnpm --filter backend lint` - Run ESLint for code quality

## Development Features

When running in development mode, you get:

- **Hot Reload**: TypeScript changes auto-restart server
- **Source Maps**: Easy debugging with proper stack traces
- **Detailed Logging**: Comprehensive console output
- **Error Handling**: Graceful error handling with Sentry
- **Auto-restart**: Server restarts on file changes

## API Endpoints

The backend provides these main endpoint categories:

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/avatar` - Upload avatar

### Chat
- `GET /api/chat/rooms` - Get chat rooms
- `POST /api/chat/rooms` - Create chat room
- `GET /api/chat/messages/:roomId` - Get room messages
- `POST /api/chat/messages` - Send message

### Groups
- `GET /api/groups` - Get user groups
- `POST /api/groups` - Create group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group

## WebSocket Events

Real-time communication via Socket.io:

### Client Events
- `join_room` - Join a chat room
- `leave_room` - Leave a chat room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server Events
- `message_received` - New message received
- `user_joined` - User joined room
- `user_left` - User left room
- `typing_indicator` - User typing status
- `user_status` - User online/offline status

## Troubleshooting

### Common Issues

**Port 4000 already in use:**
```bash
# Kill existing process
npx kill-port 4000

# Or use different port
PORT=4001 pnpm dev
```

**MongoDB connection failed:**
```bash
# Check MongoDB is running
brew services list | grep mongodb  # macOS
sudo systemctl status mongod        # Linux

# Check connection string
mongosh "mongodb://localhost:27017/chatapp"
```

**Redis connection failed:**
```bash
# Check Redis is running
brew services list | grep redis  # macOS
sudo systemctl status redis       # Linux

# Test connection
redis-cli ping
```

**TypeScript compilation errors:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Clear and reinstall
rm -rf node_modules dist
pnpm install
```

**Environment variables not found:**
```bash
# Verify .env file exists
ls -la .env

# Check required variables
grep -E "^(MONGO_URI|JWT_SECRET)" .env
```

### Development Tips

1. **Database first** - Ensure MongoDB is running before starting server
2. **Environment check** - Verify all required env variables are set
3. **Use MongoDB Compass** - GUI tool for database management
4. **Check logs** - Monitor console for connection status
5. **Test endpoints** - Use Postman or curl for API testing

## Production Deployment

For production deployment:

```bash
# Build TypeScript
pnpm --filter backend build

# Start production server
pnpm --filter backend start

# Or with PM2 (recommended)
pm2 start dist/server.js --name chatapp-backend
```

## Testing

Run tests to ensure everything works:

```bash
# Run all tests
pnpm --filter backend test

# Run tests in watch mode
pnpm --filter backend test --watch

# Run tests with coverage
pnpm --filter backend test --coverage
```

## Next Steps

Once the backend server is running:

1. **Test health endpoint**: `GET http://localhost:4000/api/health`
2. **Test database connection**: Check console logs
3. **Test WebSocket**: Connect with Socket.io client
4. **Start frontend**: Run web application to test integration
5. **Review API documentation**: Test all endpoints

## Security Considerations

- **JWT secrets**: Use strong, unique secrets
- **Environment variables**: Never commit `.env` files
- **Database security**: Use authentication in production
- **Rate limiting**: Already configured with express-rate-limit
- **Input validation**: All inputs validated with Zod
- **HTTPS**: Use HTTPS in production

## Need Help?

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review the server console logs
3. Verify database connections
4. Check environment variables
5. Ensure all dependencies are installed

Happy coding! 🚀

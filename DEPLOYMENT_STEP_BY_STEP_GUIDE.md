# 🚀 Complete Production & Step-by-Step Manual Deployment Guide

This document contains complete step-by-step instructions for hosting and deploying the **Multi-Community B2B Platform Monorepo**:
1. **Part 1: Detailed Manual Steps for API (`apps/api`)**
2. **Part 2: Detailed Manual Steps for Web (`apps/web`)**
3. **Part 3: VPS Production Hosting Guide (Ubuntu + Nginx + SSL + PM2)**
4. **Part 4: Manual Local Machine Hosting (Windows & Linux)**
5. **Part 5: Manual Local Android APK Compilation (Offline Gradle Build)**

---

# 🛠️ PART 1: Detailed Manual Step-by-Step Guide for API (`apps/api`)

Follow these manual steps to set up, build, and run the Backend REST API & Real-Time Socket.IO Server manually:

### Step 1.1: Open Terminal & Navigate to API Directory
```bash
# On Linux/macOS or Windows PowerShell:
cd apps/api
```

### Step 1.2: Manually Create the API Environment File (`.env`)
Create a file named `.env` inside `apps/api/`:

*On Linux/Ubuntu:*
```bash
nano .env
```
*On Windows (PowerShell/Notepad):*
```powershell
New-Item -ItemType File -Name .env -Force
notepad .env
```

Paste the following environment variables:
```env
# Server Port
PORT=5000

# Environment Mode: 'development' or 'production'
NODE_ENV=production

# Database Connection (Points to PostgreSQL database)
DATABASE_URL="postgresql://b2b_user:YourSecurePassword123!@localhost:5432/b2b_platform_db?schema=public"

# JWT Token Signing Secret Key (Minimum 32 characters)
JWT_SECRET="YourSuperSecretJWTSigningKey64CharsLongHere1234567890!"

# Redis Server URL (Optional: Falls back to in-memory mode if Redis is not running)
REDIS_URL="redis://localhost:6379"

# Frontend Web Application URL
CLIENT_URL="http://localhost:3000"

# Primary Super Admin Account Email
PRIMARY_ADMIN_EMAIL="dnpatel2002@gmail.com"
```

### Step 1.3: Manually Install API Dependencies
```bash
npm install
```

### Step 1.4: Manually Build the Database Client & API TypeScript Code
```bash
# 1. Generate Prisma Database Client
cd ../../packages/database
npx prisma generate
npm run build

# 2. Return to API directory and build TypeScript code
cd ../../apps/api
npm run build
```
*This compiles the TypeScript code from `src/` into JavaScript in the `dist/` directory.*

### Step 1.5: Manually Start the API Server

#### Option A: Start in Development Mode (with Live Reloading)
```bash
npm run dev
```

#### Option B: Start in Production Mode (Direct Node execution)
```bash
node dist/server.js
```

### Step 1.6: Manually Test API Health Endpoint
Open your browser or terminal and test:
```bash
curl http://localhost:5000/api/v1/health
```
**Expected Response:**
```json
{"status":"OK","system":"Multi-Community B2B Platform API Engine","database":"CONNECTED","version":"2.5.0"}
```

---

# 💻 PART 2: Detailed Manual Step-by-Step Guide for Web (`apps/web`)

Follow these manual steps to set up, build, and run the Next.js Web Frontend Application manually:

### Step 2.1: Open Terminal & Navigate to Web Directory
```bash
cd apps/web
```

### Step 2.2: Manually Create the Web Environment File (`.env.local`)
Create a file named `.env.local` inside `apps/web/`:

*On Linux/Ubuntu:*
```bash
nano .env.local
```
*On Windows (PowerShell/Notepad):*
```powershell
New-Item -ItemType File -Name .env.local -Force
notepad .env.local
```

Paste the following configuration:
```env
# URL pointing to the Backend REST API
NEXT_PUBLIC_API_BASE_URL="http://localhost:5000/api/v1"

# URL pointing to the Backend Socket.IO Server
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"

# Node Environment
NODE_ENV=production
```

### Step 2.3: Manually Clean Previous Build Cache (Optional)
If you encounter chunk load or cache errors, clear the `.next` directory:
```bash
# On Windows (PowerShell):
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# On Linux/macOS:
rm -rf .next
```

### Step 2.4: Manually Install Web Dependencies
```bash
npm install
```

### Step 2.5: Manually Build & Start the Web Application

#### Option A: Development Mode (Hot Module Replacement)
```bash
npm run dev
```
*Access Web App at: `http://localhost:3000`*

#### Option B: Production Build & Production Server Execution
```bash
# 1. Compile Next.js production build
npm run build

# 2. Start Next.js production server
npm run start -p 3000
```
*Access Production Web App at: `http://localhost:3000`*

---

# 🌐 PART 3: VPS Production Hosting (Ubuntu + Nginx + SSL + PM2)

## 📋 Step 3.1: Server Setup & Dependencies
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx redis-server postgresql postgresql-contrib

# Install Node.js 20 LTS & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 🗄️ Step 3.2: PostgreSQL Database Creation
```bash
sudo -u postgres psql
```
SQL commands:
```sql
CREATE USER b2b_user WITH PASSWORD 'YourSecurePassword123!';
CREATE DATABASE b2b_platform_db OWNER b2b_user;
GRANT ALL PRIVILEGES ON DATABASE b2b_platform_db TO b2b_user;
\q
```

## ⚙️ Step 3.3: Production Deployment Commands
```bash
# 1. Clone Monorepo
cd /var/www
sudo git clone https://github.com/YOUR_GITHUB_REPO/1st.git b2b-platform
sudo chown -R $USER:$USER /var/www/b2b-platform
cd /var/www/b2b-platform

# 2. Install Monorepo Packages
npm install

# 3. Migrate Database Schema
cd packages/database
npx prisma db push --accept-data-loss
npx prisma generate
npm run build

# 4. Build API & Web
cd ../../apps/api && npm run build
cd ../web && npm run build
cd ../..

# 5. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 🌐 Step 3.4: Nginx Proxy & SSL Certificate
```bash
sudo nano /etc/nginx/sites-available/b2b-platform
```
Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 100M;

    location /uploads/ { alias /var/www/b2b-platform/apps/api/uploads/; }
    location /api/ { proxy_pass http://127.0.0.1:5000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection 'upgrade'; proxy_set_header Host $host; }
    location /socket.io/ { proxy_pass http://127.0.0.1:5000/socket.io/; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "Upgrade"; proxy_set_header Host $host; }
    location / { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection 'upgrade'; proxy_set_header Host $host; }
}
```
## 🎙️ Step 3.5: Self-Hosted LiveKit SFU Server Setup (Docker + Nginx SSL)

Follow these steps to host LiveKit SFU on your Ubuntu VPS for voice and video calling:

### 1. Install Docker on VPS (if not installed)
```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker
```

### 2. Run LiveKit SFU Container
```bash
sudo docker run -d --name livekit-server \
  --restart unless-stopped \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 50000-60000:50000-60000/udp \
  livekit/livekit-server:latest \
  --keys "devkey: secret1234567890supersecretkey64chars"
```

### 3. Configure UFW VPS Firewall Ports
```bash
sudo ufw allow 7880/tcp
sudo ufw allow 7881/tcp
sudo ufw allow 50000:60000/udp
```

### 4. Add LiveKit Subdomain to Nginx (`/etc/nginx/sites-available/livekit`)
```nginx
server {
    listen 80;
    server_name rtc.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 5. Enable Nginx & Generate SSL Certificate
```bash
sudo ln -s /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d rtc.yourdomain.com
```

### 6. Update Environment Files (`apps/api/.env` & `apps/web/.env.local`)
```env
# apps/api/.env
LIVEKIT_URL="wss://rtc.yourdomain.com"
LIVEKIT_API_KEY="devkey"
LIVEKIT_API_SECRET="secret1234567890supersecretkey64chars"

# apps/web/.env.local
NEXT_PUBLIC_LIVEKIT_URL="wss://rtc.yourdomain.com"
```

---


# 📱 PART 4: Manual Offline Android APK Build (Local Gradle Build)

```bash
cd apps/mobile

# 1. Update API URL in src/store/api/baseApi.ts
# export const API_BASE_URL = 'https://yourdomain.com/api/v1';

# 2. Prebuild Native Android Folder
npx expo prebuild --platform android

# 3. Build Release APK via Gradle
cd android
.\gradlew.bat assembleRelease   # Windows
# ./gradlew assembleRelease     # Linux/macOS

# 4. APK File Location:
# apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🛠️ Quick Command Cheat Sheet & Troubleshooting

### ❓ Fixing VPS Error: `@prisma/client did not initialize yet`
If you encounter this error on your VPS server (`Error: @prisma/client did not initialize yet`):

1. **SSH to VPS and navigate to Database Package**:
   ```bash
   cd /home/radheytechsolutions-communityapi/htdocs/communityapi.radheytechsolutions.com/packages/database
   ```
2. **Run Prisma Generate and Build**:
   ```bash
   npx prisma generate
   npm run build
   ```
3. **Restart your PM2 process / API service**:
   ```bash
   pm2 restart b2b-api  # or pm2 restart all
   ```

---

| Service | Task | Command |
| :--- | :--- | :--- |
| **API** | Development Mode | `cd apps/api && npm run dev` |
| **API** | Production Start | `cd apps/api && node dist/server.js` |
| **Web** | Development Mode | `cd apps/web && npm run dev` |
| **Web** | Production Build & Start | `cd apps/web && npm run build && npm run start -p 3000` |
| **Database** | Generate Client | `cd packages/database && npx prisma generate && npm run build` |
| **Database** | Push Schema | `cd packages/database && npx prisma db push` |
| **Database** | Open Studio UI | `cd packages/database && npx prisma studio` |


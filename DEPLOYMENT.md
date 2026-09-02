# OmniBug Enterprise — Production Deployment Guide

This guide provides step-by-step instructions for deploying **OmniBug Enterprise** to production using Docker, Cloud Platforms (Railway / Render / AWS), or a Linux VPS.

---

## 🚀 Option 1: One-Click Docker Compose Deployment (Recommended)

### Prerequisites:
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/) installed on your server.

### Steps:
1. **Clone the repository on your server**:
   ```bash
   git clone <your-repo-url> omnibug
   cd omnibug
   ```

2. **Start all services in background mode**:
   ```bash
   docker compose up --build -d
   ```

3. **Verify running containers**:
   ```bash
   docker compose ps
   ```

4. **Access the application**:
   - **Frontend UI**: `http://<your-server-ip>`
   - **Backend API Docs**: `http://<your-server-ip>:8000/docs`
   - **MongoDB**: `localhost:27017`

---

## ☁️ Option 2: Cloud Platform Deployment (Render / Railway / Fly.io)

### 1. MongoDB Atlas Setup:
1. Create a free/production cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and get your connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/omnibug_db?retryWrites=true&w=majority
   ```

### 2. Backend Deployment (FastAPI):
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  | Variable | Value |
  |---|---|
  | `MONGO_URI` | `mongodb+srv://<user>:<password>@cluster0...` |
  | `SECRET_KEY` | `<generate-a-strong-random-secret-key>` |
  | `FRONTEND_URL` | `https://your-frontend-domain.com` |

### 3. Frontend Deployment (Vite / Vercel / Netlify):
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  | Variable | Value |
  |---|---|
  | `VITE_API_BASE_URL` | `https://your-backend-api.com/api` |
  | `VITE_WS_BASE_URL` | `wss://your-backend-api.com/ws/collaboration` |

---

## 🔐 Environment Variables Reference

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URI` | `mongodb://localhost:27017/omnibug_db` | MongoDB Database Connection String |
| `SECRET_KEY` | `omnibug_production_secret_jwt_key_2026` | Cryptographic JWT signing key |
| `ALGORITHM` | `HS256` | JWT Token Algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `10080` (7 Days) | Session duration |

---

## 🛡️ Production Verification Checklist
- [x] Passwords securely hashed with `bcrypt` / `PBKDF2`.
- [x] JWT Bearer token authentication on all mutation routes.
- [x] 6-digit email verification code with OTP expiration.
- [x] Real-time WebSockets with automatic client reconnects.
- [x] High-contrast, WCAG 2.1 AA compliant enterprise UI.

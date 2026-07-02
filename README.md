# CRMS — Docker Deployment Guide

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

---

## Quick Start (Local Machine)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd VisionForge-UOM23

# 2. Copy the env file
cp .env.example .env

# 3. Start everything with one command
docker-compose up -d

# 4. Open the app
#    Frontend  → http://localhost:3000
#    Backend   → http://localhost:8080
```

---

## Deploy on a Server (VPS / Cloud)

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone the repo
git clone <your-repo-url>
cd VisionForge-UOM23

# 3. Copy and edit the env file
cp .env.example .env
nano .env   # or vi .env

# 4. IMPORTANT: Change NEXT_PUBLIC_API_URL to your server's public IP
#    Example:
#    NEXT_PUBLIC_API_URL=http://123.45.67.89:8080

# 5. Build and start
docker-compose up -d --build
```

---

## Useful Commands

| Command | Description |
|---|---|
| `docker-compose up -d` | Start all services in background |
| `docker-compose up -d --build` | Rebuild images and start |
| `docker-compose down` | Stop all services |
| `docker-compose logs -f` | Follow live logs |
| `docker-compose logs backend` | Backend logs only |
| `docker-compose logs frontend` | Frontend logs only |
| `docker-compose ps` | Check service status |
| `docker-compose restart backend` | Restart backend only |

---

## Project Structure

```
VisionForge-UOM23/
├── docker-compose.yml          ← Root orchestration file
├── .env.example                ← Copy to .env with your values
├── apps/
│   ├── backend/crms/
│   │   ├── Dockerfile          ← Spring Boot (Java 17)
│   │   └── .dockerignore
│   └── frontend/
│       ├── Dockerfile          ← Next.js 15
│       └── .dockerignore
```

---

## Ports

| Service | Port |
|---|---|
| Frontend (Next.js) | `3000` |
| Backend (Spring Boot) | `8080` |

---

## Notes

- MongoDB is hosted on **MongoDB Atlas** (cloud) — no local MongoDB container needed.
- All secrets (DB URI, mail password, etc.) are read from the `.env` file.
- Never commit `.env` to Git — it's already in `.gitignore`.

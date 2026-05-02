🚀 Blitzit Clone

A productivity-focused web application built with React + Vite, featuring task management, habit tracking, website blocking, analytics, and third-party integrations.

🛠 Tech Stack

Frontend: React, Vite, Tailwind CSS

Backend: Node.js, Express

Database: MongoDB
\
# Blitzit Clone — Focus, Tasks, and Habit Performance Platform

A production-ready MERN application for focus-driven productivity. It combines task execution, habit reinforcement, focus tracking, and real-time notifications with a scalable backend and modern React UI. Built for fast iteration, reliable deployments, and long-term growth.

---

## Key Features

- Secure authentication with Clerk JWT validation
- Task scheduling, completion tracking, and time logging
- Daily stats aggregation and focus scoring
- Habit tracking and streak-based progress
- Notifications pipeline and activity logs
- Admin-ready backend structure and audit-friendly models
- Production Docker deployment with Nginx reverse proxy

---

## Tech Stack

- Frontend: React (Vite), Tailwind CSS
- Backend: Node.js, Express, MongoDB (Mongoose)
- Auth: Clerk JWT / Local JWT fallback
- Infra: Docker, Docker Compose, Nginx

---

## Project Structure

```
.
├── src/                        # Frontend React app
├── server/                     # Express backend
├── nginx/                      # Nginx reverse proxy config
├── public/                     # Static assets
├── dist/                       # Vite build output
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
└── .env
```

---

## Local Development

1) Install dependencies

```
npm install
```

2) Create environment file

```
cp .env.example .env
```

3) Start the dev environment

```
npm run dev
```

Frontend runs on Vite’s default port. Backend runs on port 5000.

---

## Docker Deployment (Local)

1) Build and start services

```
docker compose up --build
```

2) Access the app

- Frontend: http://localhost
- Backend: http://localhost:5000

---

## Environment Variables

Create .env with the following keys:

```
NODE_ENV=production
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=your_jwt_secret

VITE_API_URL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Optional Clerk backend validation
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

---

## Production Deployment (VPS + Docker)

1) Provision server
- Ubuntu 22.04 LTS
- Docker + Docker Compose installed

2) Clone repository and configure environment

```
git clone <repo_url>
cd <repo>
cp .env.example .env
```

3) Start services

```
docker compose up -d --build
```

4) Configure DNS and TLS
- Point domain A record to VPS IP
- Add TLS with a reverse proxy (Caddy/Traefik) or terminate at Nginx in a separate edge layer

---

## API Architecture Overview

- Stateless REST API with JWT verification middleware
- Modular routing per resource (tasks, habits, stats, users)
- Mongoose models with indexed access patterns
- Aggregation-friendly DailyStats collection for analytics
- Service layer utilities for score calculation and event-driven notifications

---

## Scalability & Future Growth

- Extract notifications into a dedicated worker service
- Add queueing (BullMQ/RabbitMQ) for async jobs
- Introduce GraphQL or API gateway for multi-client support
- CI/CD with GitHub Actions for build/test/deploy pipelines
- Horizontal scaling behind a load balancer

---

## License

Proprietary — internal or client-facing deployments only.
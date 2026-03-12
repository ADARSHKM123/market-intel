# Market Intel - Market Intelligence Platform

A comprehensive platform for tracking market signals, analyzing opportunities, and processing market intelligence data using automated scraping and NLP-driven insights.

## 🚀 Overview

Market Intel is a multi-service application designed to aggregate data from various sources, process it through an NLP pipeline, and provide actionable insights via a modern dashboard.

### Key Features
- **Signal Tracking:** Monitor market signals in real-time.
- **Opportunity Analysis:** Identify and evaluate potential market opportunities.
- **Automated Processing:** Robust queue-based architecture for scraping and processing data.
- **NLP Insights:** Python-powered FastAPI service for clustering and processing market intelligence.
- **Analytics Dashboard:** Visualize trends and statistics using interactive charts.

## 🛠️ Tech Stack

### Core
- **Architecture:** Microservices-inspired (Backend, Frontend, NLP Service)
- **Database:** PostgreSQL (via Prisma ORM)
- **Queue/Cache:** Redis (via BullMQ)
- **Containerization:** Docker & Docker Compose

### Backend (Node.js/Express)
- **Framework:** Express (ES Modules)
- **ORM:** Prisma
- **Task Queue:** BullMQ
- **Validation:** Zod
- **Logging:** Pino

### Frontend (React/Vite)
- **Framework:** React 18
- **Styling:** Tailwind CSS + Radix UI
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Charts:** Recharts

### NLP Service (Python/FastAPI)
- **Framework:** FastAPI
- **Processing:** Custom NLP logic for clustering and analysis
- **Validation:** Pydantic

## 📂 Project Structure

```text
market-intel/
├── backend/            # Express.js API & Workers
│   ├── prisma/         # Database schema & seeds
│   └── src/            # Controllers, Services, Queues, Workers
├── frontend/           # React + Vite application
│   └── src/            # Components, Hooks, Store, API Client
├── nlp-service/        # Python FastAPI service
│   ├── routes/         # API endpoints
│   └── services/       # NLP logic (clustering, processing)
├── docker-compose.yml  # Docker infrastructure setup
└── package.json        # Root workspace configuration
```

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Docker & Docker Compose
- Redis (if running locally)
- PostgreSQL (if running locally)

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd market-intel
   ```

2. **Run the setup script:**
   This will install dependencies for the root, backend, and frontend, and set up the Python virtual environment for the NLP service.
   ```bash
   npm run setup
   ```

3. **Environment Variables:**
   Copy `.env.example` to `.env` and configure your credentials.
   ```bash
   cp .env.example .env
   ```

4. **Database Migration:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

### Running the Application

#### Development Mode
Start all services (Backend, Frontend, NLP) concurrently:
```bash
npm run dev
```

#### Docker Deployment
To spin up the entire infrastructure (including Redis and PostgreSQL):
```bash
docker-compose up -d
```

## 📜 Available Scripts

- `npm run dev`: Start all services concurrently.
- `npm run setup`: Install all dependencies and setup venv.
- `npm run db:migrate`: Run Prisma migrations.
- `npm run db:seed`: Seed the database.
- `npm run dev:backend`: Start backend only.
- `npm run dev:frontend`: Start frontend only.
- `npm run dev:nlp`: Start NLP service only.

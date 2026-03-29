# Market Intel - Technical Documentation

This document provides a deep dive into the architecture, data flow, and API specifications of the Market Intel platform.

## 🏗️ System Architecture

The project follows a distributed architecture with three primary services:

1.  **Backend (Node.js/Express):** The central hub for API requests, user authentication, and business logic. It manages the database (PostgreSQL) and orchestrates background tasks.
2.  **NLP Service (Python/FastAPI):** A specialized service for heavy-duty text processing, signal clustering, and sentiment analysis.
3.  **Frontend (React):** A modern SPA that provides a dashboard for visualizing signals and managing watches.
4.  **Infrastructure:** Redis is used as the message broker for BullMQ, enabling reliable background job processing.

---

## 🔄 End-to-End Data Flow

The lifecycle of a "Market Signal" typically follows this path:

1.  **Ingestion:** A `Scrape Worker` (or an external API) identifies a potential signal from a source (e.g., News, Twitter, RSS).
2.  **Queueing:** The raw data is pushed into the `SCRAPE` queue via BullMQ.
3.  **NLP Processing:** The `Process Worker` picks up the job and sends the text to the **NLP Service** via the `nlp.service.js` utility. The NLP service returns enriched data (entities, sentiment, keywords).
4.  **Clustering:** Related signals are grouped into "Clusters" via the `Cluster Worker` to identify emerging market trends.
5.  **Persistence:** The enriched and clustered signals are saved to PostgreSQL via Prisma.
6.  **Alerting:** If a signal matches a user's "Watch" criteria, the `Alert Worker` triggers a notification (e.g., Email, In-app).
7.  **Consumption:** The Frontend fetches these signals and trends via the REST API for display on the dashboard.

---

## 🛠️ Backend API Reference

All API routes are prefixed with `/api`. Authentication is handled via JWT in the `Authorization` header.

### 🔐 Authentication (`/api/auth`)
- `POST /register`: Create a new account.
- `POST /login`: Authenticate and receive a JWT.
- `GET /me`: Retrieve current user profile.

### 📡 Sources (`/api/sources`)
- `GET /`: List all configured data sources.
- `POST /`: Add a new source (Admin only).
- `DELETE /:id`: Remove a source.

### 📊 Signals (`/api/signals`)
- `GET /`: List market signals with filtering and pagination.
- `GET /:id`: Detailed view of a specific signal.
- `GET /trending`: Retrieve the most active signal clusters.

### 🎯 Opportunities (`/api/opportunities`)
- `GET /`: List identified market opportunities.
- `PATCH /:id`: Update opportunity status (e.g., "Ignored", "Following").

### 👁️ Watches (`/api/watches`)
- `GET /`: List user's active watches (keywords/filters).
- `POST /`: Create a new watch.

---

## 🧠 NLP Service (FastAPI)

The NLP service exposes two primary endpoints used by the Backend:

- `POST /process`:
    - **Input:** `{ texts: string[] }`
    - **Output:** Enriched metadata including sentiment and named entities.
- `POST /cluster`:
    - **Input:** `{ signals: Signal[] }`
    - **Output:** Grouped signal IDs representing a trend.

---

## ⚙️ Background Workers (BullMQ)

The system uses dedicated workers located in `backend/src/workers/` to handle asynchronous tasks:

| Queue | Worker | Responsibility |
| :--- | :--- | :--- |
| `SCRAPE` | `scrape.worker.js` | Fetches raw data from external sources. |
| `PROCESS` | `process.worker.js` | Enriches data using the NLP Service. |
| `CLUSTER` | `cluster.worker.js` | Groups related signals into trends. |
| `ALERT` | `alert.worker.js` | Matches signals against user watches. |

---

## 🛠️ Extending the Project

### Adding a New API Route
1.  Define the controller in `backend/src/controllers/`.
2.  Add the route to a new file in `backend/src/routes/` or append to an existing one.
3.  Mount the route in `backend/src/routes/index.js`.
4.  (Optional) Add a Zod schema in `backend/src/validators/` for request validation.

### Adding a New NLP Capability
1.  Add a new route in `nlp-service/routes/`.
2.  Implement the logic in `nlp-service/services/`.
3.  Update `backend/src/services/nlp.service.js` to call the new endpoint.

### Modifying the Database
1.  Update `backend/prisma/schema.prisma`.
2.  Run `npm run db:migrate` in the root or `npx prisma migrate dev` in the backend folder.
3.  Generate the client: `npx prisma generate`.

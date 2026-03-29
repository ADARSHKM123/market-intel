# Market Intel - Exhaustive System Flow Documentation

This document provides a granular, step-by-step breakdown of how data flows through the Market Intel platform, from initial discovery to end-user notification.

---

## 1. Data Ingestion & Enrichment Flow (The "Signal" Lifecycle)

### Step 1.1: Triggering (Scheduler)
- **Location:** `backend/src/queues/scheduler.js`
- **Logic:** The `initScheduler()` function uses BullMQ's `upsertJobScheduler` to register recurring jobs.
    - **Hacker News:** Triggers every 3 hours. **YouTube:** Triggers every 6 hours.
    - **Momentum:** Triggers daily at 6 AM.
    - **Clustering:** Triggers daily at 2 AM.

### Step 1.2: Raw Data Scraping (Scrape Worker)
- **Location:** `backend/src/workers/scrape.worker.js`
- **Input:** Source name (e.g., 'hackernews', 'youtube').
- **Action:**
    1. Fetches configuration from the `Source` model.
    2. Executes source-specific scraping logic (Phase 1 uses mocks).
    3. Creates records in the `RawPost` table (PostgreSQL).
    4. Marks posts as `processed: false` initially.
    5. Sends the scraped text to the **NLP Service**.

### Step 1.3: NLP Enrichment (NLP Service Interaction)
- **Location:** `backend/src/services/nlp.service.js` -> `nlp-service/main.py`
- **Action:**
    1. `processTexts()` is called with raw content.
    2. NLP Service performs Named Entity Recognition (NER), Sentiment Analysis, and Keyword Extraction.
    3. Returns enriched signal data.
- **Output:** New records in the `Signal` table, linked back to `RawPost`.

---

## 2. Opportunity Clustering & Trend Analysis

### Step 2.1: Clustering (Cluster Worker)
- **Location:** `backend/src/workers/cluster.worker.js`
- **Logic:**
    1. Fetches all unassigned `Signal` records from the last 24–48 hours.
    2. Sends signal vectors/embeddings to the **NLP Service** (`/cluster` endpoint).
    3. The NLP service groups signals into thematic clusters.
- **Persistence:**
    1. Creates or updates `Opportunity` records.
    2. Creates links in the `SignalOpportunity` join table.

### Step 2.2: Momentum Computation (Process Worker)
- **Location:** `backend/src/workers/process.worker.js`
- **Logic:**
    1. Calculates a "Momentum Score" based on the frequency and growth of mentions for a specific `Opportunity`.
    2. Records a `TrendSnapshot` (Time-series data for the "Trend Chart" on the frontend).
    3. Updates the `momentum` and `score` fields on the `Opportunity` model.

---

## 3. Real-time Alerting Flow

### Step 3.1: Match Checking (Alert Worker)
- **Location:** `backend/src/workers/alert.worker.js`
- **Trigger:** Usually triggered after a new `Signal` is saved or an `Opportunity` is updated.
- **Logic:**
    1. Fetches all active `Watch` records from the database.
    2. Compares the signal/opportunity attributes (keywords, sentiment, category) against the user's watch criteria.
    3. If a match is found, a job is added to the `ALERT` queue.

### Step 3.2: Delivery
- **Action:** Sends a notification (Email, WebSocket, or Push) to the user associated with the `Watch`.

---

## 4. Frontend Consumption Flow

### Step 4.1: Authentication
- **Flow:** User submits credentials -> `auth.controller.js` validates via bcrypt -> Returns JWT -> Stored in `authStore.js` (Zustand).

### Step 4.2: Dashboard Rendering
- **Signals Page:** Calls `GET /api/signals`. Uses React Query to fetch and cache signal data.
- **Trend Chart:** Calls `GET /api/analytics/trends`. Fetches data from the `TrendSnapshot` table to render Recharts graphs.
- **Opportunities:** Calls `GET /api/opportunities`. Displays clustered trends with their momentum scores.

---

## 5. Database Entity Relationship (ER) Summary

| Model | Purpose | Key Relations |
| :--- | :--- | :--- |
| `User` | System users/admins. | Has many `Watches`. |
| `Source` | Config for scrapers (API keys, URLs). | Has many `RawPosts`. |
| `RawPost` | The "Unprocessed" data from a source. | Belongs to `Source`, has many `Signals`. |
| `Signal` | An atomic piece of market intel. | Belongs to `RawPost`, links to `Opportunities`. |
| `Opportunity` | A group of related signals (a Trend). | Links to many `Signals`, has many `TrendSnapshots`. |
| `TrendSnapshot` | Historical score data for an opportunity. | Belongs to `Opportunity`. |
| `Watch` | User-defined alerts/filters. | Belongs to `User`. |

---

## 🛠️ Summary for Developers

1.  **To add a new data source:** Update the `SCRAPE` worker and add the source to the `Source` table.
2.  **To change how trends are calculated:** Modify the `PROCESS` worker's momentum logic.
3.  **To add a new NLP feature:** Add a route to `nlp-service` and a wrapper in `nlp.service.js`.
4.  **To update the UI:** Check `frontend/src/api/client.js` for endpoint definitions.

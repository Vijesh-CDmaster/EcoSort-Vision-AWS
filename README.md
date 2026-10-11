
# EcoSort-Vision

AI-powered waste detection and segregation.

**Stack:**
- **Web app**: Next.js (React) — UI, routes, Clerk authentication.
- **Auth**: [Clerk](https://clerk.com) — sign-in/sign-up, sessions, roles.
- **Database**: PostgreSQL, hosted on [Neon](https://neon.tech) or [Supabase](https://supabase.com) (set `DATABASE_URL`).
- **AI service**: Python (FastAPI + YOLO) — waste detection from camera/upload, and it also exposes the `/db/*` REST API that the app uses to read and write data.

Two parts run at the same time — you will need **two separate terminal windows**:
1.  **The Web App (Next.js)**: the user interface you see in your browser.
2.  **The AI Service (Python)**: a local service that handles waste detection **and** serves as the app's data backend (connected to PostgreSQL).

## Running the Application

### Step 1: Run the Web App (Terminal 1)

This starts the main application.

```bash
# Install dependencies (only need to do this once)
npm install

# Start the web app
npm run dev
```
After this, you can open http://localhost:9002 in your browser. You will see the app, but the AI scanner will show an "Offline" error until you complete Step 2.

### Step 2: Run the AI Service (Terminal 2)

This starts the local Python service that performs the AI waste detection.

**First-Time Setup (Do this only once)**

If this is your first time running the project, you need to set up the Python environment.

1.  **Navigate to the service directory:**
    ```bash
    cd yolo-service
    ```

2.  **Create a Python virtual environment:**
    ```bash
    python3 -m venv .venv
    ```

3.  **Activate the virtual environment:**
    *   On macOS/Linux:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows (PowerShell):
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```
    _You should see `(.venv)` at the beginning of your terminal prompt._

4.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```
    > **Note:** If you see an error related to `cv2`, `libGL.so.1`, or `libxcb.so.1` when starting the service, it means a system dependency for OpenCV is missing. This can be fixed by re-running `pip install -r requirements.txt` inside your activated virtual environment to ensure the correct "headless" version of OpenCV is used.

**Start the Service (Do this every time)**

Once the first-time setup is complete, follow these steps in your second terminal to start the AI service.

1.  **Navigate to the service directory (if you're not already there):**
    ```bash
    cd yolo-service
    ```
2.  **Activate the virtual environment (if it's not already active):**
    *   On macOS/Linux:
        ```bash
        source .venv/bin/activate
        ```
    *   On Windows (PowerShell):
        ```powershell
        .\.venv\Scripts\Activate.ps1
        ```

3.  **Run the AI service:**
    ```bash
    python3 -m uvicorn app:app --reload --port 8000
    ```

Once both services are running, refresh the app at http://localhost:9002. The "AI Service Offline" message should disappear, and you can start scanning items.

## Database Setup (PostgreSQL)

The app stores its data in PostgreSQL (users, products, orders, messages, scans, alerts). The AI service connects to it using the `DATABASE_URL` environment variable — this works with **Neon** or **Supabase**.

1.  **Create a database** (one time, ~2 minutes):
    *   **Neon**: sign up at https://neon.tech, create a project, and copy the connection string from the dashboard.
    *   **Supabase**: sign up at https://supabase.com, create a project, and copy the connection string from **Settings → Database → Connection string → URI**. (You don't need Supabase Auth — Clerk handles authentication.)

2.  **Add it to your environment:** copy `.env.example` to `.env.local` (if you haven't already) and paste your connection string:
    ```
    DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
    ```
    The AI service picks it up automatically from `.env.local` (or from the environment).

3.  **Restart the AI service** (if it's running). The schema is created automatically on first use.

4.  **Seed demo data** (one time, optional): the first time you connect, populate the app with sample products, orders, scans, etc.:
    ```bash
    curl -X POST http://127.0.0.1:8000/db/seed
    ```
    You can check the connection with `curl http://127.0.0.1:8000/db/health` — it returns `{"ok": true, "seeded": true/false}`.

> **Note:** the old local SQLite file (`yolo-service/ecosort.db`) is no longer used. Data lives in your hosted database, so it survives restarts and is shared across machines.

    
    

# EcoSort-Vision

This project has two main parts that need to be running at the same time:
1.  **The Web App (Next.js)**: This is the user interface you see in your browser.
2.  **The AI Service (Python)**: This is a service that handles waste detection.

## Running the Application

### IMPORTANT: Cloud Environments vs. Local Machine

*   **On your local machine**: The frontend (Web App) can connect to the backend (AI Service) using `http://localhost:8000`. This is the default.
*   **In a Cloud IDE (like Cloud Workstations)**: `localhost` will not work between services. You must use the public URL provided by the IDE for the AI service.

### Step 1: Configure the AI Service URL

Before running the app, you need to tell the Web App how to find the AI service.

1.  Find the `.env` file in the root of the project. If it doesn't exist, create it.
2.  Set the `YOLO_SERVICE_URL` variable.

    *   **For local development**:
        ```
        YOLO_SERVICE_URL=http://127.0.0.1:8000
        ```
    *   **For a cloud IDE**: You will get the URL after starting the AI service in the next step. Once you have it, come back and update this file. It will look something like this:
        ```
        YOLO_SERVICE_URL=https://8000-your-workstation-name.cloudworkstations.dev
        ```

**Remember**: After changing the `.env` file, you **must** restart the Web App server for the change to take effect.

### Step 2: Run the AI Service (Terminal 1)

This starts the local Python service that performs the AI waste detection.

**First-Time Setup (Do this only once)**

1.  **Navigate to the service directory:**
    ```bash
    cd yolo-service
    ```
2.  **Create and activate a Python virtual environment:**
    ```bash
    # Create the environment
    python3 -m venv .venv
    
    # Activate it (on macOS/Linux)
    source .venv/bin/activate
    # On Windows (PowerShell), use: .\.venv\Scripts\Activate.ps1
    ```
    _You should see `(.venv)` at the beginning of your terminal prompt._
3.  **Install the required Python packages:**
    ```bash
    pip install -r requirements.txt
    ```

**Start the Service (Do this every time)**

1.  In your first terminal, navigate to `yolo-service` and activate the environment if you haven't already.
2.  Run the service:
    ```bash
    python3 -m uvicorn app:app --reload --port 8000
    ```
3.  The service will now be running. If you are in a cloud IDE, it will give you a public URL. **Copy this URL** and update your `.env` file as described in Step 1.

### Step 3: Run the Web App (Terminal 2)

1.  Open a **new, separate terminal window**.
2.  Run the Web App:
    ```bash
    # Install dependencies (only need to do this once)
    npm install

    # Start the web app
    npm run dev
    ```
    If you just updated your `.env` file, stop and restart this command.

3.  Once both services are running and correctly configured, open http://localhost:9002 in your browser. The "AI Service Offline" message should disappear.

    
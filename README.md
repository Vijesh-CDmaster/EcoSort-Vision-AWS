
# EcoSort-Vision

AI-powered waste detection and segregation.

**Stack:**
- **Web app**: Next.js (React) — UI, routes, Clerk authentication.
- **Auth**: [Clerk](https://clerk.com) — sign-in/sign-up, sessions, roles.
- **Database**: PostgreSQL, hosted on [Neon](https://neon.tech) or [Supabase](https://supabase.com) (set `DATABASE_URL`).
- **AI service**: Python (FastAPI + YOLO) — waste detection from camera/upload, and it also exposes the `/db/*` REST API that the app uses to read and write data.

The web app and AI/database service can be started together with one command
after the Python dependencies and `DATABASE_URL` are configured.

## Running the Application

### Start both services (Windows PowerShell)

From the project root:

```powershell
npm install
npm run dev:all
```

The repository-relative launcher starts Next.js and the Python service, waits
for the YOLO model health check and database health check, and reports startup
failures with log paths under `yolo-service/.logs/`. Press Ctrl+C to stop both
processes. It requires `yolo-service\.venv` and a `DATABASE_URL` in the
environment or `.env.local`.

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

Once setup is complete, run `npm run dev:all` from the project root.

On the waste-detection page, image selection is available while the AI service
is starting. The page checks the service automatically every five seconds and
starts classifying the selected image as soon as the service becomes available.
The browser cannot launch the Python process itself; `npm run dev:all` starts
it from the local machine instead.

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

## Optional Amazon S3 image storage

Completed waste scans are uploaded by the Next.js server to S3 when S3 is
configured. The browser never receives AWS credentials. Uploads use the AWS
SDK's standard credential provider chain (environment variables, shared AWS
configuration, or an IAM role) and are stored with server-side AES-256
encryption under `waste-classifications/`. Classification still works when S3
is not configured; the upload is skipped with a `503` configuration response.

Image flow:

1. [`src/components/scan/waste-scanner.tsx`](./src/components/scan/waste-scanner.tsx)
   gets a JPEG/PNG/WebP base64 data URI from the file picker or camera and
   sends it to [`/api/yolo/predict`](./src/app/api/yolo/predict/route.ts) for
   classification.
2. After a successful classification, the same data URI is sent to
   [`/api/s3/upload`](./src/app/api/s3/upload/route.ts). The existing
   [`src/components/scan/scan-store.tsx`](./src/components/scan/scan-store.tsx)
   separately persists the scan result through the Python service's
   `/db/scans` endpoint; an S3 error does not discard that existing record.
3. The route calls [`src/lib/s3.ts`](./src/lib/s3.ts), which validates the
   image and sends a real `PutObjectCommand` through `S3Client`. It returns
   success only after AWS accepts the request. The route returns `502` for an
   AWS/client failure and `503` when configuration is absent.

1. Create a private S3 bucket in the AWS region you want to use. Bucket names
   are globally unique. Keep **Block all public access** enabled.
2. Add the following values to `.env.local` (copy from `.env.example`):

   ```text
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-unique-private-bucket-name
   ```

3. Give the runtime identity only the ability to upload to the prefix used by
   this application. Replace the bucket name in this example IAM policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:PutObject"],
         "Resource": "arn:aws:s3:::your-unique-private-bucket-name/waste-classifications/*"
       }
     ]
   }
   ```

   Use an IAM role when running on AWS. For local development, use a profile
   configured with `aws configure` or the standard `AWS_ACCESS_KEY_ID`,
   `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN` environment
   variables. Do not put any of these values in frontend code or commit them.
4. Restart the Next.js server after changing environment variables.

[`GET /api/s3/health`](./src/app/api/s3/health/route.ts) reports whether `AWS_REGION` and `S3_BUCKET_NAME` are
present. It intentionally reports `connectivity: "not_checked"`; it does not
claim AWS connectivity without making an AWS request. A configured upload
returns the S3 object key and `s3://` URI only after `PutObject` succeeds.

To verify a real upload, start the app with valid AWS configuration and
credentials, complete an image scan in the UI, then check the private bucket:

```bash
aws s3api head-object \
  --bucket your-unique-private-bucket-name \
  --key waste-classifications/YYYY-MM-DD/<key-from-the-upload-response>
```

[`src/lib/s3.test.ts`](./src/lib/s3.test.ts) covers a successful upload with a
mock client, invalid/oversized images, missing configuration, and AWS client
failures. It does not contact AWS:

```bash
npm test
```

    
    
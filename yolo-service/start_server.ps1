Set-Location "c:\Users\HP\Desktop\ecosortv2\EcoSort-Vision\yolo-service"
& ".\.venv\Scripts\Activate.ps1"
python -m uvicorn app:app --reload --port 8000

---
description: Start the ML Feedback Engine (FastAPI)
---

To start the ML service locally for interview analysis:

1. Ensure you have the dependencies installed:
```powershell
pip install -r backend/ml_service/requirements.txt
```

2. Start the FastAPI server:
```powershell
python backend/ml_service/main.py
```
The server will start at `http://localhost:8000`.

3. Ensure your Next.js application is running as well.

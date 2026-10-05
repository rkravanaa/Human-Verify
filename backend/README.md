# Sightengine image detector backend

This Flask backend sends uploaded image bytes to Sightengine's hosted
AI-generated image detection API (`models=genai`). Analysis runs remotely;
the backend does not load an image model or use local GPU inference.

## Configure

Create a Sightengine account and obtain the API user and API secret from its
dashboard. From this folder, copy the example and set both values in `.env`:
the names must be `SIGHTENGINE_API_USER` and `SIGHTENGINE_API_SECRET` (an old
`HF_TOKEN` does not configure Sightengine).

```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Keep the real credentials in this backend-only `.env` file. Never put them in
frontend code or commit them.

## Run on Windows

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe app.py
```

The health endpoint is `http://127.0.0.1:5000/api/health`. The image endpoint
is `POST http://127.0.0.1:5000/api/analyze-image` with a multipart form field
named `image`. Requests are limited to 10 MB and the API call has a bounded
timeout.

The response includes Sightengine's `ai_likelihood` score as a value from 0–1
and the corresponding `predicted_label`. The score is a detector estimate, not
a calibrated guarantee or proof of an image's origin. Evaluate it against a
known set of real and AI-generated images before relying on it.

import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SIGHTENGINE_API_URL = "https://api.sightengine.com/1.0/check.json"
DETECTOR_ID = "sightengine-genai"
MAX_FILE_SIZE = 10 * 1024 * 1024
REQUEST_TIMEOUT = (5, 45)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/bmp",
}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

CORS(app, resources={r"/api/*": {"origins": "*"}})


def analyze_with_sightengine(image_bytes, filename, mimetype):
    api_user = os.getenv("SIGHTENGINE_API_USER")
    api_secret = os.getenv("SIGHTENGINE_API_SECRET")

    if not api_user or not api_secret:
        raise RuntimeError(
            "Sightengine is not configured. Set "
            "SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET in backend/.env."
        )

    response = requests.post(
        SIGHTENGINE_API_URL,
        data={
            "models": "genai",
            "api_user": api_user,
            "api_secret": api_secret,
        },
        files={
            "media": (filename, image_bytes, mimetype),
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    try:
        result = response.json()
    except requests.exceptions.JSONDecodeError as exc:
        raise ValueError("Sightengine returned an invalid JSON response.") from exc

    if result.get("status") != "success":
        raise ValueError(
            result.get("error", {}).get(
                "message",
                "Sightengine could not analyze this image.",
            )
        )

    try:
        ai_likelihood = float(result["type"]["ai_generated"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError(
            "Sightengine response did not contain an AI-generated score."
        ) from exc

    if not 0.0 <= ai_likelihood <= 1.0:
        raise ValueError("Sightengine returned an invalid AI-generated score.")

    return ai_likelihood


@app.get("/api/health")
def health():
    configured = bool(
        os.getenv("SIGHTENGINE_API_USER")
        and os.getenv("SIGHTENGINE_API_SECRET")
    )

    return jsonify({
        "status": "ok",
        "detector": DETECTOR_ID,
        "configured": configured,
    })


@app.post("/api/analyze-image")
def analyze_image():

    if "image" not in request.files:
        return jsonify({
            "error": "No image file was provided."
        }), 400

    uploaded = request.files["image"]

    if not uploaded.filename:
        return jsonify({
            "error": "The uploaded file has no filename."
        }), 400

    mimetype = uploaded.mimetype

    if mimetype not in ALLOWED_TYPES:
        return jsonify({
            "error": "Unsupported image type."
        }), 415

    try:
        image_bytes = uploaded.read()

        if not image_bytes:
            return jsonify({
                "error": "The uploaded image is empty."
            }), 400

        if len(image_bytes) > MAX_FILE_SIZE:
            return jsonify({
                "error": "Image is larger than the 10 MB limit."
            }), 413

        ai_likelihood = analyze_with_sightengine(
            image_bytes,
            uploaded.filename,
            mimetype,
        )
        predicted_label = (
            "AI-generated"
            if ai_likelihood >= 0.5
            else "Not flagged as AI-generated"
        )

        return jsonify({
            "ai_likelihood": ai_likelihood,
            "predicted_label": predicted_label,
            "model": DETECTOR_ID,
            "note": (
                "Sightengine AI-generation score only; "
                "not proof of image origin or truth."
            )
        })

    except RuntimeError as exc:
        return jsonify({
            "error": str(exc),
        }), 503

    except Exception as exc:
        app.logger.exception(
            "Sightengine image analysis failed: %s",
            exc,
        )

        return jsonify({
            "error": (
                "Sightengine could not analyze the image. Check the backend "
                "logs and Sightengine account/API status."
            )
        }), 502


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({
        "error": "Image is larger than the 10 MB limit."
    }), 413


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )
The system is designed to help applications obtain additional evidence when evaluating human presence or digital media.
Human Verify does not claim absolute certainty, identity verification, or truth verification.
Product Preview
Landing Page
 
Human Verify presents verification as a dedicated trust layer rather than a single CAPTCHA-style interaction.
The Problem
Seeing isn't believing anymore.
AI can now generate realistic faces, clone voices, create synthetic media and produce convincing text.
This creates a growing gap between:
What appears real
       ↓
What actually happened

Human Verify is designed to explore how independent verification signals can help close that gap.
 
Verification Modules
Human Verify uses a modular architecture where each verification method can operate independently.
 
01 — Live Presence
Challenge-response verification using the camera.
The Live Presence module uses randomized facial challenges to verify interactive presence in front of the camera.
Current prototype capabilities include:
- Camera-based face detection
- Randomized challenges
- Head movement detection
- Blink detection
- Real-time facial landmark analysis
- Challenge timeout handling
- Verification state tracking
Example flow:
Camera
  ↓
Face detected
  ↓
Random challenge
  ↓
User performs movement
  ↓
Facial landmarks analyzed
  ↓
Challenge completed
  ↓
Liveness verified

Prototype Result
 
The current prototype successfully demonstrates randomized live-presence challenges and real-time verification.
02 — Voice Response
Randomized speech challenge with audio signal analysis.
The Voice Response module presents a randomized phrase that the user must speak aloud.
The current prototype combines:
- Randomized phrase generation
- Timed challenge-response
- Browser speech recognition
- Phrase matching
- Microphone capture
- Audio recording
- RMS energy measurement
- Peak amplitude
- Zero-crossing analysis
- Frequency analysis
- Basic pitch estimation
- Recorded audio playback
Example flow:
Random phrase
      ↓
User speaks
      ↓
Microphone capture
      ↓
Speech recognition
      ↓
Phrase matching
      ↓
Audio signal analysis
      ↓
Verification evidence

Prototype Result
 
The current voice module is an MVP.
It is not currently presented as a dedicated synthetic-voice or deepfake detector.
Advanced synthetic-voice detection is part of the future roadmap.
03 — Media Analysis
AI-generation likelihood analysis for uploaded images.
The Media Analysis module allows users to upload an image and obtain an AI-generation likelihood from an external detection service.
The current prototype integrates:
Sightengine GenAI Detection
The processing flow is:
Image upload
      ↓
Human Verify backend
      ↓
Sightengine GenAI analysis
      ↓
AI-generation likelihood
      ↓
Evidence shown to user

The backend uses a Flask API to securely communicate with the detection service without exposing API credentials to the browser.
Prototype Result
 
The interface intentionally describes the output as:
Evidence, not certainty.

An AI-generation likelihood is not proof of image origin, authenticity, intent, or truth.
Detection performance can vary depending on:
- Image compression
- Editing
- Screenshots
- New image-generation models
- Post-processing
- Detection model limitations
04 — Text Analysis
Roadmap module.
Text analysis is part of the planned Human Verify verification layer.
The intended purpose is to investigate indicators associated with machine-generated written content.
The current public prototype does not claim that text-generation detection is production-ready.
Verification Philosophy
Human Verify is intentionally designed around a simple principle:
Trust should come from evidence, not from an unsupported universal score.

Different verification signals answer different questions.
Signal	What it can indicate
Live Presence	Whether a person is interacting with the camera
Voice Response	Whether a user completed a randomized spoken challenge
Media Analysis	Whether an image is likely AI-generated
Text Analysis	Future indicators associated with machine-generated text


These signals should not be interpreted as proof of:
- Identity
- Intent
- Truth
- Legitimacy
- Ownership
- Human character
- Absence of fraud
AI-generated content is not automatically fraudulent, and a human-created image is not automatically truthful.
Architecture
The current prototype uses a modular frontend and backend architecture.


       
Technology Stack
Frontend
- Vite
- Vanilla JavaScript
- HTML5
- CSS3
- MediaPipe Tasks Vision
- Web Camera APIs
- Web Audio APIs
- Browser Speech Recognition APIs
Backend
- Python
- Flask
- Flask-CORS
- Requests
- python-dotenv
Detection / Analysis
Live Presence
MediaPipe Tasks Vision is used for facial landmark and blendshape analysis.
Voice
Browser speech recognition and Web Audio APIs are used for the current MVP.
Media
Sightengine's GenAI image detection API is used for AI-generation likelihood analysis.

Running the Project Locally
Requirements
Before running Human Verify, install:
- Node.js
- Python 3
- A modern web browser
- Git
- Sightengine API credentials for Media Analysis
1. Clone the repository
git clone https://github.com/YOUR_USERNAME/human-verify.git

Move into the project:
cd human-verify

2. Install frontend dependencies
npm install

3. Start the frontend
npm run dev

The Vite development server will normally be available at:
http://localhost:5173

Backend Setup
The Media Analysis module uses a small Flask backend.
Open a second terminal.
Move into the backend:
cd backend

4. Create a Python virtual environment
python -m venv venv

A virtual environment keeps Python dependencies isolated from the rest of your computer.
5. Activate the virtual environment
Windows PowerShell
.\venv\Scripts\Activate.ps1

6. Install backend dependencies
pip install -r requirements.txt

Sightengine Configuration
The Media Analysis backend requires Sightengine API credentials.
Create:
backend/.env

Add:
SIGHTENGINE_API_USER=your_sightengine_api_user
SIGHTENGINE_API_SECRET=your_sightengine_api_secret

Never publish the real .env file.
The repository includes:
backend/.env.example

as a safe configuration template.
Start the Backend
From:
human-verify/backend

run:
python app.py

The backend normally runs at:
http://127.0.0.1:5000

Health check:
http://127.0.0.1:5000/api/health

A correctly configured backend should return a response similar to:
{
  "status": "ok",
  "detector": "sightengine-genai",
  "configured": true
}

API
The current backend exposes an image analysis endpoint:
POST /api/analyze-image

The request uses multipart form data:
image=<uploaded image>

The backend:
1. Receives the image.
2. Validates the file type and size.
3. Sends the image to Sightengine.
4. Requests the genai model.
5. Extracts the AI-generation likelihood.
6. Returns a structured JSON response.
Example response:
{
  "ai_likelihood": 0.99,
  "predicted_label": "AI-generated",
  "model": "sightengine-genai",
  "note": "Sightengine AI-generation score only; not proof of image origin or truth."
}

The numerical value represents the detector's returned likelihood for AI generation.
It should not be interpreted as a detector accuracy percentage.
Security
API credentials are intentionally kept on the backend.
The following files should never be committed:
backend/.env
backend/venv/
node_modules/

The repository uses .gitignore to prevent these files from being uploaded.
Never place API credentials directly inside:
app.py
main.js
README.md
.env.example

Privacy Considerations
Human Verify is designed with a privacy-conscious architecture.
The prototype requests browser permissions only when the relevant verification workflow requires access to the camera or microphone.
For Media Analysis, uploaded images are sent to the configured third-party detection service for analysis.
Production deployments will require explicit policies covering:
- User consent
- Data retention
- Data deletion
- Security
- Third-party processing
- Regional privacy requirements
- Logging
- Access control
This repository does not claim that the prototype is automatically compliant with any particular privacy regulation.
Current Prototype Status
Component	Status
Landing Page	Working
Verification Hub	Working
Live Presence	Working
Randomized Facial Challenges	Working
Blink Detection	Working
Head Movement Detection	Working
Voice Challenge	Working
Speech Matching	Working
Audio Capture	Working
Audio Signal Analysis	Working
Log-Mel Visualization	Prototype
Media Upload	Working
Sightengine Integration	Working
Image AI-Generation Analysis	Working
Text Analysis	Roadmap
Advanced Synthetic Voice Detection	Roadmap
Video Analysis	Roadmap
Production API	Roadmap
Large-scale Validation	Not yet completed


What Has Been Built
The current prototype demonstrates an end-to-end modular verification workflow.
Live Presence
Randomized camera challenges using real-time facial analysis.
Voice Response
Randomized spoken challenges combined with speech matching and basic acoustic analysis.
Media Analysis
Image AI-generation likelihood analysis through an external detection API.
Verification Hub
A unified interface for accessing independent verification modules.
Backend
A Flask API that securely handles third-party media analysis credentials.
Limitations
Human Verify is currently a prototype and has not undergone large-scale production validation.
Important limitations include:
- Liveness performance has not been evaluated across a large population.
- Voice analysis is currently an MVP and does not constitute dedicated synthetic-voice detection.
- Browser speech recognition behavior can vary between browsers.
- Media detection can produce false positives and false negatives.
- AI-generation detectors can become less effective against newer generation techniques.
- The system does not establish a person's identity.
- The system does not determine whether content is truthful.
- AI-generated content is not automatically fraudulent.
- Human-created content is not automatically authentic or truthful.
- Current verification outputs should be treated as evidence signals rather than absolute conclusions.
Roadmap
Phase 1 — Working Prototype
- Live presence verification
- Randomized facial challenges
- Voice response verification
- Basic audio analysis
- Image AI-generation detection
- Modular verification hub
- Flask backend
- API-ready architecture
Current stage
Phase 2 — Real-World Validation
- Pilot users
- Real verification sessions
- False-positive evaluation
- False-negative evaluation
- Latency measurement
- Reliability testing
- Security testing
- Browser compatibility testing
Phase 3 — Advanced Verification
- Stronger liveness detection
- Dedicated synthetic-voice detection
- Expanded image detection
- Video analysis
- Text-generation analysis
- Multi-signal verification workflows
- Workflow-specific risk thresholds
Phase 4 — Developer Platform
- Production API
- SDKs
- Developer documentation
- Authentication
- Usage monitoring
- Enterprise deployment
- Custom verification workflows
- Third-party detector integrations
Long-Term Vision
Human Verify is being developed around a broader idea:
Verification should become infrastructure.

Applications should be able to request different verification signals depending on their risk profile.
For example:
Low-risk interaction
        ↓
Basic human presence

Medium-risk interaction
        ↓
Human presence + voice response

High-risk interaction
        ↓
Human presence + media analysis + additional signals

The long-term goal is not to replace every identity or fraud system.
It is to provide an additional verification layer that developers can integrate into applications where digital trust matters.
Potential Applications
Human Verify can potentially support verification workflows across areas such as:
- Digital onboarding
- Financial services
- Remote interviews
- Online examinations
- Marketplaces
- Social platforms
- Customer support
- Remote collaboration
- Content platforms
- Developer applications
These are potential application areas, not claims of current deployment.
Design Principles
Human Verify follows several principles.
1. Evidence over certainty
Verification systems should expose useful evidence rather than manufacture certainty.
2. Human presence is not identity
A system detecting a live person does not automatically know who that person is.
3. Authenticity is not truth
An image being human-created does not prove that the image is truthful.
4. AI-generated does not mean fraudulent
Synthetic media can have legitimate uses.
5. Modular architecture
Each verification capability should be independently replaceable and extensible.
6. Privacy-conscious design
Only the data required for a particular verification workflow should be requested.
Development Philosophy
Human Verify is being developed as a modular research and product prototype.
The architecture intentionally separates:
Detection
   ↓
Analysis
   ↓
Evidence
   ↓
Decision

This allows individual detection systems to evolve without requiring the entire verification platform to be rebuilt.
Contributing
Contributions, technical feedback and research collaboration are welcome.
Potential contribution areas include:
- Liveness detection
- Synthetic voice detection
- Media forensics
- AI-generated text analysis
- Privacy engineering
- Security
- Backend architecture
- Frontend development
- Evaluation methodology
- Detector benchmarking
Before submitting significant changes, please open an issue describing the proposed approach.
License
This project is licensed under the MIT License.
See the LICENSE file for details.
Third-party services, models, libraries and APIs remain subject to their respective licenses and terms.
Disclaimer
Human Verify is an experimental research and product prototype.
Verification results are estimates or evidence signals generated by software and third-party detection systems.
They should not be interpreted as absolute proof of:
- Human identity
- Human authenticity
- Content authenticity
- Truthfulness
- Intent
- Legitimacy
- Absence of fraud
Production deployments require appropriate security, privacy, legal, compliance and performance validation.
Vision
The internet needs a new trust layer.
Human Verify is an attempt to build it.
Verify presence.
Analyze signals.
Build trust through evidence.

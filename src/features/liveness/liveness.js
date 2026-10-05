import './liveness.css'

import {
  FaceLandmarker,
  FilesetResolver
} from '@mediapipe/tasks-vision'

const startButtons = document.querySelectorAll('.start-verification')
const cameraButton = document.querySelector('#camera-button')
const stopCameraButton = document.querySelector('#stop-camera-button')
const cameraPreview = document.querySelector('#camera-preview')
const cameraPlaceholder = document.querySelector('#camera-placeholder-content')
const cameraStatus = document.querySelector('#camera-status')

const challengeStatus =
  document.querySelector('#challenge-status')

const verificationStatus =
  document.querySelector('#verification-status')

const livenessInstruction =
  document.querySelector('#liveness-instruction')

const livenessResult =
  document.querySelector('#liveness-result')

const livenessProgress =
  document.querySelector('#liveness-progress')

let cameraStream = null
let faceLandmarker = null
let faceDetectionRunning = false
let lastVideoTime = -1

let currentChallenge = null
let challengeStartedAt = 0

let baselineNoseX = null
let blinkCount = 0
let eyeWasClosed = false

let livenessPassed = false

let challengeQueue = []
let challengeIndex = 0

let countdownInterval = null
let challengeTimeout = null

const livenessCountdown =
  document.querySelector('#liveness-countdown')

const retryLivenessButton =
  document.querySelector('#retry-liveness-button')

startButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setTimeout(() => {
      document.querySelector('#camera-button')?.focus()
    }, 300)
  })
})

cameraButton.addEventListener('click', async () => {
  cameraButton.disabled = true
  cameraButton.innerHTML = 'Requesting camera...'

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: {
          ideal: 1280
        },
        height: {
          ideal: 720
        },
        facingMode: 'user'
      },
      audio: false
    })

    cameraPreview.srcObject = cameraStream

    cameraPreview.classList.add('camera-active')
    cameraPlaceholder.style.display = 'none'

    cameraStatus.textContent = 'Camera connected'
    cameraStatus.classList.add('status-success')

    challengeStatus.textContent =
      'Preparing challenge'

    verificationStatus.textContent =
      'Waiting for liveness'

    cameraButton.innerHTML = 'Camera ready ✓'
    stopCameraButton.disabled = false 
    initializeFaceLandmarker()

  } catch (error) {

    console.error('Camera access error:', error)

    cameraButton.disabled = false
    cameraButton.innerHTML = 'Allow camera & continue →'

    if (error.name === 'NotAllowedError') {
      cameraStatus.textContent =
        'Camera permission was denied'
    } else if (error.name === 'NotFoundError') {
      cameraStatus.textContent =
        'No camera was detected'
    } else {
      cameraStatus.textContent =
        'Unable to access the camera'
    }
  }
})

stopCameraButton.addEventListener('click', () => {
  // Stop the face detection loop
  faceDetectionRunning = false
  lastVideoTime = -1

  // Stop any active liveness countdown/timer
  clearLivenessTimers()

  // Reset liveness state
  currentChallenge = null
  challengeQueue = []
  challengeIndex = 0

  baselineNoseX = null
  blinkCount = 0
  eyeWasClosed = false
  livenessPassed = false

  // Reset liveness UI
  livenessProgress.textContent = '0 / 2'
  livenessCountdown.textContent = '7'

  livenessInstruction.textContent =
    'Waiting for face...'

  livenessResult.textContent =
    'Verification has not started'

  retryLivenessButton.style.display = 'none'

  livenessResult.classList.remove(
    'liveness-success'

  )
  // Reset verification step statuses
  challengeStatus.textContent =
    'Waiting for camera'

  verificationStatus.textContent =
    'Waiting for camera'

  verificationStatus.classList.remove(
    'status-success'
  )

  // Stop the actual camera
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => {
      track.stop()
    })

    cameraStream = null
  }

  // Remove camera video
  cameraPreview.srcObject = null
  cameraPreview.classList.remove('camera-active')

  // Show camera placeholder again
  cameraPlaceholder.style.display = 'flex'

  // Reset camera status
  cameraStatus.textContent = 'Camera stopped'
  cameraStatus.classList.remove('status-success')

  // Reset camera buttons
  cameraButton.disabled = false
  cameraButton.innerHTML =
    'Allow camera & continue →'

  stopCameraButton.disabled = true
})

async function initializeFaceLandmarker() {
  cameraStatus.textContent = 'Loading liveness model...'

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    faceLandmarker = await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
        },

        runningMode: 'VIDEO',

        numFaces: 1,

        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,

        outputFaceBlendshapes: true
      }
    )

    cameraStatus.textContent = 'Liveness model ready'
    cameraStatus.classList.add('status-success')

    livenessInstruction.textContent =
      'Position your face inside the frame'

    livenessResult.textContent =
      'Preparing live challenge...'

    startFaceDetection()

  } catch (error) {
    console.error(
      'Face Landmarker initialization error:',
      error
    )

    cameraStatus.textContent =
      'Liveness model unavailable'

    livenessResult.textContent =
      'Unable to initialize liveness detection'
  }
}

function startFaceDetection() {
  if (!faceLandmarker || !cameraStream) {
    return
  }

  faceDetectionRunning = true
  lastVideoTime = -1

  startLivenessChallenge()

  detectFaceFrame()
}


function detectFaceFrame() {
  if (!faceDetectionRunning || !cameraStream) {
    return
  }

  if (cameraPreview.readyState < 2) {
    requestAnimationFrame(detectFaceFrame)
    return
  }

  const currentTime = performance.now()

  if (cameraPreview.currentTime !== lastVideoTime) {

    const result = faceLandmarker.detectForVideo(
      cameraPreview,
      currentTime
    )

    lastVideoTime = cameraPreview.currentTime

    processLiveness(result)
  }

  requestAnimationFrame(detectFaceFrame)
}

function startLivenessChallenge() {
  clearLivenessTimers()

  livenessPassed = false
  challengeIndex = 0

  challengeQueue = createRandomChallengeQueue()

  livenessProgress.textContent = '0 / 2'

  retryLivenessButton.style.display = 'none'

  livenessResult.classList.remove(
    'liveness-success',
    'liveness-processing'
  )

  startNextChallenge()
}

function createRandomChallengeQueue() {
  const availableChallenges = [
    'TURN_LEFT',
    'TURN_RIGHT',
    'BLINK'
  ]

  shuffleArray(availableChallenges)

  return availableChallenges.slice(0, 2)
}

function processLiveness(result) {
  if (
    !result.faceLandmarks ||
    result.faceLandmarks.length === 0
  ) {
    cameraStatus.textContent = 'No face detected'
    cameraStatus.classList.remove('status-success')

    livenessResult.textContent =
      'Move your face into the camera view'

    return
  }

  cameraStatus.textContent = 'Face detected · 1'
  cameraStatus.classList.add('status-success')

  const landmarks = result.faceLandmarks[0]

  if (
    currentChallenge === 'TURN_LEFT' ||
    currentChallenge === 'TURN_RIGHT'
  ) {
    checkHeadTurn(landmarks)
  }

  if (currentChallenge === 'BLINK') {
    checkBlink(result)
  }
}

function checkHeadTurn(landmarks) {

  const nose = landmarks[1]

  const leftEye = landmarks[33]
  const rightEye = landmarks[263]

  const eyeCenterX =
    (leftEye.x + rightEye.x) / 2

  const eyeDistance =
    Math.abs(rightEye.x - leftEye.x)

  if (eyeDistance < 0.01) {
    return
  }

  const noseOffset =
    (nose.x - eyeCenterX) / eyeDistance

  if (baselineNoseX === null) {
    baselineNoseX = noseOffset
    return
  }

  const movement =
    noseOffset - baselineNoseX

  /*
    The camera preview is mirrored.

    Raw movement:
      positive  → user's LEFT
      negative  → user's RIGHT
  */

  if (
    currentChallenge === 'TURN_LEFT' &&
    movement > 0.22
  ) {
    completeCurrentChallenge()
  }

  if (
    currentChallenge === 'TURN_RIGHT' &&
    movement < -0.22
  ) {
    completeCurrentChallenge()
  }
}



function checkBlink(result) {

  if (
    !result.faceBlendshapes ||
    result.faceBlendshapes.length === 0
  ) {
    return
  }

  const categories =
    result.faceBlendshapes[0].categories

  const leftBlink =
    getBlendshapeScore(categories, 'eyeBlinkLeft')

  const rightBlink =
    getBlendshapeScore(categories, 'eyeBlinkRight')

  const blinkValue =
    (leftBlink + rightBlink) / 2

  const eyesClosed =
    blinkValue > 0.55

  if (eyesClosed && !eyeWasClosed) {
    eyeWasClosed = true
  }

  if (!eyesClosed && eyeWasClosed) {

    eyeWasClosed = false

    blinkCount++

    livenessProgress.textContent =
      `${Math.min(blinkCount, 2)} / 2`

    livenessResult.textContent =
      `Blink detected · ${blinkCount} / 2`

    if (blinkCount >= 2) {
      completeCurrentChallenge()
    }
  }
}


function getBlendshapeScore(categories, name) {

  const category =
    categories.find(
      item => item.categoryName === name
    )

  return category ? category.score : 0
}

function completeCurrentChallenge() {
  if (!currentChallenge) {
    return
  }

  clearLivenessTimers()

  challengeIndex++

  livenessProgress.textContent =
    `${challengeIndex} / 2`

  livenessResult.textContent =
    'Challenge passed ✓'
  challengeStatus.textContent =
    `Challenge ${challengeIndex} passed ✓`

  livenessResult.classList.add(
    'liveness-success'
  )

  currentChallenge = null

  setTimeout(() => {
    if (challengeIndex >= 2) {
      completeLiveness()
    } else {
      startNextChallenge()
    }
  }, 700)
}

function completeLiveness() {

  clearLivenessTimers()

  currentChallenge = null
  livenessPassed = true

  livenessProgress.textContent = '2 / 2'
  livenessCountdown.textContent = '✓'

  livenessInstruction.textContent =
    'Liveness verified ✓'

  livenessResult.textContent =
    'Live human presence confirmed through interactive challenges.'

  livenessResult.classList.add(
    'liveness-success'
  )

  retryLivenessButton.style.display =
    'none'

  cameraStatus.textContent =
    'Liveness verified ✓'

  cameraStatus.classList.add(
    'status-success'
  )
  challengeStatus.textContent =
    'All challenges passed ✓'

  verificationStatus.textContent =
    'Liveness verified ✓'

  verificationStatus.classList.add(
    'status-success'
  )
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))

    ;[array[i], array[j]] =
      [array[j], array[i]]
  }

  return array
}

function startNextChallenge() {
  clearLivenessTimers()

  baselineNoseX = null
  blinkCount = 0
  eyeWasClosed = false

  if (challengeIndex >= challengeQueue.length) {
    completeLiveness()
    return
  }

  currentChallenge =
    challengeQueue[challengeIndex]

  livenessProgress.textContent =
    `${challengeIndex} / 2`

  if (currentChallenge === 'TURN_LEFT') {
    livenessInstruction.textContent =
      'Turn your head LEFT'
  }

  if (currentChallenge === 'TURN_RIGHT') {
    livenessInstruction.textContent =
      'Turn your head RIGHT'
  }

  if (currentChallenge === 'BLINK') {
    livenessInstruction.textContent =
      'Blink twice'
  }

  livenessResult.textContent =
    'Complete the challenge before the timer reaches zero.'

  livenessResult.classList.remove(
    'liveness-success'
  )
  if (currentChallenge === 'TURN_LEFT') {
    challengeStatus.textContent =
      'Turn LEFT · 7 sec'
  }

  if (currentChallenge === 'TURN_RIGHT') {
    challengeStatus.textContent =
      'Turn RIGHT · 7 sec'
  }

  if (currentChallenge === 'BLINK') {
    challengeStatus.textContent =
      'Blink twice · 7 sec'
  }

  verificationStatus.textContent =
    `Challenge ${challengeIndex + 1} of 2`
  startChallengeCountdown()
}

function startChallengeCountdown() {
  let secondsRemaining = 7

  livenessCountdown.textContent =
    secondsRemaining

  challengeStartedAt =
    performance.now()

  countdownInterval = setInterval(() => {

    secondsRemaining--

    livenessCountdown.textContent =
      secondsRemaining

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

  }, 1000)

  challengeTimeout = setTimeout(() => {
    failCurrentChallenge()
  }, 7000)
}

function clearLivenessTimers() {

  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }

  if (challengeTimeout) {
    clearTimeout(challengeTimeout)
    challengeTimeout = null
  }
}

function failCurrentChallenge() {

  clearLivenessTimers()

  currentChallenge = null

  livenessCountdown.textContent = '0'

  livenessInstruction.textContent =
    'Challenge timed out'

  livenessResult.textContent =
    'The required movement was not detected within 7 seconds.'

  livenessResult.classList.remove(
    'liveness-success'
  )

  retryLivenessButton.style.display =
    'block'
}

retryLivenessButton.addEventListener(
  'click',
  () => {
    startLivenessChallenge()
  }
)

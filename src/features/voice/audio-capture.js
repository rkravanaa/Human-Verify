import './audio-capture.css'


// --------------------------------------------------
// 1. HTML ELEMENTS
// --------------------------------------------------

const startMicButton =
  document.querySelector('#start-mic-button')

const recordButton =
  document.querySelector('#record-button')

const micStatus =
  document.querySelector('#mic-status')

const signalLevel =
  document.querySelector('#signal-level')

const signalText =
  document.querySelector('#signal-text')

const recordTime =
  document.querySelector('#record-time')

const recordStatus =
  document.querySelector('#record-status')

const recordingResult =
  document.querySelector('#recording-result')

const audioPlayer =
  document.querySelector('#audio-player')


// --------------------------------------------------
// 2. AUDIO STATE
// --------------------------------------------------

let microphoneStream = null

let audioContext = null

let analyser = null

let microphoneSource = null

let animationFrame = null

let mediaRecorder = null

let recordedChunks = []

let recordingTimer = null

let recordingSeconds = 0


// --------------------------------------------------
// 3. START MICROPHONE
// --------------------------------------------------

async function startMicrophone() {

  try {

    startMicButton.disabled = true

    startMicButton.textContent =
      'Requesting microphone...'


    // Ask the browser for microphone access
    microphoneStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })


    // Create audio processing context
    audioContext =
      new AudioContext()


    // Connect microphone to Web Audio API
    microphoneSource =
      audioContext.createMediaStreamSource(
        microphoneStream
      )


    // Create analyser
    analyser =
      audioContext.createAnalyser()


    analyser.fftSize = 256


    // Connect microphone → analyser
    microphoneSource.connect(
      analyser
    )


    // Update interface
    micStatus.textContent =
      'CONNECTED'

    micStatus.className =
      'status active'


    signalText.textContent =
      'Microphone is active. Speak to test the signal.'


    startMicButton.textContent =
      'Microphone connected ✓'


    recordButton.disabled =
      false


    // Start visual signal monitoring
    monitorMicrophone()


  } catch (error) {

    console.error(
      'Microphone error:',
      error
    )


    micStatus.textContent =
      'ERROR'

    micStatus.className =
      'status error'


    if (
      error.name ===
      'NotAllowedError'
    ) {

      signalText.textContent =
        'Microphone permission was denied.'

    } else if (
      error.name ===
      'NotFoundError'
    ) {

      signalText.textContent =
        'No microphone was detected.'

    } else {

      signalText.textContent =
        'Unable to access the microphone.'
    }


    startMicButton.disabled =
      false

    startMicButton.textContent =
      'Try microphone again'
  }
}


// --------------------------------------------------
// 4. MONITOR MICROPHONE SIGNAL
// --------------------------------------------------

function monitorMicrophone() {

  if (!analyser) {
    return
  }


  const dataArray =
    new Uint8Array(
      analyser.fftSize
    )


  function updateSignal() {

    analyser.getByteTimeDomainData(
      dataArray
    )


    let sum = 0


    for (
      let i = 0;
      i < dataArray.length;
      i++
    ) {

      const normalized =
        (dataArray[i] - 128) / 128

      sum +=
        normalized * normalized
    }


    const rms =
      Math.sqrt(
        sum / dataArray.length
      )


    // Convert signal to a percentage
    const percentage =
      Math.min(
        100,
        Math.round(rms * 400)
      )


    signalLevel.style.width =
      `${percentage}%`


    if (percentage > 5) {

      signalText.textContent =
        `Microphone signal detected · ${percentage}%`

    } else {

      signalText.textContent =
        'Microphone active · waiting for speech'
    }


    animationFrame =
      requestAnimationFrame(
        updateSignal
      )
  }


  updateSignal()
}


// --------------------------------------------------
// 5. START RECORDING
// --------------------------------------------------

function startRecording() {

  if (!microphoneStream) {
    return
  }


  recordedChunks = []


  mediaRecorder =
    new MediaRecorder(
      microphoneStream
    )


  // Audio data becomes available here
  mediaRecorder.ondataavailable =
    (event) => {

      if (event.data.size > 0) {

        recordedChunks.push(
          event.data
        )
      }
    }


  // Recording finished
  mediaRecorder.onstop =
    () => {

      finishRecording()
    }


  mediaRecorder.start()


  recordingSeconds = 0

  recordTime.textContent =
    '00:00'

  recordStatus.textContent =
    'Recording microphone audio...'

  recordingResult.textContent =
    'Recording in progress.'


  recordButton.disabled =
    true

  startMicButton.disabled =
    true


  recordingTimer =
    setInterval(() => {

      recordingSeconds++

      recordTime.textContent =
        formatTime(
          recordingSeconds
        )

    }, 1000)


  // Automatically stop after 5 seconds
  setTimeout(() => {

    if (
      mediaRecorder &&
      mediaRecorder.state ===
      'recording'
    ) {

      mediaRecorder.stop()
    }

  }, 5000)
}


// --------------------------------------------------
// 6. FINISH RECORDING
// --------------------------------------------------

function finishRecording() {

  if (recordingTimer) {

    clearInterval(
      recordingTimer
    )

    recordingTimer = null
  }


  const audioBlob =
    new Blob(
      recordedChunks,
      {
        type:
          mediaRecorder.mimeType ||
          'audio/webm'
      }
    )


  const audioURL =
    URL.createObjectURL(
      audioBlob
    )


  audioPlayer.src =
    audioURL

  audioPlayer.style.display =
    'block'


  recordTime.textContent =
    '00:05'


  recordStatus.textContent =
    'Recording complete.'

  recordingResult.textContent =
    `Audio captured successfully · ${Math.round(audioBlob.size / 1024)} KB`


  recordButton.disabled =
    false

  startMicButton.disabled =
    true
}


// --------------------------------------------------
// 7. FORMAT TIMER
// --------------------------------------------------

function formatTime(
  seconds
) {

  const minutes =
    Math.floor(
      seconds / 60
    )

  const remainingSeconds =
    seconds % 60


  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(remainingSeconds).padStart(2, '0')
  )
}


// --------------------------------------------------
// 8. BUTTON EVENTS
// --------------------------------------------------

startMicButton.addEventListener(
  'click',
  () => {

    startMicrophone()

  }
)


recordButton.addEventListener(
  'click',
  () => {

    startRecording()

  }
)
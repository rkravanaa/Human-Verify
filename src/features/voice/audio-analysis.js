import './audio-analysis.css'


// --------------------------------------------------
// HTML ELEMENTS
// --------------------------------------------------

const recordButton =
  document.querySelector('#record-button')

const recordStatus =
  document.querySelector('#record-status')

const recordTime =
  document.querySelector('#record-time')

const durationElement =
  document.querySelector('#duration')

const sampleRateElement =
  document.querySelector('#sample-rate')

const sampleCountElement =
  document.querySelector('#sample-count')

const rmsElement =
  document.querySelector('#rms')

const peakElement =
  document.querySelector('#peak')

const zeroCrossingsElement =
  document.querySelector('#zero-crossings')

const audioPlayer =
  document.querySelector('#audio-player')

const analysisResult =
  document.querySelector('#analysis-result')

const canvas =
  document.querySelector('#spectrum-canvas')

const canvasContext =
  canvas.getContext('2d')


// --------------------------------------------------
// AUDIO STATE
// --------------------------------------------------

let microphoneStream = null

let mediaRecorder = null

let recordedChunks = []

let recordingTimer = null

let recordingSeconds = 0


// --------------------------------------------------
// START RECORDING
// --------------------------------------------------

async function startRecording() {

  try {

    recordButton.disabled = true

    recordButton.textContent =
      'Requesting microphone...'


    microphoneStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      })


    recordedChunks = []


    mediaRecorder =
      new MediaRecorder(
        microphoneStream
      )


    // Audio data arrives in chunks
    mediaRecorder.ondataavailable =
      (event) => {

        if (event.data.size > 0) {

          recordedChunks.push(
            event.data
          )
        }
      }


    // Called when recording stops
    mediaRecorder.onstop =
      async () => {

        await finishRecording()

      }


    mediaRecorder.start()


    recordingSeconds = 0

    recordTime.textContent =
      '00:00'

    recordStatus.textContent =
      'Recording... speak normally.'


    recordButton.textContent =
      'Recording...'


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


  } catch (error) {

    console.error(
      'Microphone error:',
      error
    )

    recordButton.disabled = false

    recordButton.innerHTML =
      'Record 5 seconds <span>→</span>'

    recordStatus.textContent =
      'Unable to access the microphone.'

  }
}


// --------------------------------------------------
// FINISH RECORDING
// --------------------------------------------------

async function finishRecording() {

  if (recordingTimer) {

    clearInterval(
      recordingTimer
    )

    recordingTimer = null

  }


  recordStatus.textContent =
    'Processing audio...'


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


  // Decode the recorded audio
  const arrayBuffer =
    await audioBlob.arrayBuffer()


  const audioContext =
    new AudioContext()


  const audioBuffer =
    await audioContext.decodeAudioData(
      arrayBuffer
    )


  analyzeAudio(
    audioBuffer
  )


  await audioContext.close()


  // Stop microphone
  if (microphoneStream) {

    microphoneStream
      .getTracks()
      .forEach(
        track => track.stop()
      )

    microphoneStream = null

  }


  recordStatus.textContent =
    'Recording complete.'


  recordButton.disabled =
    false

  recordButton.innerHTML =
    'Record another sample <span>→</span>'

}


// --------------------------------------------------
// ANALYZE AUDIO
// --------------------------------------------------

function analyzeAudio(
  audioBuffer
) {

  const channelData =
    audioBuffer.getChannelData(0)


  const sampleRate =
    audioBuffer.sampleRate


  const duration =
    audioBuffer.duration


  const sampleCount =
    channelData.length


  // -----------------------------------------------
  // RMS ENERGY
  // -----------------------------------------------

  let sumSquares = 0

  let peak = 0


  for (
    let i = 0;
    i < channelData.length;
    i++
  ) {

    const sample =
      channelData[i]


    sumSquares +=
      sample * sample


    const absolute =
      Math.abs(sample)


    if (absolute > peak) {

      peak = absolute

    }

  }


  const rms =
    Math.sqrt(
      sumSquares /
      channelData.length
    )


  // -----------------------------------------------
  // ZERO CROSSINGS
  // -----------------------------------------------

  let zeroCrossings = 0


  for (
    let i = 1;
    i < channelData.length;
    i++
  ) {

    const previous =
      channelData[i - 1]

    const current =
      channelData[i]


    if (
      (previous >= 0 && current < 0) ||
      (previous < 0 && current >= 0)
    ) {

      zeroCrossings++

    }

  }


  // -----------------------------------------------
  // DISPLAY METRICS
  // -----------------------------------------------

  durationElement.textContent =
    `${duration.toFixed(2)} s`


  sampleRateElement.textContent =
    `${sampleRate.toLocaleString()} Hz`


  sampleCountElement.textContent =
    sampleCount.toLocaleString()


  rmsElement.textContent =
    rms.toFixed(4)


  peakElement.textContent =
    peak.toFixed(4)


  zeroCrossingsElement.textContent =
    zeroCrossings.toLocaleString()


  analysisResult.textContent =
    'Audio decoded and analyzed successfully.'


  // Draw frequency spectrum
  drawSpectrum(
    channelData,
    sampleRate
  )

}


// --------------------------------------------------
// DRAW APPROXIMATE FREQUENCY SPECTRUM
// --------------------------------------------------

function drawSpectrum(
  channelData,
  sampleRate
) {

  const width =
    canvas.width

  const height =
    canvas.height


  canvasContext.clearRect(
    0,
    0,
    width,
    height
  )


  const fftSize = 2048

  let samples =
    channelData.slice(
      0,
      Math.min(
        fftSize,
        channelData.length
      )
    )


  // -----------------------------------------------
  // REMOVE DC OFFSET
  // -----------------------------------------------

  let mean = 0

  for (
    let i = 0;
    i < samples.length;
    i++
  ) {

    mean += samples[i]

  }

  mean /=
    samples.length


  for (
    let i = 0;
    i < samples.length;
    i++
  ) {

    samples[i] -= mean

  }


  // -----------------------------------------------
  // APPLY HANN WINDOW
  // -----------------------------------------------

  for (
    let i = 0;
    i < samples.length;
    i++
  ) {

    const windowValue =
      0.5 *
      (
        1 -
        Math.cos(
          (2 * Math.PI * i) /
          (samples.length - 1)
        )
      )

    samples[i] *=
      windowValue
  }


  const spectrum =
    calculateDFT(
      samples
    )


  // -----------------------------------------------
  // LOG SCALE
  // -----------------------------------------------

  const dbSpectrum =
    spectrum.map(
      magnitude => {

        const db =
          20 *
          Math.log10(
            Math.max(
              magnitude,
              0.000001
            )
          )

        return db

      }
    )


  const maxDb =
    Math.max(
      ...dbSpectrum
    )


  const minDb =
    maxDb - 60


  const barWidth =
    width /
    dbSpectrum.length


  // -----------------------------------------------
  // DRAW SPECTRUM
  // -----------------------------------------------

  for (
    let i = 0;
    i < dbSpectrum.length;
    i++
  ) {

    const normalized =
      (
        dbSpectrum[i] -
        minDb
      ) /
      (
        maxDb -
        minDb
      )


    const barHeight =
      Math.max(
        1,
        normalized *
        (height - 25)
      )


    canvasContext.fillRect(
      i * barWidth,
      height - barHeight - 15,
      Math.max(
        1,
        barWidth - 1
      ),
      barHeight
    )

  }


  // -----------------------------------------------
  // FREQUENCY LABELS
  // -----------------------------------------------

  canvasContext.font =
    '11px Arial'


  canvasContext.fillText(
    '0 Hz',
    8,
    height - 5
  )


  const maxFrequency =
    sampleRate / 2


  canvasContext.fillText(
    `${Math.round(
      maxFrequency / 1000
    )} kHz`,
    width - 55,
    height - 5
  )

}


// --------------------------------------------------
// SIMPLE DFT
// --------------------------------------------------
// This is intentionally simple for our first test.
// Later we can use an optimized FFT library/model.
// --------------------------------------------------

function calculateDFT(
  samples
) {

  const N =
    samples.length


  const result = []


  const maxBins =
    Math.min(
      128,
      Math.floor(N / 2)
    )


  for (
    let k = 0;
    k < maxBins;
    k++
  ) {

    let real = 0

    let imaginary = 0


    for (
      let n = 0;
      n < N;
      n++
    ) {

      const angle =
        (
          2 *
          Math.PI *
          k *
          n
        ) /
        N


      real +=
        samples[n] *
        Math.cos(angle)


      imaginary -=
        samples[n] *
        Math.sin(angle)

    }


    const magnitude =
      Math.sqrt(
        real * real +
        imaginary * imaginary
      ) /
      N


    result.push(
      magnitude
    )

  }


  return result

}


// --------------------------------------------------
// FORMAT TIME
// --------------------------------------------------

function formatTime(
  seconds
) {

  const minutes =
    Math.floor(
      seconds / 60
    )


  const remaining =
    seconds % 60


  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(remaining).padStart(2, '0')
  )

}


// --------------------------------------------------
// BUTTON
// --------------------------------------------------

recordButton.addEventListener(
  'click',
  () => {

    startRecording()

  }
)
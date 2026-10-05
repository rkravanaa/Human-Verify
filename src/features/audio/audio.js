import './audio.css'

const phrases = [
  'verify human presence',
  'human presence confirmed',
  'i am here now',
  'verify this session',
  'billion dollar verification',
  'privacy conscious verification',
  'next generation billionaire',
  'but handmade is also the best idea' 
]

const phraseElement = document.querySelector('#phrase')
const countdownElement = document.querySelector('#countdown')
const instructionElement = document.querySelector('#instruction')
const sessionStatus = document.querySelector('#session-status')

const challengeStatus = document.querySelector('#challenge-status')
const speechStatus = document.querySelector('#speech-status')
const signalStatus = document.querySelector('#signal-status')

const signalLevel = document.querySelector('#signal-level')
const signalBar = document.querySelector('#signal-bar')

const resultElement = document.querySelector('#result')
const startButton = document.querySelector('#start-button')
const retryButton = document.querySelector('#retry-button')

const metricDuration = document.querySelector('#metric-duration')
const metricSampleRate = document.querySelector('#metric-sample-rate')
const metricSamples = document.querySelector('#metric-samples')
const metricRms = document.querySelector('#metric-rms')
const metricPeak = document.querySelector('#metric-peak')
const metricZeroCrossings = document.querySelector('#metric-zero-crossings')

const spectrumCanvas = document.querySelector('#spectrum-canvas')
const spectrumContext = spectrumCanvas.getContext('2d')
const recordedAudio = document.querySelector('#recorded-audio')
const analysisStatus = document.querySelector('#analysis-status')

let selectedPhrase = ''
let microphoneStream = null
let audioContext = null
let analyser = null
let mediaRecorder = null
let recordedChunks = []

let speechRecognition = null
let countdownInterval = null
let challengeTimeout = null
let signalAnimationFrame = null

let challengeActive = false
let speechMatched = false
let speechDetected = false

const SpeechRecognition =
  window.SpeechRecognition ||
  window.webkitSpeechRecognition

function choosePhrase() {
  selectedPhrase =
    phrases[Math.floor(Math.random() * phrases.length)]

  phraseElement.textContent = `"${selectedPhrase}"`
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function startAudioTest() {
  resetUI()
  choosePhrase()

  startButton.disabled = true
  retryButton.hidden = true

  sessionStatus.textContent = '● REQUESTING'
  challengeStatus.textContent = 'Requesting microphone'
  speechStatus.textContent = 'Preparing speech recognition'
  instructionElement.textContent =
    'Allow microphone access, then read the phrase.'

  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    })

    setupAudioMonitor()
    setupRecorder()

    if (!SpeechRecognition) {
      throw new Error(
        'Speech recognition is not supported in this browser.'
      )
    }

    setupSpeechRecognition()

    sessionStatus.textContent = '● LIVE'
    challengeStatus.textContent = 'Challenge active'
    speechStatus.textContent = 'Listening'
    signalStatus.textContent = 'Measuring voice signal'

    challengeActive = true

    startRecording()
    startCountdown()
    speechRecognition.start()

  } catch (error) {
    console.error('Audio verification error:', error)

    stopAudioResources()

    sessionStatus.textContent = '● ERROR'
    challengeStatus.textContent = 'Unable to start'
    speechStatus.textContent = error.message

    resultElement.textContent =
      'Microphone or speech recognition could not be started.'

    startButton.disabled = false
  }
}

function setupAudioMonitor() {
  audioContext = new AudioContext()

  const source =
    audioContext.createMediaStreamSource(microphoneStream)

  analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.7

  source.connect(analyser)

  monitorSignal()
}

function monitorSignal() {
  if (!analyser) {
    return
  }

  const data = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)

  let sum = 0

  for (const value of data) {
    const normalized = (value - 128) / 128
    sum += normalized * normalized
  }

  const rms = Math.sqrt(sum / data.length)
  const percentage = Math.min(rms * 420, 100)

  signalBar.style.width = `${percentage}%`
  signalLevel.textContent =
    `${Math.round(percentage)}%`

  signalAnimationFrame =
    requestAnimationFrame(monitorSignal)
}

function setupRecorder() {
  recordedChunks = []

  const mimeType =
    MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

  mediaRecorder = new MediaRecorder(
    microphoneStream,
    { mimeType }
  )

  mediaRecorder.addEventListener(
    'dataavailable',
    (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data)
      }
    }
  )

  mediaRecorder.addEventListener(
    'stop',
    analyzeRecording
  )
}

function startRecording() {
  mediaRecorder.start()
}

function setupSpeechRecognition() {
  speechRecognition = new SpeechRecognition()

  speechRecognition.continuous = false
  speechRecognition.interimResults = false
  speechRecognition.maxAlternatives = 1
  speechRecognition.lang = 'en-US'

  speechRecognition.onstart = () => {
    speechStatus.textContent = 'Listening for phrase'
  }

  speechRecognition.onresult = (event) => {
    if (!challengeActive) {
      return
    }

    const transcript =
      event.results[0][0].transcript

    const expected =
      normalizeText(selectedPhrase)

    const actual =
      normalizeText(transcript)

    speechDetected = actual.length > 0
    speechMatched = actual === expected

    speechStatus.textContent =
      `Heard: "${transcript}"`

    if (speechMatched) {
      finishChallenge(true)
    } else {
      speechStatus.textContent =
        `Phrase did not match: "${transcript}"`
    }
  }

  speechRecognition.onerror = (event) => {
    if (!challengeActive) {
      return
    }

    console.warn(
      'Speech recognition error:',
      event.error
    )

    if (event.error === 'no-speech') {
      speechStatus.textContent =
        'No speech detected'
      return
    }

    if (event.error === 'not-allowed') {
      speechStatus.textContent =
        'Microphone permission was denied'
      finishChallenge(false)
      return
    }

    speechStatus.textContent =
      `Speech recognition: ${event.error}`
  }

  speechRecognition.onend = () => {
    if (
      challengeActive &&
      !speechMatched
    ) {
      speechStatus.textContent =
        speechDetected
          ? 'Speech captured; waiting for result'
          : 'Listening ended'
    }
  }
}

function startCountdown() {
  let secondsRemaining = 9

  countdownElement.textContent =
    secondsRemaining

  countdownInterval = setInterval(() => {
    secondsRemaining--

    countdownElement.textContent =
      secondsRemaining

    if (secondsRemaining <= 0) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }, 1000)

  challengeTimeout = setTimeout(() => {
    if (challengeActive) {
      finishChallenge(false)
    }
  }, 9000)
}

function finishChallenge(passed) {
  if (!challengeActive) {
    return
  }

  challengeActive = false

  clearTimers()

  if (
    speechRecognition &&
    speechRecognition.abort
  ) {
    speechRecognition.abort()
  }

  if (
    mediaRecorder &&
    mediaRecorder.state !== 'inactive'
  ) {
    mediaRecorder.stop()
  }

  if (passed) {
    countdownElement.textContent = '✓'
    sessionStatus.textContent = '● VERIFIED'
    challengeStatus.textContent = 'Challenge passed ✓'
    speechStatus.textContent = 'Phrase matched ✓'
    signalStatus.textContent = 'Voice signal captured'
    instructionElement.textContent =
      'Audio challenge completed.'

    resultElement.textContent =
      'Presence challenge verified through randomized speech response.'

    resultElement.classList.add('success')

    retryButton.hidden = true
  } else {
    countdownElement.textContent = '0'
    sessionStatus.textContent = '● RETRY'
    challengeStatus.textContent = 'Challenge incomplete'
    instructionElement.textContent =
      'The phrase was not verified within the time limit.'

    resultElement.textContent =
      'Verification could not confirm the expected phrase.'

    resultElement.classList.remove('success')

    retryButton.hidden = false
  }

  startButton.disabled = false

  setTimeout(() => {
    stopAudioResources()
  }, 350)
}

async function analyzeRecording() {
  if (recordedChunks.length === 0) {
    analysisStatus.textContent =
      'No audio sample was captured.'
    return
  }

  const blob = new Blob(
    recordedChunks,
    { type: 'audio/webm' }
  )

  const url = URL.createObjectURL(blob)
  recordedAudio.src = url

  try {
    const arrayBuffer =
      await blob.arrayBuffer()

    const context =
      new AudioContext()

    const audioBuffer =
      await context.decodeAudioData(arrayBuffer)

    const samples =
      audioBuffer.getChannelData(0)

    calculateCharacteristics(
      samples,
      audioBuffer.sampleRate,
      audioBuffer.duration
    )

    drawSpectrum(
      samples,
      audioBuffer.sampleRate
    )

    const pitch =
      estimateAveragePitch(
        samples,
        audioBuffer.sampleRate
      )

    if (pitch !== null) {
      signalStatus.textContent =
        `Estimated pitch: ${Math.round(pitch)} Hz`
    } else {
      signalStatus.textContent =
        'Voice frequency not estimated'
    }

    analysisStatus.textContent =
      `Audio sample analyzed · ${audioBuffer.duration.toFixed(2)} sec`

    await context.close()

  } catch (error) {
    console.warn(
      'Audio analysis failed:',
      error
    )

    analysisStatus.textContent =
      'Audio was captured, but detailed analysis failed.'

    signalStatus.textContent =
      'Basic signal captured'
  }
}

function calculateCharacteristics(
  samples,
  sampleRate,
  duration
) {
  let sumSquares = 0
  let peak = 0
  let zeroCrossings = 0

  let previous = samples[0] || 0

  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i]

    sumSquares += sample * sample

    const absolute = Math.abs(sample)

    if (absolute > peak) {
      peak = absolute
    }

    if (
      i > 0 &&
      (
        (sample >= 0 && previous < 0) ||
        (sample < 0 && previous >= 0)
      )
    ) {
      zeroCrossings++
    }

    previous = sample
  }

  const rms =
    Math.sqrt(sumSquares / samples.length)

  metricDuration.textContent =
    `${duration.toFixed(2)} s`

  metricSampleRate.textContent =
    `${sampleRate.toLocaleString()} Hz`

  metricSamples.textContent =
    samples.length.toLocaleString()

  metricRms.textContent =
    rms.toFixed(4)

  metricPeak.textContent =
    peak.toFixed(4)

  metricZeroCrossings.textContent =
    zeroCrossings.toLocaleString()
}

function drawSpectrum(samples, sampleRate) {
  const fftSize = 2048

  let start =
    Math.max(
      0,
      Math.floor(samples.length / 2) - Math.floor(fftSize / 2)
    )

  const frame = new Float64Array(fftSize)

  for (let i = 0; i < fftSize; i++) {
    const sourceIndex = start + i

    const sample =
      sourceIndex < samples.length
        ? samples[sourceIndex]
        : 0

    const hann =
      0.5 *
      (
        1 -
        Math.cos(
          (2 * Math.PI * i) /
          (fftSize - 1)
        )
      )

    frame[i] = sample * hann
  }

  const magnitudes =
    fftMagnitudes(frame)

  const width = spectrumCanvas.width
  const height = spectrumCanvas.height

  spectrumContext.clearRect(
    0,
    0,
    width,
    height
  )

  spectrumContext.fillStyle = '#f7f7f4'
  spectrumContext.fillRect(
    0,
    0,
    width,
    height
  )

  spectrumContext.strokeStyle = '#d8d8d3'
  spectrumContext.lineWidth = 1

  const maxFrequency = Math.min(
    8000,
    sampleRate / 2
  )

  const frequencyMarks = [
    0,
    1000,
    2000,
    4000,
    6000,
    8000
  ].filter(
    frequency => frequency <= maxFrequency
  )

  for (const frequency of frequencyMarks) {
    const x =
      (frequency / maxFrequency) *
      width

    spectrumContext.beginPath()
    spectrumContext.moveTo(x, 0)
    spectrumContext.lineTo(x, height - 35)
    spectrumContext.stroke()

    spectrumContext.fillStyle = '#777771'
    spectrumContext.font =
      '20px Inter, system-ui, sans-serif'
    spectrumContext.fillText(
      `${frequency} Hz`,
      Math.min(x + 8, width - 100),
      height - 10
    )
  }

  let maxMagnitude = 0

  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMagnitude) {
      maxMagnitude = magnitudes[i]
    }
  }

  if (maxMagnitude === 0) {
    return
  }

  spectrumContext.beginPath()

  for (let i = 0; i < magnitudes.length; i++) {
    const frequency =
      (i / magnitudes.length) *
      (sampleRate / 2)

    if (frequency > maxFrequency) {
      break
    }

    const x =
      (frequency / maxFrequency) *
      width

    const normalized =
      Math.log10(
        1 +
        9 *
        (magnitudes[i] / maxMagnitude)
      )

    const y =
      (height - 45) -
      normalized *
      (height - 65)

    if (i === 0) {
      spectrumContext.moveTo(x, y)
    } else {
      spectrumContext.lineTo(x, y)
    }
  }

  spectrumContext.strokeStyle = '#111111'
  spectrumContext.lineWidth = 2
  spectrumContext.stroke()
}

function fftMagnitudes(input) {
  const n = input.length

  const real = new Float64Array(input)
  const imag = new Float64Array(n)

  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1

    for (; j & bit; bit >>= 1) {
      j ^= bit
    }

    j ^= bit

    if (i < j) {
      const temp = real[i]
      real[i] = real[j]
      real[j] = temp
    }
  }

  for (let length = 2; length <= n; length <<= 1) {
    const angle =
      -2 * Math.PI / length

    const wLengthReal =
      Math.cos(angle)

    const wLengthImag =
      Math.sin(angle)

    for (
      let i = 0;
      i < n;
      i += length
    ) {
      let wReal = 1
      let wImag = 0

      const half = length >> 1

      for (
        let j = 0;
        j < half;
        j++
      ) {
        const evenReal =
          real[i + j]

        const evenImag =
          imag[i + j]

        const oddIndex =
          i + j + half

        const oddReal =
          real[oddIndex] * wReal -
          imag[oddIndex] * wImag

        const oddImag =
          real[oddIndex] * wImag +
          imag[oddIndex] * wReal

        real[i + j] =
          evenReal + oddReal

        imag[i + j] =
          evenImag + oddImag

        real[oddIndex] =
          evenReal - oddReal

        imag[oddIndex] =
          evenImag - oddImag

        const nextWReal =
          wReal * wLengthReal -
          wImag * wLengthImag

        wImag =
          wReal * wLengthImag +
          wImag * wLengthReal

        wReal = nextWReal
      }
    }
  }

  const magnitudes =
    new Float64Array(n / 2)

  for (let i = 0; i < n / 2; i++) {
    magnitudes[i] =
      Math.sqrt(
        real[i] * real[i] +
        imag[i] * imag[i]
      )
  }

  return magnitudes
}

function estimateAveragePitch(samples, sampleRate) {
  const frameSize = 2048
  const hopSize = 1024

  const minFrequency = 80
  const maxFrequency = 350

  const minLag =
    Math.floor(sampleRate / maxFrequency)

  const maxLag =
    Math.floor(sampleRate / minFrequency)

  const pitches = []

  for (
    let start = 0;
    start + frameSize < samples.length;
    start += hopSize
  ) {
    let energy = 0

    for (let i = 0; i < frameSize; i++) {
      energy += samples[start + i] ** 2
    }

    const rms =
      Math.sqrt(energy / frameSize)

    if (rms < 0.01) {
      continue
    }

    let bestLag = -1
    let bestCorrelation = 0

    for (
      let lag = minLag;
      lag <= maxLag;
      lag++
    ) {
      let correlation = 0

      for (
        let i = 0;
        i < frameSize - lag;
        i++
      ) {
        correlation +=
          samples[start + i] *
          samples[start + i + lag]
      }

      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestLag = lag
      }
    }

    if (bestLag > 0) {
      const frequency =
        sampleRate / bestLag

      if (
        frequency >= minFrequency &&
        frequency <= maxFrequency
      ) {
        pitches.push(frequency)
      }
    }
  }

  if (pitches.length === 0) {
    return null
  }

  pitches.sort(
    (a, b) => a - b
  )

  return pitches[
    Math.floor(pitches.length / 2)
  ]
}

function clearTimers() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }

  if (challengeTimeout) {
    clearTimeout(challengeTimeout)
    challengeTimeout = null
  }
}

function stopAudioResources() {
  if (signalAnimationFrame) {
    cancelAnimationFrame(signalAnimationFrame)
    signalAnimationFrame = null
  }

  if (microphoneStream) {
    microphoneStream
      .getTracks()
      .forEach(track => track.stop())

    microphoneStream = null
  }

  if (audioContext) {
    audioContext.close().catch(() => {})
    audioContext = null
  }

  analyser = null
  mediaRecorder = null
  speechRecognition = null
}

function resetUI() {
  clearTimers()
  stopAudioResources()

  challengeActive = false
  speechMatched = false
  speechDetected = false

  countdownElement.textContent = '9'
  sessionStatus.textContent = '● READY'

  challengeStatus.textContent =
    'Waiting to start'

  speechStatus.textContent =
    'Waiting for microphone'

  signalStatus.textContent =
    'No signal measured'

  signalLevel.textContent = '—'
  signalBar.style.width = '0%'

  resultElement.textContent =
    'Verification has not started.'

  resultElement.classList.remove('success')

  instructionElement.textContent =
    'Read the displayed phrase aloud.'

  metricDuration.textContent = '—'
  metricSampleRate.textContent = '—'
  metricSamples.textContent = '—'
  metricRms.textContent = '—'
  metricPeak.textContent = '—'
  metricZeroCrossings.textContent = '—'

  recordedAudio.removeAttribute('src')
  recordedAudio.load()

  analysisStatus.textContent =
    'No audio sample analyzed yet.'

  spectrumContext.clearRect(
    0,
    0,
    spectrumCanvas.width,
    spectrumCanvas.height
  )

  spectrumContext.fillStyle = '#f7f7f4'
  spectrumContext.fillRect(
    0,
    0,
    spectrumCanvas.width,
    spectrumCanvas.height
  )
}

startButton.addEventListener(
  'click',
  startAudioTest
)

retryButton.addEventListener(
  'click',
  startAudioTest
)

window.addEventListener(
  'beforeunload',
  () => {
    clearTimers()
    stopAudioResources()
  }
)

resetUI()

import './log-mel.css'


// --------------------------------------------------
// SETTINGS
// --------------------------------------------------

const FFT_SIZE = 1024

const HOP_SIZE = 512

const MEL_BANDS = 64

const MIN_FREQUENCY = 80

const MAX_FREQUENCY = 8000


// --------------------------------------------------
// HTML ELEMENTS
// --------------------------------------------------

const recordButton =
  document.querySelector('#record-button')

const recordStatus =
  document.querySelector('#record-status')

const recordTime =
  document.querySelector('#record-time')

const analysisStatus =
  document.querySelector('#analysis-status')

const analysisResult =
  document.querySelector('#analysis-result')

const sampleRateElement =
  document.querySelector('#sample-rate')

const durationElement =
  document.querySelector('#duration')

const melBandsElement =
  document.querySelector('#mel-bands')

const fftSizeElement =
  document.querySelector('#fft-size')

const audioPlayer =
  document.querySelector('#audio-player')

const canvas =
  document.querySelector('#mel-canvas')

const context =
  canvas.getContext('2d')


// --------------------------------------------------
// RECORDING STATE
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

    recordButton.innerHTML =
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


    mediaRecorder.ondataavailable =
      (event) => {

        if (event.data.size > 0) {

          recordedChunks.push(
            event.data
          )

        }

      }


    mediaRecorder.onstop =
      async () => {

        await processRecording()

      }


    mediaRecorder.start()


    recordingSeconds = 0

    recordTime.textContent =
      '00:00'

    recordStatus.textContent =
      'Recording... speak normally.'

    recordButton.innerHTML =
      'Recording...'


    recordingTimer =
      setInterval(() => {

        recordingSeconds++

        recordTime.textContent =
          formatTime(
            recordingSeconds
          )

      }, 1000)


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


    recordButton.disabled =
      false

    recordButton.innerHTML =
      'Record 5 seconds <span>→</span>'

    recordStatus.textContent =
      'Unable to access the microphone.'

  }

}


// --------------------------------------------------
// PROCESS RECORDING
// --------------------------------------------------

async function processRecording() {

  if (recordingTimer) {

    clearInterval(
      recordingTimer
    )

    recordingTimer = null

  }


  recordStatus.textContent =
    'Decoding audio...'


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


  if (microphoneStream) {

    microphoneStream
      .getTracks()
      .forEach(
        track => track.stop()
      )

    microphoneStream = null

  }


  recordStatus.textContent =
    'Analysis complete.'

  recordButton.disabled =
    false

  recordButton.innerHTML =
    'Record another sample <span>→</span>'

}


// --------------------------------------------------
// AUDIO ANALYSIS
// --------------------------------------------------

function analyzeAudio(
  audioBuffer
) {

  const samples =
    audioBuffer.getChannelData(0)


  const sampleRate =
    audioBuffer.sampleRate


  const duration =
    audioBuffer.duration


  sampleRateElement.textContent =
    `${sampleRate.toLocaleString()} Hz`


  durationElement.textContent =
    `${duration.toFixed(2)} s`


  melBandsElement.textContent =
    MEL_BANDS


  fftSizeElement.textContent =
    FFT_SIZE


  analysisStatus.textContent =
    'PROCESSING'


  const spectrogram =
    createMelSpectrogram(
      samples,
      sampleRate
    )


  drawMelSpectrogram(
    spectrogram
  )


  analysisStatus.textContent =
    'READY'

  analysisStatus.className =
    'analysis-status ready'


  analysisResult.textContent =
    `Log-mel spectrogram generated · ${spectrogram.length} frames × ${MEL_BANDS} mel bands`

}


// --------------------------------------------------
// CREATE MEL SPECTROGRAM
// --------------------------------------------------

function createMelSpectrogram(
  samples,
  sampleRate
) {

  const frames = []


  const melFilters =
    createMelFilterBank(
      sampleRate
    )


  for (
    let start = 0;
    start + FFT_SIZE <= samples.length;
    start += HOP_SIZE
  ) {

    const frame =
      samples.slice(
        start,
        start + FFT_SIZE
      )


    // Apply Hann window
    for (
      let i = 0;
      i < frame.length;
      i++
    ) {

      frame[i] *=
        0.5 *
        (
          1 -
          Math.cos(
            (
              2 *
              Math.PI *
              i
            ) /
            (
              frame.length - 1
            )
          )
        )

    }


    const spectrum =
      calculateSpectrum(
        frame
      )


    const melFrame = []


    for (
      let m = 0;
      m < MEL_BANDS;
      m++
    ) {

      let energy = 0


      for (
        let k = 0;
        k < spectrum.length;
        k++
      ) {

        energy +=
          spectrum[k] *
          melFilters[m][k]

      }


      // Log compression
      melFrame.push(
        Math.log(
          energy + 1e-10
        )
      )

    }


    frames.push(
      melFrame
    )

  }


  return frames

}


// --------------------------------------------------
// SPECTRUM
// --------------------------------------------------

function calculateSpectrum(
  frame
) {

  const N =
    frame.length


  const bins =
    N / 2


  const spectrum =
    new Float32Array(
      bins
    )


  for (
    let k = 0;
    k < bins;
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
        frame[n] *
        Math.cos(angle)


      imaginary -=
        frame[n] *
        Math.sin(angle)

    }


    spectrum[k] =
      (
        real * real +
        imaginary * imaginary
      ) / N

  }


  return spectrum

}


// --------------------------------------------------
// MEL FILTER BANK
// --------------------------------------------------

function createMelFilterBank(
  sampleRate
) {

  const filters = []

  const nyquist =
    sampleRate / 2

  const maxFrequency =
    Math.min(
      MAX_FREQUENCY,
      nyquist
    )

  const minMel =
    frequencyToMel(
      MIN_FREQUENCY
    )

  const maxMel =
    frequencyToMel(
      maxFrequency
    )

  const melPoints = []

  for (
    let i = 0;
    i < MEL_BANDS + 2;
    i++
  ) {

    const mel =
      minMel +
      (
        (
          maxMel -
          minMel
        ) *
        i
      ) /
      (
        MEL_BANDS + 1
      )

    melPoints.push(
      melToFrequency(
        mel
      )
    )
  }

  for (
    let m = 1;
    m <= MEL_BANDS;
    m++
  ) {

    const left =
      melPoints[m - 1]

    const center =
      melPoints[m]

    const right =
      melPoints[m + 1]

    const filter =
      new Float32Array(
        FFT_SIZE / 2
      )

    for (
      let k = 0;
      k < filter.length;
      k++
    ) {

      const frequency =
        (
          k *
          sampleRate
        ) /
        FFT_SIZE

      let value = 0

      if (
        frequency >= left &&
        frequency <= center
      ) {

        value =
          (
            frequency -
            left
          ) /
          (
            center -
            left
          )

      } else if (
        frequency > center &&
        frequency <= right
      ) {

        value =
          (
            right -
            frequency
          ) /
          (
            right -
            center
          )
      }

      filter[k] =
        Math.max(
          0,
          value
        )
    }

    filters.push(
      filter
    )
  }

  return filters
}


// --------------------------------------------------
// MEL CONVERSION
// --------------------------------------------------

function frequencyToMel(
  frequency
) {

  return (
    2595 *
    Math.log10(
      1 +
      frequency / 700
    )
  )

}


function melToFrequency(
  mel
) {

  return (
    700 *
    (
      Math.pow(
        10,
        mel / 2595
      ) - 1
    )
  )

}


// --------------------------------------------------
// DRAW SPECTROGRAM
// --------------------------------------------------

function drawMelSpectrogram(
  spectrogram
) {

  if (
    !spectrogram.length
  ) {

    return

  }


  const width =
    canvas.width

  const height =
    canvas.height


  context.clearRect(
    0,
    0,
    width,
    height
  )


  const frames =
    spectrogram.length


  // Find global minimum and maximum
  let minimum =
    Infinity

  let maximum =
    -Infinity


  for (
    const frame of spectrogram
  ) {

    for (
      const value of frame
    ) {

      if (value < minimum) {
        minimum = value
      }

      if (value > maximum) {
        maximum = value
      }

    }

  }


  const frameWidth =
    width / frames

  const bandHeight =
    height / MEL_BANDS


  for (
    let x = 0;
    x < frames;
    x++
  ) {

    for (
      let y = 0;
      y < MEL_BANDS;
      y++
    ) {

      const value =
        spectrogram[x][y]


      const normalized =
        (
          value -
          minimum
        ) /
        (
          maximum -
          minimum +
          1e-10
        )


      // Grayscale intensity
      const intensity =
        Math.round(
          normalized * 255
        )


      context.fillStyle =
        `rgb(${intensity}, ${intensity}, ${intensity})`


      context.fillRect(
        x * frameWidth,
        height -
          (
            y + 1
          ) *
          bandHeight,
        Math.ceil(frameWidth) + 1,
        Math.ceil(bandHeight) + 1
      )

    }

  }

}


// --------------------------------------------------
// TIMER
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
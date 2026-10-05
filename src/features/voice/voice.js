import './voice.css'


// --------------------------------------------------
// 1. CONNECT TO THE HTML ELEMENTS
// --------------------------------------------------

const voiceButton =
  document.querySelector('#voice-button')

const voicePhrase =
  document.querySelector('#voice-phrase')

const voiceStatus =
  document.querySelector('#voice-status')

const voiceResult =
  document.querySelector('#voice-result')

const voiceCountdown =
  document.querySelector('#voice-countdown')


// --------------------------------------------------
// 2. VOICE RECOGNITION STATE
// --------------------------------------------------

let voiceRecognition = null

let voiceChallengeActive = false

let voiceCountdownInterval = null

let voiceTimeout = null

let currentVoicePhrase = ''


// --------------------------------------------------
// 3. RANDOM CHALLENGE PHRASES
// --------------------------------------------------

const voicePhrases = [
  'verify human presence',
  'human presence confirmed',
  'I am here now',
  'verify this session'
]


// --------------------------------------------------
// 4. INITIALIZE BROWSER SPEECH RECOGNITION
// --------------------------------------------------

function initializeVoiceRecognition() {

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition


  // Browser does not support speech recognition
  if (!SpeechRecognition) {

    voiceStatus.textContent =
      'NOT SUPPORTED'

    voiceStatus.className =
      'voice-status voice-error'

    voiceResult.textContent =
      'Speech recognition is not supported in this browser.'

    voiceButton.disabled = true

    return
  }


  // Create the speech recognition engine
  voiceRecognition =
    new SpeechRecognition()


  // Only listen for one response
  voiceRecognition.continuous = false

  // Language used for recognition
  voiceRecognition.lang = 'en-US'

  // We only need the final result
  voiceRecognition.interimResults = false

  // Ask the browser for one best interpretation
  voiceRecognition.maxAlternatives = 1


  // ------------------------------------------------
  // SPEECH RECOGNITION STARTED
  // ------------------------------------------------

  voiceRecognition.onstart = () => {

    voiceChallengeActive = true

    voiceStatus.textContent =
      'LISTENING'

    voiceStatus.className =
      'voice-status voice-listening'

    voiceResult.textContent =
      'Speak the displayed phrase clearly.'

    voiceButton.disabled = true

    voiceButton.innerHTML =
      'Listening...'


    // Start the 7-second timer only AFTER
    // the microphone actually starts listening.
    startVoiceCountdown()
  }


  // ------------------------------------------------
  // SPEECH RESULT RECEIVED
  // ------------------------------------------------

  voiceRecognition.onresult = (event) => {

    const transcript =
      event.results[0][0].transcript


    console.log(
      'Voice transcript:',
      transcript
    )


    processVoiceResult(transcript)
  }


  // ------------------------------------------------
  // SPEECH RECOGNITION ERROR
  // ------------------------------------------------

  voiceRecognition.onerror = (event) => {

    console.error(
      'Speech recognition error:',
      event.error
    )


    handleVoiceError(event.error)
  }


  // ------------------------------------------------
  // SPEECH RECOGNITION ENDED
  // ------------------------------------------------

  voiceRecognition.onend = () => {

    voiceChallengeActive = false

  }
}


// --------------------------------------------------
// 5. START A NEW VOICE CHALLENGE
// --------------------------------------------------

function startVoiceChallenge() {

  if (!voiceRecognition) {
    return
  }


  // Clear anything left from a previous attempt
  clearVoiceTimers()


  // Select a random phrase
  const randomIndex =
    Math.floor(
      Math.random() *
      voicePhrases.length
    )


  currentVoicePhrase =
    voicePhrases[randomIndex]


  // Display phrase
  voicePhrase.textContent =
    `"${currentVoicePhrase}"`


  // Reset interface
  voiceStatus.textContent =
    'READY'

  voiceStatus.className =
    'voice-status'

  voiceResult.textContent =
    'Get ready to speak.'

  voiceCountdown.textContent =
    '7'

  voiceButton.disabled = true

  voiceButton.innerHTML =
    'Starting microphone...'


  try {

    voiceRecognition.start()

  } catch (error) {

    console.error(
      'Unable to start speech recognition:',
      error
    )

    handleVoiceError(
      'start-error'
    )
  }
}


// --------------------------------------------------
// 6. START 7-SECOND COUNTDOWN
// --------------------------------------------------

function startVoiceCountdown() {

  let secondsRemaining = 7


  voiceCountdown.textContent =
    secondsRemaining


  voiceCountdownInterval =
    setInterval(() => {

      secondsRemaining--

      voiceCountdown.textContent =
        secondsRemaining


      if (secondsRemaining <= 0) {

        clearInterval(
          voiceCountdownInterval
        )

        voiceCountdownInterval =
          null
      }

    }, 1000)


  voiceTimeout =
    setTimeout(() => {

      if (!voiceChallengeActive) {
        return
      }


      try {

        voiceRecognition.stop()

      } catch (error) {

        console.error(
          'Unable to stop recognition:',
          error
        )
      }


      failVoiceChallenge(
        'Time expired. The phrase was not detected.'
      )

    }, 7000)
}


// --------------------------------------------------
// 7. CLEAR VOICE TIMERS
// --------------------------------------------------

function clearVoiceTimers() {

  if (voiceCountdownInterval) {

    clearInterval(
      voiceCountdownInterval
    )

    voiceCountdownInterval =
      null
  }


  if (voiceTimeout) {

    clearTimeout(
      voiceTimeout
    )

    voiceTimeout =
      null
  }
}


// --------------------------------------------------
// 8. PROCESS WHAT THE USER SAID
// --------------------------------------------------

function processVoiceResult(
  transcript
) {

  clearVoiceTimers()


  const spoken =
    normalizeVoiceText(
      transcript
    )


  const expected =
    normalizeVoiceText(
      currentVoicePhrase
    )


  console.log(
    'Expected:',
    expected
  )

  console.log(
    'Heard:',
    spoken
  )


  if (spoken === expected) {

    completeVoiceChallenge()

  } else {

    failVoiceChallenge(
      `Phrase not matched. Heard: "${transcript}"`
    )
  }
}


// --------------------------------------------------
// 9. NORMALIZE SPEECH TEXT
// --------------------------------------------------

function normalizeVoiceText(
  text
) {

  return text
    .toLowerCase()
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}


// --------------------------------------------------
// 10. SUCCESS
// --------------------------------------------------

function completeVoiceChallenge() {

  voiceChallengeActive =
    false


  clearVoiceTimers()


  voiceCountdown.textContent =
    '✓'


  voiceStatus.textContent =
    'VERIFIED'

  voiceStatus.className =
    'voice-status voice-success'


  voiceResult.textContent =
    'Spoken challenge matched ✓'


  voiceButton.disabled =
    false

  voiceButton.innerHTML =
    'Run voice challenge again <span>→</span>'
}


// --------------------------------------------------
// 11. FAILED CHALLENGE
// --------------------------------------------------

function failVoiceChallenge(
  message
) {

  voiceChallengeActive =
    false


  clearVoiceTimers()


  voiceCountdown.textContent =
    '0'


  voiceStatus.textContent =
    'FAILED'

  voiceStatus.className =
    'voice-status voice-error'


  voiceResult.textContent =
    message


  voiceButton.disabled =
    false

  voiceButton.innerHTML =
    'Try voice challenge again <span>→</span>'
}


// --------------------------------------------------
// 12. HANDLE MICROPHONE / SPEECH ERRORS
// --------------------------------------------------

function handleVoiceError(
  error
) {

  clearVoiceTimers()

  voiceChallengeActive =
    false


  let message =
    'Unable to complete voice verification.'


  if (error === 'not-allowed') {

    message =
      'Microphone permission was denied.'
  }


  if (error === 'no-speech') {

    message =
      'No speech was detected. Please try again.'
  }


  if (error === 'audio-capture') {

    message =
      'No microphone was detected.'
  }


  if (error === 'network') {

    message =
      'Speech recognition could not connect to the recognition service.'
  }


  if (error === 'start-error') {

    message =
      'Unable to start the microphone. Please try again.'
  }


  failVoiceChallenge(
    message
  )
}


// --------------------------------------------------
// 13. BUTTON EVENT
// --------------------------------------------------

voiceButton.addEventListener(
  'click',
  () => {

    startVoiceChallenge()

  }
)


// --------------------------------------------------
// 14. INITIALIZE
// --------------------------------------------------

initializeVoiceRecognition()
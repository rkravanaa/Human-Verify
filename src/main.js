import './style.css'


document.querySelector('#app').innerHTML = `
  <header class="navbar">
    <a href="#" class="logo">HUMAN VERIFY</a>

    <nav class="nav-links">
      <a href="#technology">Technology</a>
      <a href="#how-it-works">How it works</a>
      <a href="#developers">Developers</a>
    </nav>

    <a href="./verify.html" class="nav-button start-verification">
      Start verification
    </a>
  </header>

  <main>

    <section class="hero">

      <div class="hero-content">

        <p class="eyebrow">
          THE TRUST LAYER FOR THE INTERNET
        </p>

        <h1>
          Prove you're
          <span>human.</span>
        </h1>

        <p class="hero-description">
          Verify human presence across face, voice, motion and media
          with a privacy-conscious verification system built for the
          next generation of the internet.
        </p>

        <div class="hero-actions">
          <a href="./verify.html" class="primary-button start-verification">
            Start verification
            <span>→</span>
          </a>

          <a href="#technology" class="secondary-button">
            Explore the technology
          </a>
        </div>

      </div>

      <div class="verification-visual">

        <div class="visual-label">
          HUMAN VERIFICATION
        </div>

        <div class="signal-orbit orbit-one"></div>
        <div class="signal-orbit orbit-two"></div>

        <div class="verification-core">
          <div class="core-status">
            <span></span>
            LIVE
          </div>

          <div class="core-title">
            HUMAN
          </div>

          <div class="core-subtitle">
            presence verification
          </div>
        </div>

        <div class="signal signal-face">
          <span>01</span>
          FACE
        </div>

        <div class="signal signal-voice">
          <span>02</span>
          VOICE
        </div>

        <div class="signal signal-motion">
          <span>03</span>
          MOTION
        </div>

        <div class="signal signal-media">
          <span>04</span>
          MEDIA
        </div>

      </div>

    </section>

    <section class="statement" id="technology">

      <p class="eyebrow">THE PROBLEM</p>

      <h2>
        Seeing isn't believing anymore.
      </h2>

      <p>
        AI can now generate realistic faces, clone voices, create
        synthetic video and produce convincing text at scale.
        Internet trust needs a new foundation.
      </p>

    </section>

    <section class="features">

      <article class="feature-card">
        <div class="feature-number">01</div>
        <h3>Live human</h3>
        <p>
          Challenge-response signals help establish that a real
          person is present in front of the camera.
        </p>
      </article>

      <article class="feature-card">
        <div class="feature-number">02</div>
        <h3>Voice</h3>
        <p>
          Analyze spoken challenges for signals associated with
          synthetic or replayed audio.
        </p>
      </article>

      <article class="feature-card">
        <div class="feature-number">03</div>
        <h3>Media</h3>
        <p>
          Analyze images and video for signs of manipulation or
          synthetic generation.
        </p>
      </article>

    </section>

    <section class="developer-section" id="developers">

      <div class="developer-content">
        <p class="eyebrow">FOR DEVELOPERS</p>

        <h2>
          Verification as
          <span>infrastructure.</span>
        </h2>

        <p>
          Build human verification directly into applications,
          platforms and workflows through a simple verification API.
        </p>
      </div>

      <div class="code-window">
        <div class="code-header">
          <span>verification.js</span>
          <span>API</span>
        </div>

        <pre><code>const verification =
  await humanVerify.start({
    mode: "live"
  });

if (verification.verified) {
  continueWorkflow();
}</code></pre>
      </div>

    </section>

    <section class="final-cta">

      <p class="eyebrow">THE NEXT INTERNET</p>

      <h2>
        The internet needs
        <span>a new trust layer.</span>
      </h2>

      <a href="./verify.html" class="primary-button start-verification">
        Start verification
        <span>→</span>
      </a>

    </section>

  </main>

  <footer>
    <div>HUMAN VERIFY</div>
    <div>Human presence. Verified.</div>
  </footer>
`

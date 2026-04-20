import { useState, useEffect } from 'react'

function WelcomeScreen({ onStart }) {
  const [name, setName] = useState('')
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const ok = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
    setSupported(ok)
  }, [])

  const canProceed = name.trim().length >= 2 && supported

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        {/* Brand */}
        <div className="brand">
          <div className="brand-dot" />
          <span className="brand-name">Cuemath</span>
        </div>

        <div className="welcome-hero">
          <h1 className="welcome-title">Tutor Screening<br />Interview</h1>
          <p className="welcome-sub">
            A short AI-conducted screening for the Cuemath tutor role.
            The conversation takes about 8–10 minutes. Speak your answers aloud —
            the interviewer will ask you 5 questions.
          </p>
        </div>

        {!supported && (
          <div className="browser-warning">
            <span className="warn-icon">⚠</span>
            <div>
              <strong>Chrome or Edge required.</strong><br />
              Your current browser does not support the voice features this interview uses.
              Please reopen this page in Google Chrome or Microsoft Edge.
            </div>
          </div>
        )}

        <div className="checklist">
          <div className="checklist-item">
            <span className="check-icon">🎤</span>
            Microphone connected and working
          </div>
          <div className="checklist-item">
            <span className="check-icon">🔊</span>
            Speakers or headphones on
          </div>
          <div className="checklist-item">
            <span className="check-icon">🤫</span>
            Quiet environment, minimal background noise
          </div>
          <div className="checklist-item">
            <span className="check-icon">🌐</span>
            Using Google Chrome (recommended)
          </div>
        </div>

        <div className="name-field">
          <label className="field-label">Your full name</label>
          <input
            className="field-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canProceed && onStart(name.trim())}
            placeholder="Enter your full name…"
            autoFocus
          />
        </div>

        <button
          className="btn-start"
          disabled={!canProceed}
          onClick={() => onStart(name.trim())}
        >
          Begin Interview
          <span className="btn-arrow">→</span>
        </button>

        <p className="privacy-note">
          Your responses are used solely for Cuemath's hiring evaluation.
        </p>
      </div>

      {/* Decorative right panel */}
      <div className="welcome-panel">
        <div className="panel-quote">
          <blockquote>
            "The best tutors don't just teach — they make students believe they can."
          </blockquote>
          <cite>— Cuemath</cite>
        </div>
        <div className="panel-dots">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="panel-dot" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WelcomeScreen

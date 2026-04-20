import { useState, useEffect, useRef, useCallback } from 'react'
import { sendMessage } from '../api'

function InterviewScreen({ candidateName, onComplete }) {
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState(null)
  const [questionCount, setQuestionCount] = useState(0)

  // Refs for stable closures
  const historyRef = useRef([])
  const recognitionRef = useRef(null)
  const finalTranscriptRef = useRef('')
  const hasStartedRef = useRef(false)
  const chatEndRef = useRef(null)

  // Keep historyRef in sync
  const updateHistory = useCallback((newHistory) => {
    historyRef.current = newHistory
    setHistory(newHistory)
  }, [])

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, interimText, isLoading])

  // ── SPEECH SYNTHESIS ─────────────────────────────────────
  const speak = useCallback((text, onDone) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.92
    utterance.pitch = 1.05
    utterance.volume = 1.0
    utterance.lang = 'en-US'

    // Pick best available voice
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((v) => v.name.includes('Samantha')) ||
        voices.find((v) => v.lang === 'en-US' && v.name.toLowerCase().includes('female')) ||
        voices.find((v) => v.lang === 'en-US' && !v.name.toLowerCase().includes('male')) ||
        voices.find((v) => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred

      utterance.onend = () => {
        setIsSpeaking(false)
        if (onDone) onDone()
      }
      utterance.onerror = () => {
        setIsSpeaking(false)
        if (onDone) onDone()
      }

      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }

    // Voices may not be loaded yet
    if (window.speechSynthesis.getVoices().length > 0) {
      trySpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = trySpeak
    }
  }, [])

  // ── SEND USER MESSAGE TO API ──────────────────────────────
  const sendUserMessage = useCallback(
    async (text) => {
      if (!text.trim() || isLoading) return
      setError(null)

      const userMsg = { role: 'user', content: text }
      const withUser = [...historyRef.current, userMsg]
      updateHistory(withUser)
      setIsLoading(true)

      try {
        const result = await sendMessage(withUser, candidateName)
        const aiMsg = { role: 'assistant', content: result.response }
        const withAi = [...withUser, aiMsg]
        updateHistory(withAi)
        setQuestionCount((c) => c + 1)

        if (result.is_complete) {
          setIsComplete(true)
          speak(result.response)
        } else {
          speak(result.response)
        }
      } catch (err) {
        setError('Connection error — please try speaking again.')
      } finally {
        setIsLoading(false)
      }
    },
    [candidateName, isLoading, updateHistory, speak]
  )

  // ── START INTERVIEW (fetch opening message) ───────────────
  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const kickoff = async () => {
      setIsLoading(true)
      try {
        const result = await sendMessage([], candidateName)
        const aiMsg = { role: 'assistant', content: result.response }
        updateHistory([aiMsg])
        setIsLoading(false)
        setTimeout(() => speak(result.response), 600)
      } catch (err) {
        setError('Could not connect to the interview server. Please refresh the page.')
        setIsLoading(false)
      }
    }

    kickoff()
  }, []) // intentionally empty — runs once on mount

  // ── SPEECH RECOGNITION ───────────────────────────────────
  const startListening = useCallback(() => {
    if (isLoading || isSpeaking || isListening) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setError('Speech recognition not supported. Please use Google Chrome.')
      return
    }

    finalTranscriptRef.current = ''
    setInterimText('')

    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => setIsListening(true)

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += t + ' '
        } else {
          interim += t
        }
      }
      setInterimText(finalTranscriptRef.current + interim)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimText('')
      const text = finalTranscriptRef.current.trim()
      finalTranscriptRef.current = ''
      if (text) {
        sendUserMessage(text)
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      setInterimText('')
      if (event.error === 'no-speech') {
        setError('No speech detected. Try clicking the mic and speaking clearly.')
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and refresh.')
      } else {
        setError(`Microphone error: ${event.error}. Try again.`)
      }
    }

    recognition.start()
  }, [isLoading, isSpeaking, isListening, sendUserMessage])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  // ── DERIVED STATE ─────────────────────────────────────────
  const totalQuestions = 5
  const progress = Math.min(questionCount / totalQuestions, 1)
  const micDisabled = isLoading || isSpeaking || isComplete

  let statusText = ''
  let statusClass = ''
  if (isLoading) {
    statusText = 'Processing your response…'
    statusClass = 'loading'
  } else if (isSpeaking) {
    statusText = 'Maya is speaking — listen carefully'
    statusClass = 'speaking'
  } else if (isListening) {
    statusText = 'Listening… speak your answer now'
    statusClass = 'listening'
  } else if (isComplete) {
    statusText = 'Interview complete'
    statusClass = 'complete'
  } else if (history.length > 0) {
    statusText = 'Click the mic to respond'
    statusClass = 'ready'
  }

  return (
    <div className="interview-screen">
      {/* Header */}
      <header className="interview-header">
        <div className="brand-small">
          <div className="brand-dot-sm" />
          Cuemath
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-label">Progress</div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <div className="candidate-tag">{candidateName}</div>
      </header>

      {/* Chat */}
      <div className="chat-area">
        <div className="chat-inner">
          {history.map((msg, i) => (
            <div key={i} className={`msg-row ${msg.role}`}>
              {msg.role === 'assistant' && (
                <div className="avatar maya-avatar">M</div>
              )}
              <div className={`msg-bubble ${msg.role}`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="avatar user-avatar">
                  {candidateName[0].toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Live interim transcript */}
          {isListening && interimText && (
            <div className="msg-row user">
              <div className="msg-bubble user interim">
                {interimText}
                <span className="cursor-blink">|</span>
              </div>
              <div className="avatar user-avatar">
                {candidateName[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* Typing indicator while loading */}
          {isLoading && (
            <div className="msg-row assistant">
              <div className="avatar maya-avatar">M</div>
              <div className="msg-bubble assistant typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Controls */}
      <div className="interview-footer">
        {error && (
          <div className="error-banner">
            <span>⚠</span> {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {isComplete ? (
          <div className="complete-bar">
            <div className="complete-msg">
              <span className="complete-check">✓</span>
              Interview complete — great job, {candidateName.split(' ')[0]}!
            </div>
            <button
              className="btn-results"
              onClick={() => onComplete(historyRef.current)}
            >
              View My Assessment →
            </button>
          </div>
        ) : (
          <div className="controls-bar">
            <div className={`status-pill ${statusClass}`}>
              {statusText}
            </div>

            <button
              className={`mic-btn ${isListening ? 'active' : ''} ${micDisabled ? 'disabled' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={micDisabled}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              <div className="mic-icon">
                {isListening ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </div>
              {isListening && <div className="mic-ripple" />}
              {isListening && <div className="mic-ripple delay" />}
            </button>

            <div className="mic-hint">
              {isListening ? 'Click to stop' : 'Click to speak'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InterviewScreen

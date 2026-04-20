import { useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen'
import InterviewScreen from './components/InterviewScreen'
import ResultsScreen from './components/ResultsScreen'
import { getScore } from './api'

function App() {
  const [screen, setScreen] = useState('welcome')
  const [candidateName, setCandidateName] = useState('')
  const [scoreReport, setScoreReport] = useState(null)
  const [scoringError, setScoringError] = useState(null)

  const handleStart = (name) => {
    setCandidateName(name)
    setScreen('interview')
  }

  const handleInterviewComplete = async (history) => {
    setScreen('scoring')
    setScoringError(null)
    try {
      const report = await getScore(history, candidateName)
      setScoreReport(report)
      setScreen('results')
    } catch (err) {
      setScoringError(err.message)
      setScreen('results')
    }
  }

  return (
    <div className="app-root">
      {screen === 'welcome' && (
        <WelcomeScreen onStart={handleStart} />
      )}

      {screen === 'interview' && (
        <InterviewScreen
          candidateName={candidateName}
          onComplete={handleInterviewComplete}
        />
      )}

      {screen === 'scoring' && (
        <div className="scoring-screen">
          <div className="scoring-inner">
            <div className="scoring-spinner" />
            <h2>Analyzing your interview…</h2>
            <p>Generating your detailed assessment report. This takes about 15 seconds.</p>
          </div>
        </div>
      )}

      {screen === 'results' && (
        <ResultsScreen
          report={scoreReport}
          candidateName={candidateName}
          error={scoringError}
        />
      )}
    </div>
  )
}

export default App

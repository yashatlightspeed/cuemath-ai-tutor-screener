# Cuemath AI Tutor Screener

An AI-powered voice interview system that screens tutor candidates automatically — replacing
manual 10-minute phone screening calls with a consistent, scalable, 24/7 solution.

**Live demo:** [your-vercel-url]  
**Backend API:** [your-render-url]

---

## What I Built

A full-stack voice interview application where a tutor candidate:

1. Lands on a professional welcome screen, enters their name, and clicks **Begin Interview**
2. Has a real spoken conversation with **Maya**, an AI interviewer (via LLaMA 3.3 70B on Groq)
3. Speaks their answers using the browser's built-in voice recognition (Web Speech API)
4. Hears Maya's questions read aloud (Web Speech Synthesis API)
5. At the end, receives a **structured assessment report** with scores across 5 dimensions and
   specific quoted evidence from their own answers

The system is fully deployed, uses no paid APIs, and costs nothing to run.

---

## Problem Addressed

Cuemath hires hundreds of tutors monthly. Every candidate goes through a 10-minute screening
call — expensive, slow, inconsistent, and impossible to scale. This system:

- Runs 24/7 with zero human involvement for the screening round
- Produces consistent, evidence-based assessments (not gut feelings)
- Frees up human interviewers for candidates who actually clear the bar
- Gives candidates a professional first impression of Cuemath

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React (Vite) | Fast iteration, component model fits the screen-based flow |
| Backend | FastAPI (Python) | Lightweight, async-ready, easy to deploy |
| LLM | LLaMA 3.3 70B via Groq | Free tier, extremely fast inference, strong instruction-following |
| Speech-to-Text | Web Speech API (browser) | Zero cost, zero latency — runs entirely on-device |
| Text-to-Speech | SpeechSynthesis API (browser) | Same — no server calls, instant response |
| Frontend hosting | Vercel | Free tier, instant deploys from GitHub |
| Backend hosting | Render | Free tier, persistent FastAPI server |

---

## Key Decisions & Tradeoffs

**Groq (free) over OpenAI Whisper + GPT-4o**  
The most obvious stack would be OpenAI's Whisper for STT and GPT-4o for the LLM. I chose
Groq's free tier (LLaMA 3.3 70B) + browser APIs instead. The result: zero API costs, faster
response times (Groq is the fastest LLM inference available), and no credit card required.
The tradeoff: LLaMA 3.3 is excellent but occasionally less nuanced than GPT-4o for edge cases.
For a screening tool assessing English fluency and communication clarity, it performs well.

**Browser Web Speech API over server-side STT**  
Sending audio blobs to a server adds ~2-3 seconds of latency per turn. Browser STT is
instantaneous and free. The tradeoff: it requires Chrome or Edge, and quality can vary with
microphone conditions. For a professional screening context where the candidate controls their
setup, this is acceptable. I added browser-compatibility detection and clear user guidance.

**Stateless backend (full history per request)**  
The frontend maintains the full conversation history and sends it with every request. The backend
is completely stateless — no database, no sessions. This makes the backend trivially easy to
deploy, scale, and reason about. The tradeoff: slightly larger payloads per request (~1-2KB for a
full interview), which is negligible over HTTP.

**Transcript-based scoring (post-interview)**  
Rather than scoring incrementally during the conversation, I send the full transcript to the LLM
once at the end for a holistic assessment. This gives the model full context — it can weigh the
fraction explanation against the patience question together. The tradeoff: the candidate doesn't
get real-time feedback, but that matches the real hiring tool use case.

**Evidence-quoted scoring report**  
The scoring prompt explicitly requires specific quotes from the transcript as evidence for each
dimension. This means the report says "Warmth: 3/5 — Candidate said 'I would just re-explain
the topic' without addressing the student's emotional state" rather than a score with no
justification. This is what makes it a real hiring tool instead of a demo.

---

## Assessment Rubric

The system evaluates candidates across 5 dimensions:

| Dimension | What it measures |
|-----------|-----------------|
| Communication Clarity | Clear, organized sentences; gets to the point |
| Warmth & Patience | Empathy for students; describes patient approaches |
| Ability to Simplify | Can explain concepts to a child; the fraction test |
| English Fluency | Comfortable, confident communication in English |
| Tutoring Temperament | Student-centered, adaptive, genuine care for learning |

Each dimension: score 1–5 with a specific quote and written notes.  
Recommendation: **Advance** (avg ≥ 3.5) / **Hold** (2.5–3.4) / **Reject** (< 2.5)

---

## What I'd Improve With More Time

1. **Admin dashboard** — A password-protected view where Cuemath's hiring team can browse all
   completed sessions, filter by recommendation, and review transcripts alongside reports. Right
   now reports are shown to candidates; a real deployment would route them to HR.

2. **Calibration against real outcomes** — After enough candidates, compare AI recommendations
   against actual hiring decisions. Use this data to fine-tune the scoring rubric prompt.

3. **Multi-language support** — Many of Cuemath's tutor candidates are regional. Adding Hindi/
   hinglish support (the Web Speech API supports `hi-IN`) would dramatically widen the funnel.

4. **Session persistence** — Store completed sessions in a database (Supabase free tier) so
   reports aren't lost if the candidate closes the tab.

5. **Adaptive questioning** — Instead of a fixed question bank, let the LLM dynamically pick
   which dimension to probe next based on weakest responses so far.

6. **Confidence scoring** — Track speech patterns (filler words, hesitation, pace) as additional
   signals beyond content.

---

## Challenges

**Stale closures in React with voice callbacks**  
The `onend` callback in Web Speech API closes over component state, which becomes stale. I solved
this with a `historyRef` pattern — a ref that always mirrors the latest history state, readable
from inside callbacks without stale values.

**SpeechSynthesis voice loading**  
`window.speechSynthesis.getVoices()` returns an empty array if called before voices are loaded.
I added a `onvoiceschanged` fallback to handle this race condition cleanly.

**JSON reliability from LLM**  
LLMs occasionally wrap JSON in markdown code fences despite being told not to. I added a regex
strip in the scoring endpoint to clean this up before `json.loads()`, with a clear error if
parsing still fails.

---

## Running Locally

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # add your GROQ_API_KEY
uvicorn main:app --reload   # runs on http://localhost:8000

# Frontend (new terminal)
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:8000
npm run dev                 # runs on http://localhost:5173
```

Open http://localhost:5173 in Google Chrome.

---

## Deployment

**Backend → Render:**
1. Push to GitHub
2. New Web Service on Render → connect repo → Root Directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `GROQ_API_KEY` = your key

**Frontend → Vercel:**
1. New Project → import same GitHub repo → Root Directory: `frontend`
2. Add env var: `VITE_API_URL` = your Render URL (e.g. `https://your-app.onrender.com`)
3. Deploy

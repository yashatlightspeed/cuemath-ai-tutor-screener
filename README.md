# **Cuemath AI Tutor Screener**

An AI-powered voice interview system that automates tutor screening — replacing manual 10-minute phone calls with a consistent, scalable, 24/7 solution.

**Live Demo:** https://cuemath-ai-tutor-screener-self.vercel.app/
**Backend API:** https://cuemath-ai-tutor-screener-u5pr.onrender.com  

---

## **Overview**

This project simulates a real tutor screening interview using an AI interviewer (“Maya”). Candidates speak naturally, receive follow-up questions, and get a structured evaluation based on their responses.

The system is fully deployed, requires no paid APIs, and runs end-to-end in real time.

---

## **Core Flow**

1. Candidate enters their name and starts the interview  
2. AI interviewer asks questions (generated via LLM)  
3. Candidate responds using voice (Web Speech API)  
4. AI continues the conversation contextually  
5. Final report is generated with scores + evidence  

---

## **Key Features**

- 🎙️ Real-time voice-based interaction  
- 🤖 Context-aware AI interviewer  
- 📊 Structured evaluation across 5 dimensions  
- 🧾 Evidence-based scoring (with quotes)  
- 🚀 Fully deployed, zero-cost architecture  

---

## **Problem Addressed**

Cuemath screens a large volume of tutor candidates using manual calls. This approach is:

- Time-consuming  
- Inconsistent  
- Hard to scale  

This system:

- Automates screening  
- Produces standardized evaluations  
- Runs 24/7  
- Filters high-quality candidates efficiently  

---

## **Tech Stack**

| Layer | Technology | Why |
|------|------------|-----|
| **Frontend** | React (Vite) | Fast UI development |
| **Backend** | FastAPI | Lightweight & async |
| **LLM** | LLaMA 3.3 70B (Groq) | Fast + free |
| **Speech-to-Text** | Web Speech API | Zero cost |
| **Text-to-Speech** | SpeechSynthesis API | Instant playback |
| **Frontend Hosting** | Vercel | Easy deployment |
| **Backend Hosting** | Render | Free hosting |

---

## **Key Decisions & Tradeoffs**

### **Groq + LLaMA instead of OpenAI**
- No API cost  
- Extremely fast inference  
- Slight tradeoff in nuanced reasoning  

### **Browser Speech APIs**
- No backend latency  
- No audio uploads  
- Requires Chrome/Edge  

### **Stateless Backend**
- No database needed  
- Simple and scalable  
- Slightly larger request payloads  

### **Post-interview Evaluation**
- Full transcript analyzed together  
- Better scoring accuracy  

### **Evidence-based Scoring**
- Scores include:
  - Rating (1–5)
  - Supporting quote
  - Explanation  

---

## **Assessment Rubric**

| Dimension | Description |
|----------|------------|
| **Communication Clarity** | Clear explanations |
| **Warmth & Patience** | Empathy toward students |
| **Ability to Simplify** | Explaining simply |
| **English Fluency** | Confidence in speaking |
| **Tutoring Temperament** | Student-first mindset |

**Final Decision:**
- ✅ Advance (≥ 3.5)  
- ⚖️ Hold (2.5 – 3.4)  
- ❌ Reject (< 2.5)  

---

## **Challenges & Solutions**

### **React State in Voice Callbacks**
Used `useRef` to avoid stale closures.

### **SpeechSynthesis Voice Loading**
Handled with `onvoiceschanged`.

### **LLM JSON Issues**
Stripped markdown using regex before parsing.

---

## **Running Locally**

### **Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

### **Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

---

## **Deployment**

### **Backend (Render)**
- Root: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: `GROQ_API_KEY`

### **Frontend (Vercel)**
- Root: `frontend`
- Env:
```
VITE_API_URL=https://cuemath-ai-tutor-screener-u5pr.onrender.com
```

---

## **Future Improvements**

- Admin dashboard  
- Database persistence (Supabase)  
- Multi-language support  
- Adaptive questioning  
- Confidence analysis  

---

## **Notes for Evaluators**

- First request may take ~30 seconds (Render cold start)  
- Best viewed in Chrome (for speech features)  

---
## **Summary**

This project demonstrates:
- Full-stack development  
- AI integration  
- Voice-based UX  
- Production deployment  

import os
import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Cuemath AI Tutor Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ─────────────────────────────────────────────────────────────
# SYSTEM PROMPTS
# ─────────────────────────────────────────────────────────────

INTERVIEWER_PROMPT = """You are Maya, a warm and professional interviewer at Cuemath, a leading children's math learning platform. You are conducting a short screening conversation with a tutor candidate to assess their suitability.

Your purpose is to assess the candidate across these 5 dimensions:
1. Communication Clarity — Do they speak in clear, organized sentences?
2. Warmth & Patience — Do they show genuine care and empathy for students?
3. Ability to Simplify — Can they break down complex ideas for a child?
4. English Fluency — Can they communicate comfortably and confidently?
5. Tutoring Temperament — Do they show student-centered, adaptive thinking?

STRICT RULES:
- Ask exactly ONE question per message. Never ask two questions at once.
- If an answer is vague, evasive, or under 20 words, ask ONE natural follow-up before moving on. Do this only once per question.
- Stay warm, encouraging, and human. This may be someone's first impression of Cuemath.
- Keep YOUR messages short — maximum 3 sentences.
- Do NOT test deep math knowledge. Focus entirely on teaching style, empathy, and communication.
- After 5 to 6 meaningful question-and-answer exchanges are complete, close the interview warmly and end your message with EXACTLY the token: [END_INTERVIEW]

QUESTIONS to ask (in this order, rephrase naturally but keep the core intent):
Q1: Ask them to explain what a fraction is to a 9-year-old who has never heard the word before.
Q2: Ask what they would do if a student has been stuck on the same problem for 5 minutes and is visibly frustrated.
Q3: Ask how they would make a topic like long division feel less scary or more engaging to a child.
Q4: Ask them to describe a time they had to explain something complicated to someone who wasn't getting it — what did they do?
Q5: Ask what they think separates a good tutor from a truly great one.

Begin the very first message with a warm, professional welcome. Mention this is a short screening conversation for a Cuemath tutor role. Then ask Q1 immediately."""


SCORING_PROMPT = """You are a senior hiring assessor at Cuemath. You will receive a full transcript of a tutor screening interview. Your job is to produce a structured, evidence-based assessment of the candidate.

Return ONLY a raw, valid JSON object. No markdown code blocks. No explanation. No preamble. Just the JSON.

Use exactly this structure:
{
  "overall_recommendation": "Advance",
  "overall_summary": "2-3 sentence overall assessment of this candidate's suitability as a tutor.",
  "dimensions": [
    {
      "name": "Communication Clarity",
      "score": 4,
      "evidence": "Exact or near-exact quote from the candidate's responses that best illustrates this dimension.",
      "notes": "1-2 sentence assessment explaining the score."
    },
    {
      "name": "Warmth & Patience",
      "score": 3,
      "evidence": "Exact or near-exact quote from the candidate's responses.",
      "notes": "1-2 sentence assessment."
    },
    {
      "name": "Ability to Simplify",
      "score": 4,
      "evidence": "Exact or near-exact quote from the candidate's responses.",
      "notes": "1-2 sentence assessment."
    },
    {
      "name": "English Fluency",
      "score": 4,
      "evidence": "Overall observation with a representative example from the transcript.",
      "notes": "1-2 sentence assessment."
    },
    {
      "name": "Tutoring Temperament",
      "score": 5,
      "evidence": "Exact or near-exact quote from the candidate's responses.",
      "notes": "1-2 sentence assessment."
    }
  ]
}

Rules:
- overall_recommendation must be EXACTLY one of: "Advance", "Hold", or "Reject"
- All scores are integers from 1 to 5.
  5 = Exceptional, would stand out as a top hire
  4 = Strong, clearly above average
  3 = Adequate, meets basic bar
  2 = Weak, notable concerns
  1 = Poor, does not meet requirements
- Use direct quotes from the transcript as evidence — do not paraphrase evidence.
- Recommendation guide: Advance if average score >= 3.5 | Hold if 2.5–3.4 | Reject if < 2.5"""


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    history: List[Message]
    candidate_name: str

class ScoreRequest(BaseModel):
    history: List[Message]
    candidate_name: str


# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "service": "Cuemath AI Tutor Screener"}


@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")

    try:
        messages = [{"role": "system", "content": INTERVIEWER_PROMPT}]

        if not request.history:
            # Bootstrap message to start the interview
            messages.append({
                "role": "user",
                "content": f"[The candidate's name is {request.candidate_name}. Please begin the interview now.]"
            })
        else:
            for msg in request.history:
                messages.append({"role": msg.role, "content": msg.content})

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=350,
        )

        raw_response = completion.choices[0].message.content
        is_complete = "[END_INTERVIEW]" in raw_response
        clean_response = raw_response.replace("[END_INTERVIEW]", "").strip()

        return {
            "response": clean_response,
            "is_complete": is_complete
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.post("/api/score")
async def score_interview(request: ScoreRequest):
    if not os.environ.get("GROQ_API_KEY"):
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the server.")

    try:
        # Build a clean, readable transcript
        lines = []
        for msg in request.history:
            content = msg.content.replace("[END_INTERVIEW]", "").strip()
            # Skip the bootstrap trigger message
            if content.startswith("[The candidate"):
                continue
            if msg.role == "assistant":
                lines.append(f"Interviewer (Maya): {content}")
            elif msg.role == "user":
                lines.append(f"Candidate ({request.candidate_name}): {content}")

        transcript = "\n\n".join(lines)

        if not transcript.strip():
            raise HTTPException(status_code=400, detail="No interview content found to score.")

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SCORING_PROMPT},
                {"role": "user", "content": f"Here is the full interview transcript:\n\n{transcript}\n\nProvide the JSON assessment now."}
            ],
            temperature=0.2,
            max_tokens=1500,
        )

        raw = completion.choices[0].message.content.strip()

        # Strip markdown code fences if the model added them
        raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
        raw = re.sub(r'\s*```\s*$', '', raw, flags=re.MULTILINE)
        raw = raw.strip()

        data = json.loads(raw)
        return data

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse scoring JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring error: {str(e)}")

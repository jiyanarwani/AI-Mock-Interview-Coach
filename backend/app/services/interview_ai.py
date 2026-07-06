import re
import json
import base64
import tempfile
from pathlib import Path

from openai import AsyncOpenAI

from app.config import settings

client: AsyncOpenAI | None = None
if settings.ai_provider == "groq" and settings.groq_api_key:
    client = AsyncOpenAI(
        api_key=settings.groq_api_key.strip(),
        base_url="https://api.groq.com/openai/v1"
    )
elif settings.openai_api_key:
    client = AsyncOpenAI(api_key=settings.openai_api_key.strip())


def get_chat_model() -> str:
    if settings.ai_provider == "groq":
        return "llama-3.3-70b-versatile"
    return "gpt-4o-mini"


def get_whisper_model() -> str:
    if settings.ai_provider == "groq":
        return "whisper-large-v3"
    return "whisper-1"

FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "actually", "literally",
    "right", "so", "well", "I mean", "kind of", "sort of", "honestly",
    "obviously", "essentially", "anyway", "somehow",
]

INTERVIEW_QUESTIONS = {
    "behavioral": [
        "Tell me about a time when you had to deal with a difficult team member. How did you handle the situation?",
        "Describe a situation where you had to meet a tight deadline. What steps did you take to ensure you met it?",
        "Give me an example of a time when you showed leadership in a challenging situation.",
        "Tell me about a time when you failed at something. How did you handle it and what did you learn?",
        "Describe a situation where you had to adapt to a significant change at work.",
    ],
    "technical": [
        "Walk me through how you would design a scalable web application from scratch.",
        "Tell me about the most complex technical problem you've solved. What was your approach?",
        "How do you ensure code quality in your projects? Describe your testing strategy.",
        "Explain a time when you had to optimize the performance of an application.",
        "Describe your experience with system design. How would you approach building a real-time chat system?",
    ],
    "situational": [
        "If you disagreed with your manager's technical decision, how would you handle it?",
        "Imagine you're given a project with unclear requirements. How would you proceed?",
        "What would you do if you discovered a critical bug in production right before a major release?",
        "How would you handle a situation where two team members have conflicting approaches to solving a problem?",
        "If you were asked to learn a new technology stack in a very short time for a project, how would you approach it?",
    ],
    "mixed": [
        "Tell me about yourself and your experience in software development.",
        "Describe a challenging project you worked on. What was your role and what was the outcome?",
        "How do you prioritize tasks when you have multiple deadlines?",
        "Tell me about a time you received critical feedback. How did you respond?",
        "Where do you see yourself in 5 years, and how does this role fit into your career goals?",
    ],
}


async def generate_interview_question(
    role: str,
    experience_level: str,
    interview_type: str,
    question_number: int,
    previous_questions: list[str] | None = None,
) -> str:
    def get_fallback():
        questions = INTERVIEW_QUESTIONS.get(interview_type, INTERVIEW_QUESTIONS["behavioral"])
        idx = (question_number - 1) % len(questions)
        return questions[idx]

    if not client:
        return get_fallback()

    previous_context = ""
    if previous_questions:
        previous_context = "\n".join(
            f"Q{i+1}: {q}" for i, q in enumerate(previous_questions)
        )
        previous_context = f"\nPrevious questions asked:\n{previous_context}\n\nDo not repeat these questions."

    prompt = f"""You are an expert interviewer conducting a {interview_type} interview for a {role} position.
The candidate has {experience_level} experience level.
This is question number {question_number}.
{previous_context}

Generate a single, thoughtful interview question appropriate for this role and experience level.
The question should be clear, specific, and designed to evaluate the candidate's skills and experience.
Return ONLY the question text, nothing else."""

    try:
        response = await client.chat.completions.create(
            model=get_chat_model(),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.8,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"WARNING: OpenAI API error ({e}). Falling back to sample questions.")
        return get_fallback()


async def transcribe_audio(audio_base64: str) -> str:
    fallback_text = "This is a sample transcription for demo purposes. Um, I think like the project was really challenging, you know, and we basically had to work together as a team to solve the problem. Actually, I led the initiative and we delivered it on time."
    if not client:
        return fallback_text

    audio_bytes = base64.b64decode(audio_base64)
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = Path(tmp.name)

    try:
        with open(tmp_path, "rb") as audio_file:
            transcript = await client.audio.transcriptions.create(
                model=get_whisper_model(),
                file=audio_file,
                response_format="text",
            )
        return transcript.strip()
    except Exception as e:
        print(f"WARNING: OpenAI audio transcription failed ({e}). Falling back to sample transcription.")
        return fallback_text
    finally:
        tmp_path.unlink(missing_ok=True)


def detect_filler_words(transcript: str) -> dict[str, int]:
    filler_counts: dict[str, int] = {}
    lower_transcript = transcript.lower()

    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        count = len(re.findall(pattern, lower_transcript))
        if count > 0:
            filler_counts[filler] = count

    return filler_counts


def calculate_speaking_speed(word_count: int, duration_seconds: float) -> float:
    if duration_seconds <= 0:
        return 0.0
    minutes = duration_seconds / 60.0
    return round(word_count / minutes, 1) if minutes > 0 else 0.0


def calculate_confidence_score(
    speaking_speed_wpm: float,
    filler_word_ratio: float,
    word_count: int,
) -> float:
    speed_score = 100.0
    if speaking_speed_wpm < 100:
        speed_score = max(40, speaking_speed_wpm / 100 * 70)
    elif speaking_speed_wpm > 180:
        speed_score = max(40, 100 - (speaking_speed_wpm - 180) * 0.5)

    filler_score = max(0, 100 - filler_word_ratio * 500)

    length_score = min(100, word_count / 1.5)

    confidence = (speed_score * 0.3 + filler_score * 0.4 + length_score * 0.3)
    return round(min(100, max(0, confidence)), 1)


async def analyze_response_with_ai(
    question: str,
    transcript: str,
    role: str,
) -> dict:
    fallback_analysis = {
        "score": 72.0,
        "star_analysis": {
            "situation": {
                "present": True,
                "feedback": "You provided context about the challenging project.",
                "suggestion": "Be more specific about the timeline and stakeholders involved.",
            },
            "task": {
                "present": True,
                "feedback": "Your role was mentioned clearly.",
                "suggestion": "Quantify your responsibilities more precisely.",
            },
            "action": {
                "present": True,
                "feedback": "You described working with the team well.",
                "suggestion": "Focus more on YOUR specific actions rather than team actions.",
            },
            "result": {
                "present": False,
                "feedback": "The outcome was mentioned briefly.",
                "suggestion": "Include measurable results and impact metrics.",
            },
        },
        "feedback": "Good response with clear structure. To improve: (1) Reduce filler words like 'um' and 'like'. (2) Provide more specific metrics and outcomes. (3) Focus more on your individual contributions. (4) Practice the STAR format to ensure all components are well-covered.",
    }

    if not client:
        return fallback_analysis

    prompt = f"""You are an expert interview coach analyzing a candidate's response for a {role} position.

Question: {question}
Candidate's Response: {transcript}

Analyze the response and provide:
1. An overall score from 0-100
2. STAR format analysis (Situation, Task, Action, Result) - for each element, indicate if it was present, provide feedback, and suggest improvements
3. Detailed constructive feedback with specific improvement suggestions

Return your analysis as JSON with this exact structure:
{{
    "score": <number>,
    "star_analysis": {{
        "situation": {{"present": <bool>, "feedback": "<string>", "suggestion": "<string>"}},
        "task": {{"present": <bool>, "feedback": "<string>", "suggestion": "<string>"}},
        "action": {{"present": <bool>, "feedback": "<string>", "suggestion": "<string>"}},
        "result": {{"present": <bool>, "feedback": "<string>", "suggestion": "<string>"}}
    }},
    "feedback": "<detailed feedback string>"
}}"""

    try:
        response = await client.chat.completions.create(
            model=get_chat_model(),
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"WARNING: OpenAI API analysis failed ({e}). Falling back to sample analysis.")
        return fallback_analysis

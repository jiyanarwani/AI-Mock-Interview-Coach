# AI Interview Coach

An AI-powered mock interview platform that conducts voice-based interviews and provides detailed feedback on speaking performance, pace, confidence, and structure.

## Features

- **AI Interviewer** — Role-specific questions tailored to your experience level (behavioral, technical, situational, or mixed).
- **Dual AI Engines** — Supports **OpenAI** (GPT-4o-mini + Whisper) and **Groq** (Llama 3.3-70b + Whisper-large-v3) for ultra-fast, cost-effective responses.
- **Speech-to-Text** — Real-time transcription using Whisper.
- **Speaking Analysis** — Tracks speaking speed (WPM) and confidence scoring.
- **Filler Word Detection** — Identifies words like "um", "like", "you know", "basically", etc.
- **STAR Format Coaching** — Evaluates answers against the Situation, Task, Action, Result framework with suggestions for improvement.
- **PDF Scorecard** — Downloadable interview report with scores, analysis, and feedback.

## Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Frontend   | Next.js (React, TypeScript, Tailwind CSS) |
| Backend    | FastAPI (Python, SQLAlchemy, Uvicorn) |
| AI Engines | Groq (Llama 3.3-70b + Whisper) OR OpenAI (GPT-4o-mini + Whisper) |
| Database   | SQLite (default dev fallback) OR PostgreSQL |
| PDF Report | ReportLab |

## Project Structure

```
ai-interview-coach/
├── frontend/             # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # Reusable components
│   │   └── lib/          # API client, auth context
│   └── package.json
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── main.py       # FastAPI entry point
│   │   ├── config.py     # Settings
│   │   ├── database.py   # SQLAlchemy setup
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routes/       # API endpoints
│   │   └── services/     # AI, auth, PDF generation
│   └── requirements.txt
└── README.md
```

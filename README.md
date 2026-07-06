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

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Groq API Key (Free) OR OpenAI API Key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   * **Windows (PowerShell)**:
     ```powershell
     venv\Scripts\Activate.ps1
     ```
   * **Linux/macOS**:
     ```bash
     source venv/bin/activate
     ```

4. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Configure environment variables. Create a `.env` file in the `backend/` directory (or use the `.env` template in the root directory):
   ```env
   DATABASE_URL=sqlite+aiosqlite:///./interview_coach.db
   JWT_SECRET_KEY=dev-secret-key-change-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60
   FRONTEND_URL=http://localhost:3000

   # Choose your AI Provider: 'openai' or 'groq'
   AI_PROVIDER=groq

   # API Keys (add the key for the provider you chose above)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   OPENAI_API_KEY=sk-proj-your_openai_api_key_here
   ```

6. Run the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables. Create a `.env` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at [http://localhost:3000](http://localhost:3000).

## Database Setup

By default, the platform auto-creates and uses a local SQLite database (`interview_coach.db`) in the backend folder. 

To use PostgreSQL, configure a database:
```sql
CREATE DATABASE interview_coach;
```
And update the `DATABASE_URL` in your `.env` file:
```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/interview_coach
```
Tables are auto-created on the first server startup.

## Demo Mode

If no API keys are configured, the platform will automatically run in **Demo Mode**, utilizing built-in fallback questions and sample response analysis. 

## License

MIT

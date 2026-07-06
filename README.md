# AI Interview Coach

An AI-powered mock interview platform that conducts voice-based interviews and provides detailed feedback on speaking performance.

## Features

- **AI Interviewer** — Role-specific questions tailored to your experience level (behavioral, technical, situational, or mixed)
- **Speech-to-Text** — Real-time transcription using OpenAI Whisper
- **Speaking Analysis** — Tracks speaking speed (WPM) and confidence scoring
- **Filler Word Detection** — Identifies words like "um", "like", "you know", "basically", etc.
- **STAR Format Coaching** — Evaluates answers against Situation, Task, Action, Result framework with improvement suggestions
- **PDF Scorecard** — Downloadable interview report with scores, analysis, and feedback

## Tech Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Frontend   | Next.js (React, TypeScript, Tailwind CSS) |
| Backend    | FastAPI (Python)               |
| AI         | OpenAI GPT-4o-mini + Whisper   |
| Database   | PostgreSQL                     |
| Deployment | Vercel (frontend) + Render (backend) |

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
- PostgreSQL
- OpenAI API key

### Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env with your database URL and OpenAI API key

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the dev server
npm run dev
```

### Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE interview_coach;
```

Tables are auto-created on first server startup.

## API Endpoints

| Method | Endpoint                                    | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| POST   | `/api/auth/register`                        | Register new user        |
| POST   | `/api/auth/login`                           | Login                    |
| POST   | `/api/interviews/`                          | Create interview session |
| GET    | `/api/interviews/`                          | List user's interviews   |
| GET    | `/api/interviews/{id}`                      | Get interview details    |
| POST   | `/api/interviews/{id}/question`             | Get next question        |
| POST   | `/api/interviews/{id}/transcribe`           | Transcribe audio         |
| POST   | `/api/interviews/{id}/analyze/{q_number}`   | Analyze response         |
| POST   | `/api/interviews/{id}/complete`             | Complete interview       |
| GET    | `/api/interviews/{id}/scorecard`            | Download PDF scorecard   |

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL` = your Render backend URL

### Backend (Render)

1. Create a new Web Service on Render
2. Set root directory to `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET_KEY`, `FRONTEND_URL`

## Demo Mode

The platform works without an OpenAI API key using built-in fallback questions and sample analysis. Set a valid `OPENAI_API_KEY` for full AI-powered functionality.

## License

MIT

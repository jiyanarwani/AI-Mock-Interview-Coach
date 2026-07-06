import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.interview import Interview, InterviewResponse as InterviewResponseModel, InterviewStatus
from app.models.user import User
from app.schemas.interview import (
    InterviewCreate,
    InterviewResponse,
    InterviewDetailResponse,
    QuestionResponse,
    TranscriptionRequest,
    TranscriptionResponse,
    AnalysisResponse,
)
from app.services.auth import get_current_user
from app.services.interview_ai import (
    generate_interview_question,
    transcribe_audio,
    detect_filler_words,
    calculate_speaking_speed,
    calculate_confidence_score,
    analyze_response_with_ai,
)
from app.services.scorecard import generate_scorecard_pdf

router = APIRouter(prefix="/api/interviews", tags=["Interviews"])


@router.post("/", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    data: InterviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    interview = Interview(
        user_id=user.id,
        role=data.role,
        experience_level=data.experience_level,
        interview_type=data.interview_type,
        status=InterviewStatus.IN_PROGRESS,
    )
    db.add(interview)
    await db.commit()
    await db.refresh(interview)
    return interview


@router.get("/", response_model=list[InterviewResponse])
async def list_interviews(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview)
        .where(Interview.user_id == user.id)
        .order_by(Interview.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{interview_id}", response_model=InterviewDetailResponse)
async def get_interview(
    interview_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.responses))
        .where(Interview.id == interview_id, Interview.user_id == user.id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview


@router.post("/{interview_id}/question", response_model=QuestionResponse)
async def get_next_question(
    interview_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.responses))
        .where(Interview.id == interview_id, Interview.user_id == user.id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status == InterviewStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Interview already completed")

    question_number = len(interview.responses) + 1
    previous_questions = [r.question_text for r in interview.responses]

    question_text = await generate_interview_question(
        role=interview.role,
        experience_level=interview.experience_level,
        interview_type=interview.interview_type.value,
        question_number=question_number,
        previous_questions=previous_questions,
    )

    response = InterviewResponseModel(
        interview_id=interview.id,
        question_number=question_number,
        question_text=question_text,
    )
    db.add(response)
    await db.commit()

    return QuestionResponse(
        question_number=question_number,
        question_text=question_text,
        interview_id=interview_id,
    )


@router.post("/{interview_id}/transcribe", response_model=TranscriptionResponse)
async def transcribe_response(
    interview_id: uuid.UUID,
    data: TranscriptionRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id, Interview.user_id == user.id
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    result = await db.execute(
        select(InterviewResponseModel).where(
            InterviewResponseModel.interview_id == interview_id,
            InterviewResponseModel.question_number == data.question_number,
        )
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Question not found")

    transcript = await transcribe_audio(data.audio_base64)
    words = transcript.split()
    word_count = len(words)
    speaking_speed = calculate_speaking_speed(word_count, data.duration_seconds)
    filler_words = detect_filler_words(transcript)
    filler_count = sum(filler_words.values())
    filler_ratio = filler_count / max(word_count, 1)
    confidence = calculate_confidence_score(speaking_speed, filler_ratio, word_count)

    response.transcript = transcript
    response.duration_seconds = data.duration_seconds
    response.word_count = word_count
    response.speaking_speed_wpm = speaking_speed
    response.filler_word_count = filler_count
    response.filler_words_detail = filler_words
    response.confidence_score = confidence

    await db.commit()

    return TranscriptionResponse(
        transcript=transcript,
        word_count=word_count,
        speaking_speed_wpm=speaking_speed,
        filler_words=filler_words,
        filler_word_count=filler_count,
        confidence_score=confidence,
    )


@router.post("/{interview_id}/analyze/{question_number}", response_model=AnalysisResponse)
async def analyze_response(
    interview_id: uuid.UUID,
    question_number: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview).where(
            Interview.id == interview_id, Interview.user_id == user.id
        )
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    result = await db.execute(
        select(InterviewResponseModel).where(
            InterviewResponseModel.interview_id == interview_id,
            InterviewResponseModel.question_number == question_number,
        )
    )
    response = result.scalar_one_or_none()
    if not response:
        raise HTTPException(status_code=404, detail="Response not found")
    if not response.transcript:
        raise HTTPException(status_code=400, detail="No transcript available")

    analysis = await analyze_response_with_ai(
        question=response.question_text,
        transcript=response.transcript,
        role=interview.role,
    )

    response.score = analysis["score"]
    response.star_analysis = analysis["star_analysis"]
    response.ai_feedback = analysis["feedback"]

    await db.commit()

    return AnalysisResponse(
        score=response.score,
        star_analysis=response.star_analysis,
        ai_feedback=response.ai_feedback,
        confidence_score=response.confidence_score or 0,
        speaking_speed_wpm=response.speaking_speed_wpm or 0,
        filler_word_count=response.filler_word_count,
        filler_words_detail=response.filler_words_detail or {},
    )


@router.post("/{interview_id}/complete", response_model=InterviewDetailResponse)
async def complete_interview(
    interview_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.responses))
        .where(Interview.id == interview_id, Interview.user_id == user.id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    responses = interview.responses
    if responses:
        scores = [r.score for r in responses if r.score is not None]
        speeds = [r.speaking_speed_wpm for r in responses if r.speaking_speed_wpm is not None]
        confidences = [r.confidence_score for r in responses if r.confidence_score is not None]

        interview.overall_score = sum(scores) / len(scores) if scores else None
        interview.avg_speaking_speed = sum(speeds) / len(speeds) if speeds else None
        interview.confidence_score = sum(confidences) / len(confidences) if confidences else None
        interview.total_filler_words = sum(r.filler_word_count for r in responses)

        interview.feedback_summary = _generate_feedback_summary(interview, responses)

    interview.status = InterviewStatus.COMPLETED
    interview.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(interview)
    return interview


@router.get("/{interview_id}/scorecard")
async def download_scorecard(
    interview_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Interview)
        .options(selectinload(Interview.responses))
        .where(Interview.id == interview_id, Interview.user_id == user.id)
    )
    interview = result.scalar_one_or_none()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    if interview.status != InterviewStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Interview not yet completed")

    pdf_bytes = generate_scorecard_pdf(interview)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="scorecard_{interview_id}.pdf"'
        },
    )


def _generate_feedback_summary(interview: Interview, responses: list) -> str:
    total_q = len(responses)
    avg_score = interview.overall_score or 0
    total_fillers = interview.total_filler_words
    avg_speed = interview.avg_speaking_speed or 0

    summary_parts = [
        f"Interview Summary for {interview.role} ({interview.experience_level}):",
        f"You answered {total_q} question(s) with an average score of {avg_score:.0f}/100.",
    ]

    if avg_speed < 120:
        summary_parts.append("Your speaking pace was a bit slow. Try to speak slightly faster to convey more energy.")
    elif avg_speed > 170:
        summary_parts.append("You spoke quite fast. Consider slowing down to improve clarity.")
    else:
        summary_parts.append("Your speaking pace was within a good range.")

    if total_fillers > total_q * 5:
        summary_parts.append(f"You used {total_fillers} filler words total. Work on reducing these for a more polished delivery.")
    elif total_fillers > 0:
        summary_parts.append(f"You used {total_fillers} filler word(s) — a reasonable amount, but always aim to reduce them.")

    star_missing = set()
    for resp in responses:
        if resp.star_analysis:
            for component in ["situation", "task", "action", "result"]:
                if component in resp.star_analysis and not resp.star_analysis[component].get("present"):
                    star_missing.add(component.title())

    if star_missing:
        summary_parts.append(f"STAR format: You frequently missed the {', '.join(sorted(star_missing))} component(s). Practice including all four elements.")

    return " ".join(summary_parts)

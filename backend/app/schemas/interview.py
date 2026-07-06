import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.interview import InterviewStatus, InterviewType


class InterviewCreate(BaseModel):
    role: str
    experience_level: str
    interview_type: InterviewType = InterviewType.BEHAVIORAL


class InterviewResponse(BaseModel):
    id: uuid.UUID
    role: str
    experience_level: str
    interview_type: InterviewType
    status: InterviewStatus
    overall_score: float | None
    total_filler_words: int
    avg_speaking_speed: float | None
    confidence_score: float | None
    feedback_summary: str | None
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class QuestionResponse(BaseModel):
    question_number: int
    question_text: str
    interview_id: uuid.UUID


class TranscriptionRequest(BaseModel):
    audio_base64: str
    question_number: int
    duration_seconds: float


class TranscriptionResponse(BaseModel):
    transcript: str
    word_count: int
    speaking_speed_wpm: float
    filler_words: dict[str, int]
    filler_word_count: int
    confidence_score: float


class AnalysisResponse(BaseModel):
    score: float
    star_analysis: dict
    ai_feedback: str
    confidence_score: float
    speaking_speed_wpm: float
    filler_word_count: int
    filler_words_detail: dict[str, int]


class ResponseDetail(BaseModel):
    id: uuid.UUID
    question_number: int
    question_text: str
    transcript: str | None
    duration_seconds: float | None
    word_count: int
    speaking_speed_wpm: float | None
    filler_word_count: int
    filler_words_detail: dict | None
    confidence_score: float | None
    star_analysis: dict | None
    ai_feedback: str | None
    score: float | None

    model_config = {"from_attributes": True}


class InterviewDetailResponse(InterviewResponse):
    responses: list[ResponseDetail] = []

    model_config = {"from_attributes": True}

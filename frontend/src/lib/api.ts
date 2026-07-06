const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }

  return res as unknown as T;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Interview {
  id: string;
  role: string;
  experience_level: string;
  interview_type: string;
  status: string;
  overall_score: number | null;
  total_filler_words: number;
  avg_speaking_speed: number | null;
  confidence_score: number | null;
  feedback_summary: string | null;
  created_at: string;
  completed_at: string | null;
  responses?: ResponseDetail[];
}

export interface ResponseDetail {
  id: string;
  question_number: number;
  question_text: string;
  transcript: string | null;
  duration_seconds: number | null;
  word_count: number;
  speaking_speed_wpm: number | null;
  filler_word_count: number;
  filler_words_detail: Record<string, number> | null;
  confidence_score: number | null;
  star_analysis: StarAnalysis | null;
  ai_feedback: string | null;
  score: number | null;
}

export interface StarAnalysis {
  situation: StarComponent;
  task: StarComponent;
  action: StarComponent;
  result: StarComponent;
}

export interface StarComponent {
  present: boolean;
  feedback: string;
  suggestion: string;
}

export interface QuestionData {
  question_number: number;
  question_text: string;
  interview_id: string;
}

export interface TranscriptionResult {
  transcript: string;
  word_count: number;
  speaking_speed_wpm: number;
  filler_words: Record<string, number>;
  filler_word_count: number;
  confidence_score: number;
}

export interface AnalysisResult {
  score: number;
  star_analysis: StarAnalysis;
  ai_feedback: string;
  confidence_score: number;
  speaking_speed_wpm: number;
  filler_word_count: number;
  filler_words_detail: Record<string, number>;
}

export const api = {
  auth: {
    register: (data: { email: string; password: string; full_name: string }) =>
      request<User>("/api/auth/register", { method: "POST", body: data }),

    login: (data: { email: string; password: string }) =>
      request<{ access_token: string; token_type: string }>("/api/auth/login", {
        method: "POST",
        body: data,
      }),
  },

  interviews: {
    create: (token: string, data: { role: string; experience_level: string; interview_type: string }) =>
      request<Interview>("/api/interviews/", { method: "POST", body: data, token }),

    list: (token: string) =>
      request<Interview[]>("/api/interviews/", { token }),

    get: (token: string, id: string) =>
      request<Interview>(`/api/interviews/${id}`, { token }),

    getQuestion: (token: string, id: string) =>
      request<QuestionData>(`/api/interviews/${id}/question`, { method: "POST", token }),

    transcribe: (token: string, id: string, data: { audio_base64: string; question_number: number; duration_seconds: number }) =>
      request<TranscriptionResult>(`/api/interviews/${id}/transcribe`, { method: "POST", body: data, token }),

    analyze: (token: string, id: string, questionNumber: number) =>
      request<AnalysisResult>(`/api/interviews/${id}/analyze/${questionNumber}`, { method: "POST", token }),

    complete: (token: string, id: string) =>
      request<Interview>(`/api/interviews/${id}/complete`, { method: "POST", token }),

    downloadScorecard: async (token: string, id: string) => {
      const res = await fetch(`${API_BASE}/api/interviews/${id}/scorecard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to download scorecard");
      return res.blob();
    },
  },
};

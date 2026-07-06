"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  type QuestionData,
  type TranscriptionResult,
  type AnalysisResult,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Mic,
  MicOff,
  Loader2,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

type SessionPhase =
  | "loading"
  | "question"
  | "recording"
  | "transcribing"
  | "analyzing"
  | "feedback"
  | "complete";

export default function InterviewSessionPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;
  const { token, isLoading: authLoading } = useAuth();

  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadNextQuestion = useCallback(async () => {
    if (!token) return;
    setPhase("loading");
    setTranscription(null);
    setAnalysis(null);
    setError("");

    try {
      const question = await api.interviews.getQuestion(token, interviewId);
      setCurrentQuestion(question);
      setQuestionCount(question.question_number);
      setPhase("question");
    } catch (err) {
      if (err instanceof Error && err.message.includes("already completed")) {
        setPhase("complete");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load question");
        setPhase("question");
      }
    }
  }, [token, interviewId]);

  const didLoadRef = useRef(false);
  useEffect(() => {
    if (token && !authLoading && !didLoadRef.current) {
      didLoadRef.current = true;
      loadNextQuestion();
    }
  }, [token, authLoading, loadNextQuestion]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(250);
      startTimeRef.current = Date.now();
      setRecordingTime(0);
      setPhase("recording");

      timerRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || !token || !currentQuestion) return;

    const duration = (Date.now() - startTimeRef.current) / 1000;
    if (timerRef.current) clearInterval(timerRef.current);

    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setPhase("transcribing");

          try {
            const result = await api.interviews.transcribe(
              token,
              interviewId,
              {
                audio_base64: base64,
                question_number: currentQuestion.question_number,
                duration_seconds: duration,
              },
            );
            setTranscription(result);
            setPhase("analyzing");

            const analysisResult = await api.interviews.analyze(
              token,
              interviewId,
              currentQuestion.question_number,
            );
            setAnalysis(analysisResult);
            setPhase("feedback");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Failed to process response",
            );
            setPhase("question");
          }
          resolve();
        };
        reader.readAsDataURL(blob);
      };

      recorder.stop();
    });
  };

  const handleComplete = async () => {
    if (!token) return;
    setPhase("loading");
    try {
      await api.interviews.complete(token, interviewId);
      router.push(`/interview/${interviewId}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete");
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Question {questionCount} of 5
            </span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-8 rounded-full ${
                    i < questionCount
                      ? "bg-primary"
                      : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
          {questionCount >= 1 && (
            <button
              onClick={handleComplete}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              End Interview
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {phase === "loading" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading question...</p>
          </div>
        )}

        {(phase === "question" || phase === "recording") && currentQuestion && (
          <div className="space-y-8">
            <div className="bg-card rounded-2xl border border-border p-8">
              <p className="text-xs font-medium text-primary mb-3 uppercase tracking-wider">
                Question {currentQuestion.question_number}
              </p>
              <p className="text-xl font-medium text-card-foreground leading-relaxed">
                {currentQuestion.question_text}
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              {phase === "recording" ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-danger/20 rounded-full animate-pulse-ring" />
                    <button
                      onClick={stopRecording}
                      className="relative w-24 h-24 bg-danger text-white rounded-full flex items-center justify-center hover:bg-danger/90 transition-colors shadow-lg"
                    >
                      <MicOff className="w-10 h-10" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-danger font-medium">
                    <div className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                    Recording — {formatTime(recordingTime)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click to stop recording
                  </p>
                </>
              ) : (
                <>
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
                  >
                    <Mic className="w-10 h-10" />
                  </button>
                  <p className="text-muted-foreground">
                    Click to start recording your answer
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {phase === "transcribing" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">
              Transcribing your response...
            </p>
            <p className="text-sm text-muted-foreground">
              Using AI to convert your speech to text
            </p>
          </div>
        )}

        {phase === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 animate-spin text-secondary mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">
              Analyzing your answer...
            </p>
            <p className="text-sm text-muted-foreground">
              Evaluating STAR format, confidence, and content
            </p>
          </div>
        )}

        {phase === "feedback" && transcription && analysis && currentQuestion && (
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                Your Transcript
              </h3>
              <p className="text-card-foreground leading-relaxed">
                {transcription.transcript}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Score"
                value={`${analysis.score.toFixed(0)}/100`}
                color={analysis.score >= 70 ? "text-success" : "text-warning"}
              />
              <MetricCard
                label="Speed"
                value={`${transcription.speaking_speed_wpm.toFixed(0)} WPM`}
                color="text-accent"
              />
              <MetricCard
                label="Filler Words"
                value={String(transcription.filler_word_count)}
                color={
                  transcription.filler_word_count <= 3
                    ? "text-success"
                    : "text-warning"
                }
              />
              <MetricCard
                label="Confidence"
                value={`${transcription.confidence_score.toFixed(0)}/100`}
                color={
                  transcription.confidence_score >= 70
                    ? "text-success"
                    : "text-warning"
                }
              />
            </div>

            {Object.keys(transcription.filler_words).length > 0 && (
              <div className="bg-warning/5 border border-warning/20 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-warning mb-2">
                  Filler Words Detected
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(transcription.filler_words).map(
                    ([word, count]) => (
                      <span
                        key={word}
                        className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm"
                      >
                        &ldquo;{word}&rdquo; × {count}
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                STAR Format Analysis
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(
                  ["situation", "task", "action", "result"] as const
                ).map((key) => {
                  const item = analysis.star_analysis[key];
                  if (!item) return null;
                  return (
                    <div
                      key={key}
                      className={`p-4 rounded-xl border ${
                        item.present
                          ? "border-success/30 bg-success/5"
                          : "border-danger/30 bg-danger/5"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {item.present ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-danger" />
                        )}
                        <span className="font-semibold text-card-foreground capitalize">
                          {key}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.feedback}
                      </p>
                      {item.suggestion && (
                        <p className="text-xs text-primary mt-2">
                          Tip: {item.suggestion}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                AI Feedback
              </h3>
              <p className="text-card-foreground leading-relaxed">
                {analysis.ai_feedback}
              </p>
            </div>

            <div className="flex justify-end gap-4">
              {questionCount < 5 ? (
                <button
                  onClick={loadNextQuestion}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Next Question
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-2 px-6 py-3 bg-success text-white font-medium rounded-xl hover:bg-success/90 transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Complete Interview
                </button>
              )}
            </div>
          </div>
        )}

        {phase === "complete" && (
          <div className="flex flex-col items-center justify-center py-24">
            <CheckCircle className="w-16 h-16 text-success mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Interview Complete!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your responses have been analyzed
            </p>
            <button
              onClick={() =>
                router.push(`/interview/${interviewId}/results`)
              }
              className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              View Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

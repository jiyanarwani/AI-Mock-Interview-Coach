"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, type Interview } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Download,
  Loader2,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Clock,
  MessageSquare,
  Target,
  ArrowLeft,
} from "lucide-react";

export default function InterviewResultsPage() {
  const router = useRouter();
  const params = useParams();
  const interviewId = params.id as string;
  const { token, isLoading: authLoading } = useAuth();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }

    api.interviews
      .get(token, interviewId)
      .then(setInterview)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, authLoading, router, interviewId]);

  const handleDownload = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const blob = await api.interviews.downloadScorecard(token, interviewId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scorecard_${interviewId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download scorecard");
    } finally {
      setDownloading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
          <p className="text-danger">{error || "Interview not found"}</p>
        </div>
      </div>
    );
  }

  const score = interview.overall_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-danger";
  const scoreLabel =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Good"
        : "Needs Improvement";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Interview Results
              </h1>
              <p className="text-sm text-muted-foreground">
                {interview.role} — {interview.interview_type.replace("_", " ")}{" "}
                — {new Date(interview.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading || interview.status !== "completed"}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 mb-8">
          <div className="text-center mb-8">
            <p className={`text-6xl font-bold ${scoreColor} mb-2`}>
              {score.toFixed(0)}
            </p>
            <p className={`text-lg font-medium ${scoreColor}`}>{scoreLabel}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<BarChart3 className="w-5 h-5 text-primary" />}
              label="Overall Score"
              value={`${score.toFixed(0)}/100`}
            />
            <StatCard
              icon={<Clock className="w-5 h-5 text-accent" />}
              label="Avg Speed"
              value={`${interview.avg_speaking_speed?.toFixed(0) ?? "—"} WPM`}
            />
            <StatCard
              icon={<MessageSquare className="w-5 h-5 text-warning" />}
              label="Filler Words"
              value={String(interview.total_filler_words)}
            />
            <StatCard
              icon={<Target className="w-5 h-5 text-secondary" />}
              label="Confidence"
              value={`${interview.confidence_score?.toFixed(0) ?? "—"}/100`}
            />
          </div>
        </div>

        {interview.feedback_summary && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mb-8">
            <h3 className="font-semibold text-foreground mb-2">
              Overall Feedback
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {interview.feedback_summary}
            </p>
          </div>
        )}

        <h2 className="text-xl font-bold text-foreground mb-4">
          Question-by-Question Breakdown
        </h2>

        <div className="space-y-6">
          {interview.responses
            ?.sort((a, b) => a.question_number - b.question_number)
            .map((resp) => (
              <div
                key={resp.id}
                className="bg-card rounded-2xl border border-border p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
                      Question {resp.question_number}
                    </p>
                    <p className="font-medium text-card-foreground">
                      {resp.question_text}
                    </p>
                  </div>
                  {resp.score !== null && (
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        resp.score >= 70
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {resp.score.toFixed(0)}/100
                    </span>
                  )}
                </div>

                {resp.transcript && (
                  <div className="mb-4 p-4 bg-muted rounded-xl">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {resp.transcript}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Speed</span>
                    <p className="font-semibold">
                      {resp.speaking_speed_wpm?.toFixed(0) ?? "—"} WPM
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Filler Words</span>
                    <p className="font-semibold">{resp.filler_word_count}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence</span>
                    <p className="font-semibold">
                      {resp.confidence_score?.toFixed(0) ?? "—"}/100
                    </p>
                  </div>
                </div>

                {resp.filler_words_detail &&
                  Object.keys(resp.filler_words_detail).length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(resp.filler_words_detail).map(
                          ([word, count]) => (
                            <span
                              key={word}
                              className="px-2 py-0.5 bg-warning/10 text-warning rounded text-xs"
                            >
                              &ldquo;{word}&rdquo; × {count}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {resp.star_analysis && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      STAR Analysis
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        ["situation", "task", "action", "result"] as const
                      ).map((key) => {
                        const item =
                          resp.star_analysis?.[key];
                        if (!item) return null;
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg text-center ${
                              item.present
                                ? "bg-success/10 text-success"
                                : "bg-danger/10 text-danger"
                            }`}
                          >
                            {item.present ? (
                              <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 mx-auto mb-1" />
                            )}
                            <p className="text-xs font-semibold capitalize">
                              {key}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {resp.ai_feedback && (
                  <div className="p-4 bg-primary/5 rounded-xl">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {resp.ai_feedback}
                    </p>
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/interview/setup"
            className="px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
          >
            Practice Another Interview
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-border text-foreground font-medium rounded-xl hover:bg-muted transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-card-foreground">{value}</p>
    </div>
  );
}

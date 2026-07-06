"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, type Interview } from "@/lib/api";
import Navbar from "@/components/Navbar";
import {
  Plus,
  Clock,
  CheckCircle,
  BarChart3,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80
      ? "text-success bg-success/10"
      : score >= 60
        ? "text-warning bg-warning/10"
        : "text-danger bg-danger/10";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
      {score.toFixed(0)}/100
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { token, user, isLoading: authLoading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }

    api.interviews
      .list(token)
      .then(setInterviews)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  const handleDownloadScorecard = async (interviewId: string) => {
    if (!token) return;
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
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.full_name}
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your interview practice progress
            </p>
          </div>
          <Link
            href="/interview/setup"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Interview
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {interviews.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No interviews yet
            </h2>
            <p className="text-muted-foreground mb-6">
              Start your first mock interview to get AI-powered feedback
            </p>
            <Link
              href="/interview/setup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Start Your First Interview
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        interview.status === "completed"
                          ? "bg-success/10"
                          : "bg-warning/10"
                      }`}
                    >
                      {interview.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <Clock className="w-5 h-5 text-warning" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-card-foreground">
                        {interview.role}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {interview.interview_type.replace("_", " ")} •{" "}
                        {interview.experience_level} •{" "}
                        {new Date(interview.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <ScoreBadge score={interview.overall_score} />

                    {interview.status === "completed" ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/interview/${interview.id}/results`}
                          className="px-4 py-2 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                        >
                          View Results
                        </Link>
                        <button
                          onClick={() =>
                            handleDownloadScorecard(interview.id)
                          }
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                          title="Download Scorecard"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <Link
                        href={`/interview/${interview.id}/session`}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        Continue
                      </Link>
                    )}
                  </div>
                </div>

                {interview.status === "completed" && (
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Speed</span>
                      <p className="font-semibold text-card-foreground">
                        {interview.avg_speaking_speed?.toFixed(0) ?? "—"} WPM
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Filler Words
                      </span>
                      <p className="font-semibold text-card-foreground">
                        {interview.total_filler_words}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence</span>
                      <p className="font-semibold text-card-foreground">
                        {interview.confidence_score?.toFixed(0) ?? "—"}/100
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

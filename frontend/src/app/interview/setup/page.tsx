"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Loader2, Briefcase, GraduationCap, MessageSquare } from "lucide-react";

const interviewTypes = [
  {
    value: "behavioral",
    label: "Behavioral",
    desc: "Questions about past experiences and how you handled situations",
    icon: MessageSquare,
  },
  {
    value: "technical",
    label: "Technical",
    desc: "Questions about technical skills, system design, and problem-solving",
    icon: Briefcase,
  },
  {
    value: "situational",
    label: "Situational",
    desc: "Hypothetical scenarios to assess your decision-making skills",
    icon: GraduationCap,
  },
  {
    value: "mixed",
    label: "Mixed",
    desc: "A combination of behavioral, technical, and general questions",
    icon: MessageSquare,
  },
];

const experienceLevels = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (2-5 years)" },
  { value: "senior", label: "Senior Level (5-10 years)" },
  { value: "lead", label: "Lead / Staff (10+ years)" },
];

export default function InterviewSetupPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !role || !experienceLevel || !interviewType) return;
    setError("");
    setLoading(true);

    try {
      const interview = await api.interviews.create(token, {
        role,
        experience_level: experienceLevel,
        interview_type: interviewType,
      });
      router.push(`/interview/${interview.id}/session`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interview");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Set Up Your Interview
        </h1>
        <p className="text-muted-foreground mb-8">
          Configure your mock interview session
        </p>

        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleStart} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Target Role
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-border bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="e.g. Frontend Developer, Product Manager, Data Scientist"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Experience Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              {experienceLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setExperienceLevel(level.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    experienceLevel === level.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium text-card-foreground">
                    {level.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Interview Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {interviewTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setInterviewType(type.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    interviewType === type.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <type.icon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-card-foreground">
                      {type.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !role || !experienceLevel || !interviewType}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Start Interview
          </button>
        </form>
      </div>
    </div>
  );
}

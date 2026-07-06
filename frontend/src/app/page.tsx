"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Mic,
  Brain,
  FileText,
  BarChart3,
  MessageSquare,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Voice-Based Interviews",
    description:
      "Practice speaking your answers naturally with real-time speech-to-text transcription powered by OpenAI Whisper.",
  },
  {
    icon: Brain,
    title: "AI-Powered Questions",
    description:
      "Get role-specific interview questions tailored to your experience level and interview type.",
  },
  {
    icon: BarChart3,
    title: "Speaking Analysis",
    description:
      "Track your speaking speed, confidence level, and get detailed metrics on your verbal delivery.",
  },
  {
    icon: MessageSquare,
    title: "Filler Word Detection",
    description:
      'Identify and reduce filler words like "um", "like", "you know" to sound more professional.',
  },
  {
    icon: Zap,
    title: "STAR Format Coaching",
    description:
      "Get feedback on how well you structure answers using Situation, Task, Action, Result format.",
  },
  {
    icon: FileText,
    title: "PDF Scorecard",
    description:
      "Download a comprehensive interview scorecard with detailed analysis and improvement suggestions.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground">
              Ace Your Next
              <span className="block text-primary">Interview</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Practice mock interviews with an AI interviewer. Get real-time
              feedback on your speaking skills, answer structure, and
              confidence.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25"
              >
                Start Practicing Free
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Everything You Need to Prepare
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              AI-powered tools to help you practice, improve, and succeed.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              How It Works
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Set Up Your Interview",
                desc: "Choose your target role, experience level, and interview type.",
              },
              {
                step: "2",
                title: "Practice with AI",
                desc: "Answer questions using your voice. The AI transcribes and analyzes in real-time.",
              },
              {
                step: "3",
                title: "Get Your Scorecard",
                desc: "Review detailed feedback, STAR analysis, and download your PDF scorecard.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground text-sm">
          <p>AI Interview Coach — Built with Next.js, FastAPI, and OpenAI</p>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useFormContext } from "@/contexts/FormContext";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasIncompleteForm } = useFormContext();

  // Show loading state while contexts are initializing
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Cardiovascular Risk Assessment
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              Advanced AI-powered cardiovascular disease prediction tool specifically designed
              for Chronic Myelogenous Leukemia (CML) patients. Get accurate risk assessments using
              state-of-the-art machine learning algorithms.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
                <div className="text-xl sm:text-2xl font-bold mb-3">Transparent Risk Analysis</div>
                <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  No "black box". See clearly how factors (BMI, blood pressure, etc.) affect your risk with XAI and SHAP technology.
                </div>
              </div>
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
                <div className="text-xl sm:text-2xl font-bold mb-3">Proactive Scenario Planning</div>
                <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  Simulate instantly how changing your values affects risk with "What-If" analysis. Discover the power of your decisions.
                </div>
              </div>
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl p-6 transition-all duration-300 text-left sm:text-center">
                <div className="text-xl sm:text-2xl font-bold mb-3">Round-the-Clock Access</div>
                <div className="text-xs sm:text-sm text-white/80 leading-relaxed">
                  Get instant risk assessments whenever you need them. Available 24/7 for your convenience and peace of mind.
                </div>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="pt-6 flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard?action=start"
                className="inline-flex items-center gap-3 bg-white text-brand-600 hover:bg-white/90 px-8 py-4 rounded-pill font-semibold transition"
              >
                Start Assessment
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              
              {user && hasIncompleteForm ? (
                <Link
                  href="/dashboard?action=continue"
                  className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Continue Assessment
                </Link>
              ) : user ? (
                <Link
                  href="/dashboard?action=start"
                  className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start New Assessment
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-pill font-semibold transition backdrop-blur-sm border border-white/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
              Our advanced AI models provide accurate cardiovascular risk assessments 
              specifically tailored for CML patients.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">AI-Powered Analysis</h3>
              <p className="text-foreground/70">
                State-of-the-art machine learning algorithms trained on thousands of CML patient records.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Results</h3>
              <p className="text-foreground/70">
                Get instant risk assessments and detailed analysis reports within seconds.
              </p>
            </div>
            
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Secure & Private</h3>
              <p className="text-foreground/70">
                Your patient data is encrypted and secure. We follow strict privacy protocols.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto py-8 text-center text-xs text-foreground/70 bg-background">
        © UM Institute of Data Science
      </footer>
    </div>
  );
}

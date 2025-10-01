"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");

  const handleInput = (key: keyof typeof formData) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFormData(prev => ({ ...prev, [key]: value }));
      if (errors[key]) {
        setErrors(prev => ({ ...prev, [key]: "" }));
      }
    };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      const success = await login(formData.email, formData.password);
      if (success) {
        // Redirect to dashboard after successful login
        router.push("/dashboard");
      } else {
        setErrors({ 
          password: "Wrong password. Please try again." 
        });
      }
    } catch (error) {
      setErrors({ 
        password: "An error occurred. Please try again." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    
    setIsForgotLoading(true);
    setForgotMessage("");
    
    // Simulate checking if email exists in database
    setTimeout(() => {
      setIsForgotLoading(false);
      if (forgotEmail === "admin@admin.com") {
        setForgotMessage("Password reset email sent! Please check your inbox.");
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotEmail("");
          setForgotMessage("");
        }, 2000);
      } else {
        setForgotMessage("Email not found in our database. Please contact administrator.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Doctor
              <br />
              Portal
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              Access the advanced AI-powered cardiovascular risk assessment tool 
              for Chronic Myelogenous Leukemia (CML) patients. Secure login for 
              medical professionals.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-2">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">96.4%</div>
                <div className="text-xs uppercase tracking-wide">Accuracy Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">2319</div>
                <div className="text-xs uppercase tracking-wide">Patients Assessed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">24/7</div>
                <div className="text-xs uppercase tracking-wide">Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold">AI</div>
                <div className="text-xs uppercase tracking-wide">Powered</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="bg-panel rounded-2xl p-8 shadow-lg border border-black/10">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-white mb-2">Welcome Back</h2>
              <p className="text-white-600 text-sm">Sign in to access the assessment tool</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleInput("email")}
                  className={`w-full rounded-pill border px-4 py-3 outline-none focus:ring-2 ${
                    errors.email 
                      ? "border-red-500 focus:ring-red-500" 
                      : "border-black/10 focus:ring-brand-400"
                  } bg-white text-black placeholder-gray-400`}
                  placeholder="admin@admin.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={handleInput("password")}
                  className={`w-full rounded-pill border px-4 py-3 outline-none focus:ring-2 ${
                    errors.password 
                      ? "border-red-500 focus:ring-red-500" 
                      : "border-black/10 focus:ring-brand-400"
                  } bg-white text-black placeholder-gray-400`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="ml-2 text-sm text-white">Remember me</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-brand-600 hover:text-brand-700"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-pill py-3 px-6 font-semibold text-white transition ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-brand-600 hover:bg-brand-700"
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-white">
                Don't have an account?{" "}
                <a href="#" className="text-brand-600 hover:text-brand-700 font-semibold">
                  Contact Administrator
                </a>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-white">
              Secure login powered by enterprise-grade authentication
            </p>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-xs text-white/70">
        © UM Institute of Data Science
      </footer>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-black">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotEmail("");
                  setForgotMessage("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Enter your email address and we'll send you a password reset link.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-black mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-pill border border-black/10 px-4 py-3 outline-none focus:ring-2 focus:ring-brand-400 bg-white text-black placeholder-gray-500"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {forgotMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  forgotMessage.includes("sent") 
                    ? "bg-green-50 text-green-700 border border-green-200" 
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {forgotMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail("");
                    setForgotMessage("");
                  }}
                  className="flex-1 rounded-pill py-3 px-6 font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotLoading || !forgotEmail}
                  className={`flex-1 rounded-pill py-3 px-6 font-semibold text-white transition ${
                    isForgotLoading || !forgotEmail
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-brand-600 hover:bg-brand-700"
                  }`}
                >
                  {isForgotLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

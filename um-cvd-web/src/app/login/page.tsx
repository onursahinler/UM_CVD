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

  return (
    <div className="min-h-screen w-full flex flex-col">
      <header className="grad-hero text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <h1 className="font-display text-5xl sm:text-7xl leading-tight tracking-wide">
              Doctor Portal
            </h1>
            <p className="max-w-3xl text-white/90 text-sm sm:text-base">
              Access the advanced AI-powered cardiovascular risk assessment tool 
              for Chronic Myelogenous Leukemia (CML) patients. Secure login for 
              medical professionals.
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
                  placeholder="doctor@hospital.com"
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

    </div>
  );
}

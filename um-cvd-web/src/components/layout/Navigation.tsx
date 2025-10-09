"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, memo } from "react";
import { useAuth } from "@/contexts/AuthContext";

const Navigation = memo(() => {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Assessment" },
    ...(user ? [] : [{ href: "/login", label: "Login" }]),
  ];

  return (
    <nav className="bg-panel shadow-sm border-b border-foreground/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CVD</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">
              Risk Assessment
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-brand-100 text-brand-700"
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
            
            {/* User Menu */}
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-foreground/70">
                  Welcome, {user.name || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden print:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground/70 hover:text-foreground focus:outline-none focus:text-foreground"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden print:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-foreground/10">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-brand-100 text-brand-700"
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile User Menu */}
              {user && (
                <div className="pt-2 border-t border-foreground/10 mt-2">
                  <div className="px-3 py-2 text-sm text-foreground/70">
                    Welcome, {user.name || user.email}
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export { Navigation };

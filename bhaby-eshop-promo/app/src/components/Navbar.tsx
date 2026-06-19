"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "/bhaby-eshop.apk";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      data-testid="nav-bar"
      className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center" data-testid="nav-logo">
            <Logo variant="full" className="h-10" />
          </Link>

          {/* Desktop nav links */}
          <div data-testid="nav-links" className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-[#1E3A5F] hover:text-[#2563EB] font-medium transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-[#1E3A5F] hover:text-[#2563EB] font-medium transition-colors">
              How It Works
            </a>
            <a href="#preview" className="text-[#1E3A5F] hover:text-[#2563EB] font-medium transition-colors">
              Preview
            </a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            <Link
              href={APK_URL}
              data-testid="nav-download-cta"
              download
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg px-6 py-2.5 shadow focus:ring-2 focus:ring-blue-300 focus:outline-none transition-colors"
            >
              Download App
            </Link>
          </div>

          {/* Mobile: hamburger + CTA */}
          <div className="flex items-center gap-3 md:hidden">
            <Link
              href={APK_URL}
              data-testid="nav-download-cta"
              download
              className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg px-4 py-2 text-sm shadow focus:ring-2 focus:ring-blue-300 focus:outline-none transition-colors"
            >
              Download
            </Link>
            <button
              data-testid="nav-hamburger"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              className="p-2 rounded-lg text-[#1E3A5F] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div data-testid="nav-mobile-menu" className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-4">
            <a href="#features" onClick={() => setMenuOpen(false)}
              className="text-[#1E3A5F] hover:text-[#2563EB] font-medium py-2 transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}
              className="text-[#1E3A5F] hover:text-[#2563EB] font-medium py-2 transition-colors">
              How It Works
            </a>
            <a href="#preview" onClick={() => setMenuOpen(false)}
              className="text-[#1E3A5F] hover:text-[#2563EB] font-medium py-2 transition-colors">
              Preview
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

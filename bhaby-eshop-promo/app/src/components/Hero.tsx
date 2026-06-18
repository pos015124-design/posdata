"use client";

import { useState, useEffect, useRef } from "react";
import { detectPlatform, getPlatformMessage } from "@/lib/platform";

const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "/bhaby-eshop.apk";
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL || "";

// When NEXT_PUBLIC_PLAY_STORE_URL is set, the button links to Play Store.
// When not set, it downloads the APK directly.
const isPlayStore = !!PLAY_STORE_URL;

interface HeroProps {
  initialCount: number;
}

// Animated SVG – download arrow that draws itself
function DownloadArrowSVG({ animating }: { animating: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      {/* Vertical shaft */}
      <line
        x1="12" y1="3" x2="12" y2="15"
        style={{
          strokeDasharray: 12,
          strokeDashoffset: animating ? 0 : 12,
          transition: animating ? "stroke-dashoffset 0.35s ease 0s" : "none",
        }}
      />
      {/* Left arrow wing */}
      <line
        x1="7.5" y1="10.5" x2="12" y2="15"
        style={{
          strokeDasharray: 7,
          strokeDashoffset: animating ? 0 : 7,
          transition: animating ? "stroke-dashoffset 0.3s ease 0.15s" : "none",
        }}
      />
      {/* Right arrow wing */}
      <line
        x1="16.5" y1="10.5" x2="12" y2="15"
        style={{
          strokeDasharray: 7,
          strokeDashoffset: animating ? 0 : 7,
          transition: animating ? "stroke-dashoffset 0.3s ease 0.15s" : "none",
        }}
      />
      {/* Base line */}
      <line
        x1="4" y1="20" x2="20" y2="20"
        style={{
          strokeDasharray: 16,
          strokeDashoffset: animating ? 0 : 16,
          transition: animating ? "stroke-dashoffset 0.35s ease 0.3s" : "none",
        }}
      />
    </svg>
  );
}

// Floating background particles
function Particles() {
  const particles = [
    { w: 10, h: 10, top: "15%", left: "8%",  dur: "6s",  delay: "0s" },
    { w: 6,  h: 6,  top: "70%", left: "12%", dur: "8s",  delay: "1s" },
    { w: 14, h: 14, top: "30%", left: "88%", dur: "7s",  delay: "2s" },
    { w: 8,  h: 8,  top: "80%", left: "82%", dur: "9s",  delay: "0.5s" },
    { w: 5,  h: 5,  top: "50%", left: "50%", dur: "5s",  delay: "3s" },
    { w: 12, h: 12, top: "20%", left: "60%", dur: "10s", delay: "1.5s" },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            width: p.w,
            height: p.h,
            top: p.top,
            left: p.left,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}
        />
      ))}
    </>
  );
}

export default function Hero({ initialCount }: HeroProps) {
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [arrowAnim, setArrowAnim] = useState(false);
  const [platformMessage, setPlatformMessage] = useState(
    "Open this page on your phone or mobile device to download the app."
  );
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // Entrance animation states
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const platform = detectPlatform();
    if (isPlayStore) {
      setPlatformMessage("Available on Google Play — tap to install instantly.");
    } else {
      setPlatformMessage(getPlatformMessage(platform));
    }
  }, []);

  async function handleDownload(e: React.MouseEvent | React.KeyboardEvent) {
    if (loading) return;
    e.preventDefault();

    // Play Store mode — open in new tab, track the click
    if (isPlayStore) {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
      try {
        const platform = detectPlatform();
        const res = await fetch("/api/track-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform }),
        });
        if (res.ok) {
          const data = await res.json();
          setCount(data.count);
        }
      } catch (err) {
        console.error("track-download error:", err);
      }
      return;
    }

    // APK mode — trigger download + track
    setLoading(true);
    setArrowAnim(false);
    setTimeout(() => setArrowAnim(true), 20);

    if (downloadLinkRef.current) {
      downloadLinkRef.current.click();
    }

    try {
      const platform = detectPlatform();
      const res = await fetch("/api/track-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      if (res.ok) {
        const data = await res.json();
        setCount(data.count);
      }
    } catch (err) {
      console.error("track-download error:", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setArrowAnim(false);
      }, 1500);
    }
  }

  const base = "transition-all duration-700 ease-out";
  const show = mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8";

  return (
    <section
      data-testid="hero-section"
      className="relative overflow-hidden bg-gradient-to-br from-[#1E3A5F] via-[#274B73] to-[#315C8C] text-white py-20 sm:py-36"
    >
      <Particles />

      {/* Decorative wave at bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60V30C360 0 720 60 1080 30L1440 0V60H0Z" fill="#F8FAFC" />
        </svg>
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Animated badge */}
        <div
          className={`${base} ${show} delay-100 inline-flex items-center gap-2 bg-[#2563EB]/20 border border-[#60A5FA]/40 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium mb-6`}
          style={{ transitionDelay: "0.05s" }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
          </span>
          Tanzania&apos;s #1 Mobile E-Shop
        </div>

        <h1
          data-testid="hero-title"
          className={`${base} ${show} text-5xl sm:text-7xl font-extrabold tracking-tight mb-4`}
          style={{ transitionDelay: "0.15s" }}
        >
          Bhaby{" "}
          <span className="gradient-text">E-Shop</span>
        </h1>

        <p
          data-testid="hero-tagline"
          className={`${base} ${show} text-xl sm:text-2xl font-semibold text-blue-300 mb-6`}
          style={{ transitionDelay: "0.25s" }}
        >
          Shop Smarter. Shop Anywhere.
        </p>

        <p
          data-testid="hero-description"
          className={`${base} ${show} text-base sm:text-lg leading-relaxed text-slate-200 max-w-2xl mx-auto mb-10`}
          style={{ transitionDelay: "0.35s" }}
        >
          Bhaby E-Shop brings you the best of Tanzanian e-commerce in a fast, app-like experience.
          Download the app wrapper for instant access to thousands of products — right on your Android device.
          Browse, compare, and buy with ease, anytime, anywhere.
        </p>

        {/* Download button */}
        <div
          className={`${base} ${show} flex flex-col items-center gap-4 mb-8`}
          style={{ transitionDelay: "0.45s" }}
        >
          <button
            data-testid="hero-download-btn"
            onClick={handleDownload}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleDownload(e);
            }}
            disabled={loading}
            aria-disabled={loading}
            onMouseEnter={() => { if (!loading) { setArrowAnim(false); setTimeout(() => setArrowAnim(true), 20); } }}
            onMouseLeave={() => setArrowAnim(false)}
            className="group relative bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-75 disabled:cursor-not-allowed text-white font-bold rounded-2xl px-10 py-4 text-lg shadow-2xl focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
          >
            {/* Shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            {loading ? (
              <>
                <span
                  data-testid="download-spinner"
                  className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
                  aria-label="Loading"
                />
                Downloading...
              </>
            ) : isPlayStore ? (
              <>
                {/* Google Play icon */}
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.18 23.5c.36.2.8.22 1.2.06l11.2-6.47-2.44-2.44L3.18 23.5zm-1.1-18.8v18.6c0 .46.25.86.62 1.08l10.3-10.3L2.7 3.62c-.38.22-.62.62-.62 1.08zm18.1 8.1l-2.5-1.44-2.73 2.73 2.73 2.73 2.52-1.45c.72-.42.72-1.15-.02-1.57zM4.38.44C3.98.28 3.54.3 3.18.5l10.98 10.98 2.44-2.44L4.38.44z"/>
                </svg>
                Get it on Google Play
              </>
            ) : (
              <>
                <DownloadArrowSVG animating={arrowAnim} />
                Download for Android
              </>
            )}
          </button>

          <a
            ref={downloadLinkRef}
            data-testid="hero-download-link"
            href={APK_URL}
            download
            aria-hidden="true"
            tabIndex={-1}
            className="sr-only"
          >
            Download APK
          </a>
        </div>

        {/* Platform message */}
        <p
          data-testid="platform-message"
          className={`${base} ${show} text-slate-300 text-sm mb-6`}
          style={{ transitionDelay: "0.55s" }}
        >
          {platformMessage}
        </p>

        {/* Download count */}
        <div
          className={`${base} ${show}`}
          style={{ transitionDelay: "0.65s" }}
        >
          {count > 0 ? (
            <div data-testid="download-count" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-slate-200 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span><strong>{count.toLocaleString()}</strong> downloads and counting!</span>
            </div>
          ) : (
            <div data-testid="download-count-empty" className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-5 py-2 text-slate-300 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              <span>Be the first to download — join the Bhaby community!</span>
            </div>
          )}
        </div>

        {/* Scroll cue */}
        <div
          className={`${base} ${show} mt-14 flex flex-col items-center gap-1 text-slate-400 text-xs`}
          style={{ transitionDelay: "0.8s" }}
        >
          <span>Scroll to explore</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-5 h-5 animate-bounce"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>
    </section>
  );
}

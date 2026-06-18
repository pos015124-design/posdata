/**
 * SplashScreen
 *
 * Shown while the React app hydrates after the native Android splash screen.
 * Displays an animated shopping cart SVG on the brand gradient background.
 * Fades out once the app signals it's ready.
 *
 * Usage in main.tsx:
 *   - Renders immediately before React mounts
 *   - Removed from DOM once React root renders
 */

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  /** Minimum display time in ms — prevents flash for fast loads */
  minDuration?: number;
  onDone?: () => void;
}

export default function SplashScreen({ minDuration = 1200, onDone }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading]   = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 400); // fade duration
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration, onDone]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 60%, #7c3aed 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      {/* Animated cart SVG */}
      <div style={{ width: 96, height: 96, marginBottom: 24 }}>
        <svg
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Cart body — draws itself */}
          <path
            d="M10 20 L20 20 L30 65 L80 65 L90 35 L28 35"
            stroke="white"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            style={{
              strokeDasharray: 220,
              strokeDashoffset: 220,
              animation: 'drawCart 0.9s ease forwards 0.1s',
            }}
          />
          {/* Left wheel */}
          <circle
            cx="38"
            cy="78"
            r="8"
            stroke="white"
            strokeWidth="4.5"
            fill="none"
            style={{
              strokeDasharray: 52,
              strokeDashoffset: 52,
              animation: 'drawWheel 0.5s ease forwards 0.85s',
            }}
          />
          {/* Right wheel */}
          <circle
            cx="68"
            cy="78"
            r="8"
            stroke="white"
            strokeWidth="4.5"
            fill="none"
            style={{
              strokeDasharray: 52,
              strokeDashoffset: 52,
              animation: 'drawWheel 0.5s ease forwards 1.0s',
            }}
          />
          {/* Items in cart — appear after cart draws */}
          <rect
            x="38" y="42" width="12" height="14" rx="2"
            fill="rgba(255,255,255,0.7)"
            style={{ opacity: 0, animation: 'popIn 0.3s ease forwards 1.15s' }}
          />
          <rect
            x="55" y="44" width="10" height="12" rx="2"
            fill="rgba(255,255,255,0.5)"
            style={{ opacity: 0, animation: 'popIn 0.3s ease forwards 1.25s' }}
          />
          {/* Sparkle */}
          <g style={{ opacity: 0, animation: 'popIn 0.4s ease forwards 1.4s' }}>
            <line x1="82" y1="18" x2="82" y2="26" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="78" y1="22" x2="86" y2="22" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="79.5" y1="19.5" x2="84.5" y2="24.5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
            <line x1="84.5" y1="19.5" x2="79.5" y2="24.5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          </g>
        </svg>
      </div>

      {/* Brand name */}
      <div style={{
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 900,
        fontSize: 22,
        letterSpacing: '0.15em',
        opacity: 0,
        animation: 'fadeUp 0.5s ease forwards 1.0s',
      }}>
        E-SHOP
      </div>
      <div style={{
        color: 'rgba(255,255,255,0.65)',
        fontFamily: 'Arial, sans-serif',
        fontWeight: 600,
        fontSize: 11,
        letterSpacing: '0.25em',
        marginTop: 4,
        opacity: 0,
        animation: 'fadeUp 0.5s ease forwards 1.1s',
      }}>
        BHABY GROUP LTD
      </div>

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: 6,
        marginTop: 32,
        opacity: 0,
        animation: 'fadeUp 0.4s ease forwards 1.3s',
      }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.7)',
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes drawCart {
          to { stroke-dashoffset: 0; }
        }
        @keyframes drawWheel {
          to { stroke-dashoffset: 0; }
        }
        @keyframes popIn {
          0%   { opacity: 0; transform: scale(0.5); }
          60%  { transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

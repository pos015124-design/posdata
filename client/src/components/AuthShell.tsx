import { CSSProperties, ReactNode } from 'react';
import {
  ShoppingBag,
  Store,
  Package,
  Truck,
  CreditCard,
  Smartphone,
  BarChart3,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import Logo from './Logo';

/**
 * AuthShell — animated split-screen backdrop for the Login / Register pages.
 *
 * Desktop: deep blue→purple branded left panel with drifting marketplace
 * icons + selling points, and the form card on the right.
 * Mobile: a compact branded header strip (icons + logo) above the card, sized
 * so the form still fits the screen.
 *
 * The icon field is decorative (aria-hidden). Each icon follows its own
 * wandering path — the `drift` keyframe reads per-icon --dx1/2/3, --dy1/2/3
 * and --rot1/2/3 CSS vars, so every icon moves along a different translate +
 * rotate + scale loop (random-looking, not a shared up/down float). All motion
 * is disabled under prefers-reduced-motion (Tailwind's motion-safe).
 */

const SELLING_POINTS = [
  { icon: ShoppingBag, title: 'Multi-vendor marketplace', desc: 'Buy and sell across dozens of verified local stores in one place.' },
  { icon: Smartphone, title: 'Pay with mobile money', desc: 'M-Pesa, Tigo Pesa & Airtel Money USSD push — no card needed.' },
  { icon: BarChart3, title: 'Real-time seller tools', desc: 'Live sales, inventory, low-stock alerts and daily reports.' },
];

/** Wander path (px / deg) for each icon — three keyframe waypoints. */
type Wander = { dx: [number, number, number]; dy: [number, number, number]; rot: [number, number, number] };

const WANDER: Wander[] = [
  { dx: [18, -22, 10],  dy: [-16, 12, -8],  rot: [7, -9, 5] },   // ShoppingBag
  { dx: [-20, 14, 24],  dy: [-10, 18, -6],  rot: [-6, 8, -4] },  // Store
  { dx: [14, -18, -10], dy: [-20, 6, 16],   rot: [5, -7, 9] },   // Package
  { dx: [-24, 16, 8],   dy: [-14, -10, 20], rot: [-8, 5, -3] },  // Truck
  { dx: [10, 22, -14],  dy: [-8, -18, 12],  rot: [9, -5, -7] },  // CreditCard
  { dx: [-16, 10, 20],  dy: [14, -12, -18], rot: [-5, 8, 6] },   // Smartphone
  { dx: [22, -12, -20], dy: [-18, 10, 6],   rot: [6, -9, 8] },   // BarChart3
  { dx: [-18, 24, -8],  dy: [10, -20, 14],  rot: [-7, 5, -9] },  // ShieldCheck
  { dx: [12, -16, 18],  dy: [8, -14, -10],  rot: [8, 6, -5] },   // Sparkles
  { dx: [-22, 12, 16],  dy: [-12, 20, -16], rot: [-4, 9, 7] },   // Users
];

/** Floating icon spec: position, size, delay, duration, tint, wander index. */
const FLOATING_ICONS = [
  { Icon: ShoppingBag,  left: '8%',  top: '12%', size: 34, delay: '0s',     duration: '9s',   color: 'text-sky-300/50', ring: true,  wander: 0 },
  { Icon: Store,        left: '72%', top: '18%', size: 40, delay: '1.2s',   duration: '11s',  color: 'text-indigo-300/40', ring: false, wander: 1 },
  { Icon: Package,      left: '16%', top: '48%', size: 30, delay: '2.1s',   duration: '8s',   color: 'text-white/35', ring: true,  wander: 2 },
  { Icon: Truck,        left: '82%', top: '58%', size: 36, delay: '0.6s',   duration: '12s',  color: 'text-sky-300/40', ring: false, wander: 3 },
  { Icon: CreditCard,   left: '6%',  top: '74%', size: 28, delay: '1.8s',   duration: '9.5s', color: 'text-white/35', ring: false, wander: 4 },
  { Icon: Smartphone,   left: '64%', top: '80%', size: 32, delay: '2.8s',   duration: '10s',  color: 'text-indigo-300/50', ring: true, wander: 5 },
  { Icon: BarChart3,    left: '48%', top: '8%',  size: 30, delay: '3.4s',   duration: '8.5s', color: 'text-white/30', ring: false, wander: 6 },
  { Icon: ShieldCheck,  left: '88%', top: '36%', size: 28, delay: '1.5s',   duration: '11.5s', color: 'text-emerald-300/40', ring: false, wander: 7 },
  { Icon: Sparkles,     left: '30%', top: '26%', size: 26, delay: '2.6s',   duration: '7.5s', color: 'text-amber-300/40', ring: false, wander: 8 },
  { Icon: Users,        left: '42%', top: '66%', size: 30, delay: '0.9s',   duration: '10.5s', color: 'text-sky-300/35', ring: true, wander: 9 },
];

function FloatingIconField({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {/* Ambient glows */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] bg-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute top-1/3 left-1/2 w-72 h-72 bg-indigo-400/10 rounded-full blur-3xl" />

      {FLOATING_ICONS.map(({ Icon, left, top, size, delay, duration, color, ring, wander }, i) => {
        const w = WANDER[wander];
        const style: CSSProperties & Record<string, string> = {
          left,
          top,
          animationDelay: delay,
          animationDuration: duration,
          '--dx1': `${w.dx[0]}px`,
          '--dy1': `${w.dy[0]}px`,
          '--rot1': `${w.rot[0]}deg`,
          '--dx2': `${w.dx[1]}px`,
          '--dy2': `${w.dy[1]}px`,
          '--rot2': `${w.rot[1]}deg`,
          '--dx3': `${w.dx[2]}px`,
          '--dy3': `${w.dy[2]}px`,
          '--rot3': `${w.rot[2]}deg`,
        };
        return (
          <span
            key={i}
            className="absolute motion-safe:animate-drift"
            style={style}
          >
            <span
              className={`flex items-center justify-center rounded-2xl ${ring ? 'bg-white/10 ring-1 ring-white/15 backdrop-blur-sm' : ''} ${color}`}
              style={{ width: size + 14, height: size + 14 }}
            >
              <Icon style={{ width: size, height: size }} strokeWidth={1.6} />
            </span>
          </span>
        );
      })}
    </div>
  );
}

export default function AuthShell({ children, heading, subheading, wide = false }: {
  children: ReactNode;
  heading?: string;
  subheading?: string;
  /** wide = max-w-2xl form container (for the longer register form). */
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr] bg-slate-50">
      {/* ── Branded panel (desktop) ─────────────────────────────────────── */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0b1736] via-blue-800 to-purple-800 text-white p-12 xl:p-16">
        <FloatingIconField />

        <div className="relative z-10">
          <Logo variant="white" className="h-12" />
        </div>

        <div className="relative z-10 space-y-8">
          <h1 className="text-4xl xl:text-5xl font-extrabold leading-tight max-w-md">
            {heading || 'Everything your business needs to sell online.'}
          </h1>
          <div className="space-y-6">
            {SELLING_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 max-w-md">
                <span className="shrink-0 w-11 h-11 rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-5 h-5 text-sky-200" strokeWidth={1.8} />
                </span>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm text-white/70 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} BHABY GROUP LTD · E-Shop Marketplace
        </p>
      </div>

      {/* ── Form side ───────────────────────────────────────────────────── */}
      <div className="relative flex flex-col justify-start lg:justify-center items-center min-h-screen p-4 sm:p-8 lg:pt-8">
        {/* Mobile backdrop: compact branded header strip with drifting icons */}
        <div className={`lg:hidden absolute inset-x-0 top-0 overflow-hidden bg-gradient-to-br from-[#0b1736] via-blue-800 to-purple-800 ${wide ? 'h-24' : 'h-32'}`}>
          <FloatingIconField className="opacity-70" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>
        {/* Logo centred over the animated strip — full variant so the brand
            colours (teal + navy) are visible against the dark background */}
        <div className={`lg:hidden relative z-10 w-full flex justify-center ${wide ? 'pt-5 pb-2' : 'pt-8 pb-3'}`}>
          <Logo variant="white" className="h-9" />
        </div>

        {subheading && (
          <p className="lg:hidden relative z-10 text-center text-[11px] text-gray-400 mb-3 max-w-xs leading-snug">
            {subheading}
          </p>
        )}

        <div className={`relative z-10 w-full ${wide ? 'max-w-2xl' : 'max-w-md'} animate-fade-in`}>
          {children}
        </div>
      </div>
    </div>
  );
}

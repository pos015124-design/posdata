"use client";

import { useInView } from "@/lib/useInView";

// Each feature has an animated SVG that draws on reveal
const features = [
  {
    title: "Lightning Fast",
    desc: "Our optimized app shell loads the e-shop instantly, giving you a native-speed shopping experience.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Lightning bolt */}
        <path
          d="M13 3L4.5 13.5H11L10 21L19.5 10.5H13L13 3Z"
          stroke="#2563EB"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 60,
            strokeDashoffset: draw ? 0 : 60,
            transition: draw ? "stroke-dashoffset 0.8s ease" : "none",
            fill: draw ? "rgba(37,99,235,0.12)" : "none",
          }}
        />
        {/* Speed lines */}
        {[0, 1, 2].map((i) => (
          <line
            key={i}
            x1={3} y1={8 + i * 2.5} x2={6 + i} y2={8 + i * 2.5}
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: 4,
              strokeDashoffset: draw ? 0 : 4,
              transition: draw ? `stroke-dashoffset 0.4s ease ${0.6 + i * 0.1}s` : "none",
              opacity: 0.6,
            }}
          />
        ))}
      </svg>
    ),
  },
  {
    title: "Easy Browsing",
    desc: "Browse thousands of products from Bhaby's catalog with a smooth, intuitive mobile interface.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Phone outline */}
        <rect
          x="7" y="2" width="10" height="20" rx="2"
          stroke="#2563EB" strokeWidth="1.8"
          style={{
            strokeDasharray: 70,
            strokeDashoffset: draw ? 0 : 70,
            transition: draw ? "stroke-dashoffset 0.9s ease" : "none",
          }}
        />
        {/* Screen lines */}
        {[9, 11, 13].map((y, i) => (
          <line key={i} x1="9.5" y1={y} x2="14.5" y2={y}
            stroke="#2563EB" strokeWidth="1.4" strokeLinecap="round"
            style={{
              strokeDasharray: 5,
              strokeDashoffset: draw ? 0 : 5,
              transition: draw ? `stroke-dashoffset 0.4s ease ${0.7 + i * 0.12}s` : "none",
              opacity: 0.7,
            }}
          />
        ))}
        {/* Home button dot */}
        <circle cx="12" cy="18" r="1"
          stroke="#2563EB" strokeWidth="1.4"
          style={{
            strokeDasharray: 8,
            strokeDashoffset: draw ? 0 : 8,
            transition: draw ? "stroke-dashoffset 0.3s ease 1s" : "none",
          }}
        />
      </svg>
    ),
  },
  {
    title: "Push Notifications",
    desc: "Stay in the loop with deals, order updates, and promotions delivered straight to your device.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Bell body */}
        <path
          d="M12 2a6 6 0 00-6 6v4l-2 3h16l-2-3V8a6 6 0 00-6-6z"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 80,
            strokeDashoffset: draw ? 0 : 80,
            transition: draw ? "stroke-dashoffset 0.9s ease" : "none",
          }}
        />
        {/* Clapper */}
        <path d="M10 17a2 2 0 004 0"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"
          style={{
            strokeDasharray: 12,
            strokeDashoffset: draw ? 0 : 12,
            transition: draw ? "stroke-dashoffset 0.4s ease 0.8s" : "none",
          }}
        />
        {/* Notification dot */}
        <circle cx="17" cy="4" r="3" fill="#2563EB"
          style={{
            opacity: draw ? 1 : 0,
            transform: draw ? "scale(1)" : "scale(0)",
            transformOrigin: "17px 4px",
            transition: draw ? "opacity 0.3s ease 0.9s, transform 0.3s ease 0.9s" : "none",
          }}
        />
      </svg>
    ),
  },
  {
    title: "Secure Shopping",
    desc: "Shop with confidence knowing your transactions are protected by industry-standard encryption.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Shield */}
        <path
          d="M12 3L4 6v5c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6L12 3z"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 90,
            strokeDashoffset: draw ? 0 : 90,
            transition: draw ? "stroke-dashoffset 1s ease" : "none",
          }}
        />
        {/* Checkmark */}
        <path d="M9 12l2 2 4-4"
          stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 12,
            strokeDashoffset: draw ? 0 : 12,
            transition: draw ? "stroke-dashoffset 0.4s ease 0.9s" : "none",
          }}
        />
      </svg>
    ),
  },
  {
    title: "One-Tap Checkout",
    desc: "Complete your purchases quickly with a streamlined checkout experience optimized for mobile.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Cart body */}
        <path
          d="M3 3h2l1 9h12l1-7H7"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 60,
            strokeDashoffset: draw ? 0 : 60,
            transition: draw ? "stroke-dashoffset 0.9s ease" : "none",
          }}
        />
        {/* Wheels */}
        {[9, 17].map((cx, i) => (
          <circle key={i} cx={cx} cy="20" r="1.5"
            stroke="#2563EB" strokeWidth="1.5"
            style={{
              strokeDasharray: 10,
              strokeDashoffset: draw ? 0 : 10,
              transition: draw ? `stroke-dashoffset 0.3s ease ${0.85 + i * 0.1}s` : "none",
            }}
          />
        ))}
        {/* Tap finger */}
        <path d="M17 9l2 2"
          stroke="#2563EB" strokeWidth="2" strokeLinecap="round"
          style={{
            strokeDasharray: 6,
            strokeDashoffset: draw ? 0 : 6,
            transition: draw ? "stroke-dashoffset 0.3s ease 1s" : "none",
            opacity: 0.7,
          }}
        />
      </svg>
    ),
  },
  {
    title: "Always Up-to-Date",
    desc: "The app automatically loads the latest version of the e-shop, so you never miss new products or features.",
    icon: ({ draw }: { draw: boolean }) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-10 h-10">
        {/* Refresh circle */}
        <path
          d="M4 12a8 8 0 018-8 8 8 0 016.32 3.09"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: draw ? 0 : 30,
            transition: draw ? "stroke-dashoffset 0.7s ease" : "none",
          }}
        />
        <path
          d="M20 12a8 8 0 01-8 8 8 8 0 01-6.32-3.09"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"
          style={{
            strokeDasharray: 30,
            strokeDashoffset: draw ? 0 : 30,
            transition: draw ? "stroke-dashoffset 0.7s ease 0.1s" : "none",
          }}
        />
        {/* Top arrow */}
        <path d="M20 7V12H15"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 12,
            strokeDashoffset: draw ? 0 : 12,
            transition: draw ? "stroke-dashoffset 0.4s ease 0.65s" : "none",
          }}
        />
        {/* Bottom arrow */}
        <path d="M4 17V12H9"
          stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          style={{
            strokeDasharray: 12,
            strokeDashoffset: draw ? 0 : 12,
            transition: draw ? "stroke-dashoffset 0.4s ease 0.7s" : "none",
          }}
        />
      </svg>
    ),
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, inView } = useInView(0.1);
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      data-testid={`feature-card-${index}`}
      className="reveal"
      style={{
        transitionDelay: `${index * 0.1}s`,
        ...(inView ? { opacity: 1, transform: "translateY(0)" } : {}),
      }}
    >
      <div
        className={`h-full rounded-2xl border border-slate-200 bg-white shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all group ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        style={{ transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s, box-shadow 0.25s, translate 0.25s` }}
      >
        <div data-testid="feature-icon" className="mb-4">
          <Icon draw={inView} />
        </div>
        <h3
          data-testid="feature-title"
          className="text-lg font-semibold text-[#1E3A5F] mb-2"
        >
          {feature.title}
        </h3>
        <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
      </div>
    </div>
  );
}

export default function Features() {
  const { ref: headRef, inView: headInView } = useInView();

  return (
    <section
      id="features"
      data-testid="features-section"
      className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden"
    >
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #1E3A5F 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={headRef}
          className="text-center mb-14"
        >
          <h2
            className={`text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4 transition-all duration-700 ${headInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            Why Choose Bhaby App?
          </h2>
          <p
            className={`text-base sm:text-lg text-slate-600 max-w-2xl mx-auto transition-all duration-700 delay-100 ${headInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: "0.12s" }}
          >
            Experience the full power of Bhaby&apos;s e-shop in a dedicated mobile app that&apos;s built for speed, convenience, and security.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

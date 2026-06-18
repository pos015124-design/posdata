"use client";

import { useInView } from "@/lib/useInView";

// Animated SVG for each step
function DownloadIcon({ draw }: { draw: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-9 h-9">
      {/* Arrow down */}
      <line x1="12" y1="3" x2="12" y2="15"
        stroke="white" strokeWidth="2" strokeLinecap="round"
        style={{ strokeDasharray: 12, strokeDashoffset: draw ? 0 : 12, transition: draw ? "stroke-dashoffset 0.5s ease 0.2s" : "none" }}
      />
      <path d="M7.5 10.5L12 15L16.5 10.5"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 14, strokeDashoffset: draw ? 0 : 14, transition: draw ? "stroke-dashoffset 0.45s ease 0.4s" : "none" }}
      />
      {/* Tray */}
      <path d="M4 20h16"
        stroke="white" strokeWidth="2" strokeLinecap="round"
        style={{ strokeDasharray: 16, strokeDashoffset: draw ? 0 : 16, transition: draw ? "stroke-dashoffset 0.4s ease 0.65s" : "none" }}
      />
    </svg>
  );
}

function InstallIcon({ draw }: { draw: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-9 h-9">
      {/* Phone frame */}
      <rect x="6" y="2" width="12" height="20" rx="2"
        stroke="white" strokeWidth="2"
        style={{ strokeDasharray: 70, strokeDashoffset: draw ? 0 : 70, transition: draw ? "stroke-dashoffset 0.7s ease 0.1s" : "none" }}
      />
      {/* Install tick */}
      <path d="M9.5 12.5l2 2 3.5-3.5"
        stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 12, strokeDashoffset: draw ? 0 : 12, transition: draw ? "stroke-dashoffset 0.4s ease 0.75s" : "none" }}
      />
    </svg>
  );
}

function ShopIcon({ draw }: { draw: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-9 h-9">
      {/* Cart */}
      <path d="M3 3h2l.9 5M7 13h10l1.38-7H5.21"
        stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 60, strokeDashoffset: draw ? 0 : 60, transition: draw ? "stroke-dashoffset 0.7s ease 0.1s" : "none" }}
      />
      <circle cx="9" cy="20" r="1.5" stroke="white" strokeWidth="2"
        style={{ strokeDasharray: 10, strokeDashoffset: draw ? 0 : 10, transition: draw ? "stroke-dashoffset 0.3s ease 0.75s" : "none" }}
      />
      <circle cx="17" cy="20" r="1.5" stroke="white" strokeWidth="2"
        style={{ strokeDasharray: 10, strokeDashoffset: draw ? 0 : 10, transition: draw ? "stroke-dashoffset 0.3s ease 0.82s" : "none" }}
      />
      {/* Star sparkle */}
      <path d="M19 6l.5-1.5L21 4l-1.5-.5L19 2l-.5 1.5L17 4l1.5.5L19 6z"
        stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 14, strokeDashoffset: draw ? 0 : 14, transition: draw ? "stroke-dashoffset 0.4s ease 1s" : "none", opacity: 0.85 }}
      />
    </svg>
  );
}

const steps = [
  {
    id: "step-1",
    number: 1,
    title: "Download",
    desc: "Tap the Download button. The Bhaby APK file (~1 MB) will save to your Android device's Downloads folder.",
    Icon: DownloadIcon,
    color: "from-[#2563EB] to-[#60A5FA]",
    accent: "bg-[#2563EB]",
  },
  {
    id: "step-2",
    number: 2,
    title: "Install",
    desc: "Open the downloaded file. If prompted, go to Settings → Security → enable 'Install unknown apps' for your browser. Then tap Install.",
    Icon: InstallIcon,
    color: "from-[#274B73] to-[#315C8C]",
    accent: "bg-[#274B73]",
  },
  {
    id: "step-3",
    number: 3,
    title: "Shop!",
    desc: "Open the Bhaby app and start browsing thousands of local products. No account needed to shop!",
    Icon: ShopIcon,
    color: "from-emerald-600 to-emerald-500",
    accent: "bg-emerald-600",
  },
];

function StepCard({ step, index }: { step: (typeof steps)[0]; index: number }) {
  const { ref, inView } = useInView(0.2);
  const isLeft = index % 2 === 0;
  const Icon = step.Icon;

  return (
    <div
      ref={ref}
      data-testid={step.id}
      className={`relative flex ${isLeft ? "flex-row" : "flex-row-reverse"} items-center gap-6 sm:gap-10`}
    >
      {/* Content card */}
      <div
        className={`flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-lg transition-all
          ${isLeft ? "reveal-left" : "reveal-right"}
          ${inView ? "in-view" : ""}
        `}
        style={{ transitionDelay: "0.1s" }}
      >
        <div className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-3 ${step.accent} text-white rounded-full px-3 py-1`}>
          Step {step.number}
        </div>
        <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{step.title}</h3>
        <p className="text-slate-600 text-sm leading-relaxed">{step.desc}</p>
      </div>

      {/* Center icon */}
      <div
        className={`relative z-10 flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br ${step.color} shadow-xl flex items-center justify-center reveal-scale ${inView ? "in-view" : ""}`}
        style={{ transitionDelay: "0s" }}
      >
        <Icon draw={inView} />
        {/* Pulse ring */}
        {inView && (
          <span className={`absolute inset-0 rounded-full ${step.accent} opacity-30 pulse-ring`} />
        )}
      </div>

      {/* Spacer on the other side */}
      <div className="flex-1 hidden sm:block" />
    </div>
  );
}

export default function HowItWorks() {
  const { ref: headRef, inView: headInView } = useInView();

  return (
    <section
      id="how-it-works"
      data-testid="how-it-works-section"
      className="py-16 sm:py-28 bg-white relative overflow-hidden"
    >
      {/* Wavy separator top */}
      <div className="absolute top-0 left-0 right-0 -translate-y-px">
        <svg viewBox="0 0 1440 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 0C360 50 720 0 1080 50L1440 0H0Z" fill="#F8FAFC" />
        </svg>
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div ref={headRef} className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4 transition-all duration-700 ${headInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            Your Story Starts Here
          </h2>
          <p
            className={`text-base sm:text-lg text-slate-600 max-w-xl mx-auto transition-all duration-700 ${headInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: "0.12s" }}
          >
            Get started with Bhaby in three simple steps — no account needed to browse.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative flex flex-col gap-10">
          {/* Vertical line */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2563EB] via-[#274B73] to-emerald-400 opacity-30 hidden sm:block" />

          {steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

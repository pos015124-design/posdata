"use client";

import { useInView } from "@/lib/useInView";

const ESHOP_URL = process.env.NEXT_PUBLIC_ESHOP_URL || "https://e-shop.bhabygroup.co.tz";

// Animated globe/link SVG
function GlobeSVG({ draw }: { draw: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <circle cx="12" cy="12" r="9"
        stroke="currentColor" strokeWidth="1.8"
        style={{ strokeDasharray: 60, strokeDashoffset: draw ? 0 : 60, transition: draw ? "stroke-dashoffset 0.7s ease" : "none" }}
      />
      <path d="M12 3c-2 3-3 5.5-3 9s1 6 3 9M12 3c2 3 3 5.5 3 9s-1 6-3 9"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        style={{ strokeDasharray: 40, strokeDashoffset: draw ? 0 : 40, transition: draw ? "stroke-dashoffset 0.7s ease 0.15s" : "none" }}
      />
      <path d="M3 12h18"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        style={{ strokeDasharray: 18, strokeDashoffset: draw ? 0 : 18, transition: draw ? "stroke-dashoffset 0.4s ease 0.65s" : "none" }}
      />
    </svg>
  );
}

// Animated phone mockup (floats + has animated screen content)
function PhoneMockup({ inView }: { inView: boolean }) {
  return (
    <div className="flex justify-center">
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={`absolute inset-[-18px] rounded-[3.5rem] bg-[#2563EB]/10 blur-2xl transition-opacity duration-1000 ${inView ? "opacity-100" : "opacity-0"}`}
        />
        {/* Phone itself floats */}
        <div className={inView ? "phone-float" : ""}>
          <div className="w-64 h-[500px] bg-gradient-to-b from-[#1E3A5F] to-[#274B73] rounded-[2.5rem] shadow-2xl border-4 border-[#315C8C] flex flex-col items-center justify-start overflow-hidden p-3">
            {/* Status bar */}
            <div className="w-full h-6 rounded-t-2xl flex items-center justify-between px-3 mb-1">
              <span className="text-white text-[9px]">9:41</span>
              <div className="w-14 h-1.5 bg-[#1E3A5F]/60 rounded-full" />
              <div className="flex gap-1">
                {[1,2,3].map(i => (
                  <span key={i} className="block w-1 rounded-sm bg-white/60" style={{ height: 4 + i * 2 }} />
                ))}
              </div>
            </div>

            {/* Screen */}
            <div className="flex-1 w-full bg-white rounded-2xl overflow-hidden">
              {/* App header */}
              <div className="bg-[#1E3A5F] h-10 flex items-center px-3 gap-2">
                <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center">
                  <span className="text-white text-[8px] font-black">B</span>
                </div>
                <span className="text-white text-xs font-bold">Bhaby E-Shop</span>
              </div>

              {/* Banner */}
              <div
                className={`bg-gradient-to-r from-[#2563EB] to-[#60A5FA] h-20 flex items-center justify-center transition-all duration-700 ${inView ? "opacity-100" : "opacity-0"}`}
                style={{ transitionDelay: "0.4s" }}
              >
                <span className="text-white font-bold text-sm">🛍️ Flash Sale Today!</span>
              </div>

              {/* Search bar */}
              <div
                className={`mx-2 mt-2 h-7 bg-slate-100 rounded-lg flex items-center px-2 gap-1 transition-all duration-500 ${inView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                style={{ transitionDelay: "0.5s" }}
              >
                <div className="w-3 h-3 rounded-full border border-slate-400" />
                <div className="flex-1 h-2 bg-slate-300 rounded" />
              </div>

              {/* Products grid */}
              <div className="grid grid-cols-2 gap-2 p-2 mt-1">
                {[0,1,2,3].map(n => (
                  <div
                    key={n}
                    className={`bg-slate-100 rounded-lg h-24 flex flex-col items-center justify-end pb-2 transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                    style={{ transitionDelay: `${0.55 + n * 0.1}s` }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded mb-1" />
                    <div className="w-12 h-2 bg-slate-300 rounded" />
                    <div className="w-8 h-2 bg-blue-300 rounded mt-1" />
                  </div>
                ))}
              </div>

              {/* Bottom nav */}
              <div className="absolute bottom-6 left-3 right-3 flex justify-around py-2 bg-white border-t border-slate-100 rounded-b-2xl">
                {["🏠","🔍","🛒","👤"].map((icon, i) => (
                  <span key={i} className="text-sm">{icon}</span>
                ))}
              </div>
            </div>

            {/* Home bar */}
            <div className="w-24 h-1.5 bg-[#274B73] rounded-full mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Preview() {
  const { ref: leftRef, inView: leftIn } = useInView(0.15);
  const { ref: rightRef, inView: rightIn } = useInView(0.15);

  return (
    <section
      id="preview"
      data-testid="preview-section"
      className="py-16 sm:py-28 bg-slate-50 relative overflow-hidden"
    >
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#2563EB]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#1E3A5F]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="text-center mb-16">
          <h2
            className={`text-3xl sm:text-4xl font-bold text-[#1E3A5F] mb-4 transition-all duration-700 ${leftIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            See It in Action
          </h2>
          <p
            className={`text-base sm:text-lg text-slate-600 max-w-xl mx-auto transition-all duration-700 ${leftIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: "0.12s" }}
          >
            Preview the Bhaby E-Shop experience before you download.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Animated phone mockup */}
          <div
            ref={leftRef}
            className={`flex-1 transition-all duration-800 ${leftIn ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-12"}`}
            style={{ transition: "opacity 0.8s ease, transform 0.8s ease" }}
          >
            <PhoneMockup inView={leftIn} />
          </div>

          {/* Text content */}
          <div
            ref={rightRef}
            className={`flex-1 text-center lg:text-left transition-all duration-800 ${rightIn ? "opacity-100 translate-x-0" : "opacity-0 translate-x-12"}`}
            style={{ transition: "opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s" }}
          >
            <h3 className="text-2xl font-bold text-[#1E3A5F] mb-4">
              Tanzania&apos;s Premier E-Commerce Platform
            </h3>
            <p className="text-slate-600 leading-relaxed mb-6">
              Bhaby E-Shop offers a vast selection of products — from electronics and fashion to groceries and home goods.
              With the app, you get a full-screen, distraction-free shopping experience that feels truly native on your Android device.
            </p>

            {/* Feature bullets */}
            <ul className="space-y-3 mb-8 text-sm text-slate-700">
              {[
                "Thousands of products at your fingertips",
                "Smooth, native-like navigation",
                "Secure payments & order tracking",
                "Always live — latest deals instantly",
              ].map((item, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-3 transition-all duration-500 ${rightIn ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`}
                  style={{ transitionDelay: `${0.2 + i * 0.1}s` }}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-[#2563EB]" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a
                data-testid="live-preview-link"
                href={ESHOP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold rounded-xl px-6 py-3 shadow hover:shadow-lg focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all hover:scale-105 inline-flex items-center gap-2 justify-center"
              >
                <GlobeSVG draw={rightIn} />
                Visit Live E-Shop
              </a>
            </div>

            {/* Hidden preview image (for tests) */}
            <div className="mt-8 hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                data-testid="preview-image"
                src="/bhaby-preview.png"
                alt="Bhaby E-Shop running inside the mobile app shell"
                className="rounded-2xl shadow-lg max-w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        {/* Always-visible preview image (accessible) */}
        <div className="mt-8 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            data-testid="preview-image"
            src="/bhaby-preview.svg"
            alt="Bhaby E-Shop running inside the mobile app shell on an Android phone"
            className="max-w-xs sm:max-w-sm rounded-2xl shadow-lg"
            loading="lazy"
            width={320}
            height={200}
          />
        </div>
      </div>
    </section>
  );
}

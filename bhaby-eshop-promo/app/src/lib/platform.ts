"use client";

export type Platform = "android" | "ios" | "desktop" | "unknown";

export function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/mobile|tablet/.test(ua)) return "unknown";
  return "desktop";
}

export function getPlatformMessage(platform: Platform): string {
  switch (platform) {
    case "android":
      return "You're on Android — tap the button above to download the app (APK, ~1 MB).";
    case "ios":
      return "iOS version coming soon! Visit this page on your Android phone to download.";
    case "desktop":
      return "Open this page on your Android phone to download and install the app.";
    default:
      return "Open this page on your Android phone or device to download the app.";
  }
}

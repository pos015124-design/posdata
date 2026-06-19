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
      return "You're on Android — tap the button above to download (~1 MB).";
    case "ios":
      return "You're on iPhone/iPad — tap the button below to add E-Shop to your home screen.";
    case "desktop":
      return "Open this page on your phone to download or add to your home screen.";
    default:
      return "Open this page on your phone to get the app.";
  }
}

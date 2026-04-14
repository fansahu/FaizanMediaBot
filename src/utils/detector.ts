export type Platform =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "facebook"
  | "pinterest"
  | "reddit"
  | "unknown";

export function detectPlatform(url: string): Platform {
  try {
    const u = new URL(url);
    const host = u.hostname.replace("www.", "");

    if (host.includes("youtube.com") || host === "youtu.be") return "youtube";
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("tiktok.com") || host.includes("vm.tiktok.com")) return "tiktok";
    if (host.includes("twitter.com") || host.includes("x.com") || host.includes("t.co")) return "twitter";
    if (host.includes("facebook.com") || host.includes("fb.watch")) return "facebook";
    if (host.includes("pinterest.com") || host.includes("pin.it")) return "pinterest";
    if (host.includes("reddit.com") || host.includes("redd.it")) return "reddit";

    return "unknown";
  } catch {
    return "unknown";
  }
}

export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
}

export function getPlatformEmoji(platform: Platform): string {
  const emojis: Record<Platform, string> = {
    youtube: "▶️",
    instagram: "📸",
    tiktok: "🎵",
    twitter: "🐦",
    facebook: "👥",
    pinterest: "📌",
    reddit: "🔴",
    unknown: "🌐",
  };
  return emojis[platform];
}

export function getPlatformName(platform: Platform): string {
  const names: Record<Platform, string> = {
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    twitter: "Twitter/X",
    facebook: "Facebook",
    pinterest: "Pinterest",
    reddit: "Reddit",
    unknown: "Unknown",
  };
  return names[platform];
}

import { Context } from "telegraf";

export async function handleStart(ctx: Context) {
  const name = ctx.from?.first_name || "dost";
  await ctx.replyWithHTML(
    `👋 <b>Assalamu Alaikum ${name}!</b>\n\n` +
      `🚀 <b>FaizanMediaBot</b> mein aapka swagat hai!\n\n` +
      `<b>📥 Download Features:</b>\n` +
      `▶️ YouTube • 📸 Instagram • 🎵 TikTok\n` +
      `🐦 Twitter/X • 👥 Facebook • 🔴 Reddit\n\n` +
      `<b>🤖 AI & Smart Features:</b>\n` +
      `🤖 /ai — ChatGPT jaisi AI chat\n` +
      `🌤️ /weather — Mausam ki jankari\n` +
      `🌐 /translate — 20+ bhasha mein translate\n` +
      `📰 /news — Latest news\n` +
      `🎵 /lyrics — Song lyrics dhundo\n` +
      `🔗 /shorten — URL chhota karo\n` +
      `💰 /crypto — Crypto prices\n` +
      `🧮 /calc — Calculator\n` +
      `💬 /quote — Motivational quote\n\n` +
      `<b>📹 YouTube Commands:</b>\n` +
      `/video [link] — Video download\n` +
      `/mp3 [link] — MP3 download\n\n` +
      `<b>ℹ️ Help:</b> /help`
  );
}

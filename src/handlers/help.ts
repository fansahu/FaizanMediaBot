import { Context } from "telegraf";

export async function handleHelp(ctx: Context) {
  await ctx.replyWithHTML(
    `📖 <b>FaizanMediaBot - Complete Help</b>\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `📥 <b>MEDIA DOWNLOADER</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `Bas link paste karo — auto download!\n` +
    `▶️ YouTube, 📸 Instagram, 🎵 TikTok\n` +
    `🐦 Twitter/X, 👥 Facebook, 🔴 Reddit\n\n` +
    `/video [link] — YouTube video (720p)\n` +
    `/mp3 [link] — YouTube MP3 audio\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 <b>AI CHAT</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/ai [sawaal] — AI se baat karo\n` +
    `/aireset — Chat history clear karo\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🌤️ <b>WEATHER</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/weather [shehar] — Mausam dekho\n` +
    `Example: <code>/weather Delhi</code>\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🌐 <b>TRANSLATOR</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/translate [code] [text] — Translate karo\n` +
    `Example: <code>/translate en Namaste</code>\n` +
    `Codes: hi en ur ar fr de es zh ja ko ru\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `📰 <b>NEWS</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/news india — India News 🇮🇳\n` +
    `/news world — World News 🌍\n` +
    `/news tech — Tech News 💻\n` +
    `/news sports — Sports News ⚽\n` +
    `/news business — Business News 💰\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🎵 <b>LYRICS</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/lyrics [Artist - Song] — Lyrics dhundo\n` +
    `Example: <code>/lyrics Arijit Singh - Tum Hi Ho</code>\n\n` +

    `━━━━━━━━━━━━━━━━━━━\n` +
    `🛠️ <b>TOOLS</b>\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `/shorten [URL] — URL chhota karo 🔗\n` +
    `/calc [expression] — Calculator 🧮\n` +
    `/crypto [coin] — Crypto price 💰\n` +
    `/quote — Motivational quote 💬\n\n` +

    `⚠️ <b>Limitations:</b> Max 50MB files\n` +
    `Private accounts download nahi honge`
  );
}

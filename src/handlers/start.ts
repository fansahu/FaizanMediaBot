import { Context } from "telegraf";
import { db } from "../database/db.js";

const ADMIN_ID = Number(process.env.ADMIN_ID || "0");

export async function handleStart(ctx: Context) {
  const name = ctx.from?.first_name || "dost";
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const isNewUser = userId ? !db.getUserById(userId) : false;

  if (userId) {
    await db.getOrCreate(userId, username, name);
  }

  await ctx.replyWithHTML(
    `👋 <b>Assalamu Alaikum ${name}!</b>\n\n` +
    `🚀 <b>FaizanMediaBot</b> mein aapka swagat hai!\n\n` +
    `<b>📥 Download — Bas link bhejo!</b>\n` +
    `▶️ YouTube • 📸 Instagram • 🎵 TikTok\n` +
    `🐦 Twitter/X • 👥 Facebook • 🔴 Reddit\n\n` +
    `<b>🤖 AI Features:</b>\n` +
    `🤖 /ai — AI Chat\n` +
    `📸 Photo bhejo — AI analysis!\n` +
    `🎙️ Voice bhejo — Text mein convert!\n\n` +
    `<b>🛠️ Tools:</b>\n` +
    `🌤️ /weather • 🌐 /translate • 📰 /news\n` +
    `🎵 /lyrics • 💰 /crypto • 🧮 /calc\n` +
    `📱 /qr • 📸 /ss • 📖 /define • 💬 /quote\n\n` +
    `<b>👤 Account:</b>\n` +
    `⭐ /premium • 📊 /mystats • 🆔 /myid\n\n` +
    `<b>ℹ️ Help:</b> /help`
  );

  if (isNewUser && ADMIN_ID && userId !== ADMIN_ID) {
    try {
      await ctx.telegram.sendMessage(
        ADMIN_ID,
        `👤 <b>New User Joined!</b>\n\n` +
        `🆔 ID: <code>${userId}</code>\n` +
        `📛 Name: ${name}\n` +
        `👤 Username: @${username || "N/A"}\n\n` +
        `/userinfo ${userId}`,
        { parse_mode: "HTML" }
      );
    } catch {}
  }
}

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
    `📥 Koi bhi link bhejo — main download kar dunga!\n` +
    `▶️ YouTube • 📸 Instagram • 🎵 TikTok\n` +
    `🐦 Twitter/X • 👥 Facebook • 🔴 Reddit\n\n` +
    `🤖 Photo ya voice bhejo — AI analyze karega!\n\n` +
    `Neeche buttons se features use karo 👇`,
    {
      reply_markup: {
        keyboard: [
          [
            { text: "📥 Download Help" },
            { text: "🤖 AI Chat" },
          ],
          [
            { text: "🌤️ Weather" },
            { text: "📰 News" },
            { text: "💰 Crypto" },
          ],
          [
            { text: "📊 My Stats" },
            { text: "⭐ Premium" },
            { text: "📖 Help" },
          ],
        ],
        resize_keyboard: true,
        persistent: true,
      },
    }
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

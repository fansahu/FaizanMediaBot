import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { handleStart } from "./handlers/start.js";
import { handleHelp, handleHelpCallback } from "./handlers/help.js";
import { handleYoutubeVideo, handleYoutubeAudio, handleUrl } from "./handlers/download.js";
import { handleAI, handleAIReset } from "./handlers/ai.js";
import { handleWeather } from "./handlers/weather.js";
import { handleTranslate } from "./handlers/translator.js";
import { handleNews } from "./handlers/news.js";
import { handleLyrics } from "./handlers/lyrics.js";
import { handleShorten, handleCalc, handleCrypto, handleQuote } from "./handlers/tools.js";
import { registerAdminHandlers, handleMyStats } from "./handlers/admin.js";
import { handlePhotoAnalysis, handleQR } from "./handlers/photo.js";
import { handleVoice } from "./handlers/voice.js";
import { handleScreenshot, handleDefine, handlePing } from "./handlers/extras.js";
import { handleCallbackQuery } from "./handlers/download.js";
import { extractUrl } from "./utils/detector.js";
import { logger } from "./utils/logger.js";
import { db } from "./database/db.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  logger.error("TELEGRAM_BOT_TOKEN environment variable nahi mili!");
  process.exit(1);
}

const ADMIN_ID = Number(process.env.ADMIN_ID || "0");
if (!ADMIN_ID) {
  logger.warn("⚠️ ADMIN_ID set nahi hai — admin commands kaam nahi karenge!");
}

const bot = new Telegraf(token, {
  handlerTimeout: 5 * 60 * 1000,
});

bot.telegram.setMyCommands([
  { command: "start", description: "Bot shuru karo" },
  { command: "help", description: "Saari commands dekho" },
  { command: "premium", description: "⭐ Premium info dekho" },
  { command: "mystats", description: "Apni download stats dekho" },
  { command: "myid", description: "Apna Telegram ID dekho" },
  { command: "ai", description: "AI se baat karo" },
  { command: "weather", description: "Mausam — /weather Delhi" },
  { command: "translate", description: "Translate — /translate en Namaste" },
  { command: "news", description: "News — /news india" },
  { command: "lyrics", description: "Lyrics — /lyrics Artist - Song" },
  { command: "video", description: "YouTube video download" },
  { command: "mp3", description: "YouTube MP3 download" },
  { command: "shorten", description: "URL chhota karo" },
  { command: "calc", description: "Calculator — /calc 25*4" },
  { command: "crypto", description: "Crypto price — /crypto bitcoin" },
  { command: "quote", description: "Motivational quote" },
  { command: "qr", description: "QR Code banao — /qr text ya link" },
  { command: "ss", description: "Website screenshot — /ss google.com" },
  { command: "define", description: "Dictionary — /define word" },
  { command: "ping", description: "Bot speed check karo" },
  { command: "aireset", description: "AI chat history reset" },
]);

bot.command("start", handleStart);
bot.command("help", handleHelp);
bot.command("ai", handleAI);
bot.command("aireset", handleAIReset);
bot.command("weather", handleWeather);
bot.command("translate", handleTranslate);
bot.command("news", handleNews);
bot.command("lyrics", handleLyrics);
bot.command("video", handleYoutubeVideo);
bot.command("mp3", handleYoutubeAudio);
bot.command("shorten", handleShorten);
bot.command("calc", handleCalc);
bot.command("crypto", handleCrypto);
bot.command("quote", handleQuote);
bot.command("qr", handleQR);
bot.command("ss", handleScreenshot);
bot.command("define", handleDefine);
bot.command("ping", handlePing);

registerAdminHandlers(bot);

bot.on("callback_query", async (ctx) => {
  const cb = ctx.callbackQuery as any;
  if (!cb?.data) return;
  if (cb.data.startsWith("help_")) {
    await handleHelpCallback(ctx);
  } else {
    await handleCallbackQuery(ctx);
  }
});

bot.on(message("photo"), handlePhotoAnalysis);
bot.on(message("voice"), handleVoice);

bot.on(message("text"), async (ctx) => {
  const text = ctx.message.text;
  if (text.startsWith("/")) return;

  const keyboardActions: Record<string, () => Promise<void>> = {
    "📥 Download Help": () => handleHelp(ctx),
    "🤖 AI Chat": () => ctx.replyWithHTML(`🤖 <b>AI Chat</b>\n\nApna sawaal likho:\n<code>/ai tumhara sawaal</code>\n\nYa seedha photo/voice bhejo!`),
    "🌤️ Weather": () => ctx.reply("🌤️ Shehar ka naam likho:\n/weather Delhi"),
    "📰 News": () => ctx.replyWithHTML(`📰 <b>News</b>\n\n/news india\n/news world\n/news tech\n/news sports`),
    "💰 Crypto": () => ctx.reply("💰 Coin ka naam likho:\n/crypto bitcoin"),
    "📊 My Stats": () => handleMyStats(ctx),
    "⭐ Premium": () => ctx.replyWithHTML(`⭐ <b>Premium</b>\n\nFree: 10 downloads/day\nPremium: Unlimited ♾️\n\n/premium — Details dekho\n/myid — Apna ID lo`),
    "📖 Help": () => handleHelp(ctx),
  };

  const action = keyboardActions[text];
  if (action) {
    await action();
    return;
  }

  if (extractUrl(text)) {
    await handleUrl(ctx);
  } else {
    await ctx.replyWithHTML(
      `💡 Koi link bhejo — main download kar dunga!\n\n` +
      `Ya neeche buttons use karo 👇`
    );
  }
});

bot.catch((err: unknown) => {
  const errMsg = err instanceof Error ? err.message : String(err);
  logger.error(`Bot error: ${errMsg}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

async function main() {
  await db.init();
  logger.info("🚀 FaizanMediaBot shuru ho raha hai...");
  await bot.launch();
  logger.info("✅ FaizanMediaBot live hai! @FaizanMediaBot pe jao aur use karo.");
}

main().catch((err: unknown) => {
  const errMsg = err instanceof Error ? err.message : String(err);
  logger.error(`Startup error: ${errMsg}`);
  process.exit(1);
});

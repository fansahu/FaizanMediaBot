import { Context } from "telegraf";
import axios from "axios";
import { logger } from "../utils/logger.js";
import { extractUrl } from "../utils/detector.js";

export async function handleShorten(ctx: Context) {
  const text = ctx.text || "";
  const url = text.replace(/^\/shorten\s*/i, "").trim() || extractUrl(text);

  if (!url || !url.startsWith("http")) {
    return ctx.replyWithHTML(
      `🔗 <b>URL Shortener</b>\n\n` +
        `Usage: <code>/shorten [long URL]</code>\n\n` +
        `Example:\n` +
        `<code>/shorten https://www.youtube.com/watch?v=dQw4w9WgXcQ</code>`
    );
  }

  const msg = await ctx.reply("🔗 URL chota kar raha hoon...");

  try {
    const res = await axios.get<string>(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`,
      { timeout: 10000, responseType: "text" }
    );
    const shortUrl = res.data.trim();

    if (!shortUrl.startsWith("http")) throw new Error("Invalid response");

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `🔗 <b>URL Short Ho Gaya!</b>\n\n` +
        `📎 <b>Short URL:</b>\n${shortUrl}\n\n` +
        `📌 <b>Original:</b>\n<code>${url.slice(0, 100)}</code>`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    logger.error(`URL shortener error: ${err}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      "❌ URL short nahi hua! URL check karo aur dubara try karo."
    );
  }
}

export async function handleCalc(ctx: Context) {
  const text = ctx.text || "";
  const expr = text.replace(/^\/calc\s*/i, "").trim();

  if (!expr) {
    return ctx.replyWithHTML(
      `🧮 <b>Calculator</b>\n\n` +
        `Usage: <code>/calc [expression]</code>\n\n` +
        `Examples:\n` +
        `<code>/calc 2 + 2</code>\n` +
        `<code>/calc 100 * 50 / 3</code>\n` +
        `<code>/calc Math.sqrt(144)</code>\n` +
        `<code>/calc 2 ** 10</code>`
    );
  }

  try {
    const safeExpr = expr.replace(/[^0-9+\-*/.()%^ ]/g, "").trim();
    if (!safeExpr) throw new Error("Invalid expression");

    const result = Function(`"use strict"; return (${safeExpr})`)();

    if (typeof result !== "number" || !isFinite(result))
      throw new Error("Invalid result");

    await ctx.replyWithHTML(
      `🧮 <b>Calculator</b>\n\n` +
        `📝 <code>${expr}</code>\n\n` +
        `✅ <b>= ${result}</b>`
    );
  } catch {
    await ctx.replyWithHTML(
      `❌ Galat expression!\n\n` +
        `Example: <code>/calc 25 * 4 + 10</code>`
    );
  }
}

export async function handleCrypto(ctx: Context) {
  const text = ctx.text || "";
  const coin = text.replace(/^\/crypto\s*/i, "").trim().toLowerCase() || "bitcoin";

  const msg = await ctx.reply(`💰 ${coin} price dekh raha hoon...`);

  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd,inr&include_24hr_change=true`,
      { timeout: 10000 }
    );

    const data = res.data[coin.toLowerCase()];
    if (!data) {
      throw new Error(`Coin "${coin}" nahi mila`);
    }

    const change = data.usd_24h_change?.toFixed(2) || "0";
    const changeEmoji = parseFloat(change) >= 0 ? "📈" : "📉";

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `💰 <b>${coin.toUpperCase()} Price</b>\n\n` +
        `🇺🇸 <b>USD:</b> $${data.usd?.toLocaleString()}\n` +
        `🇮🇳 <b>INR:</b> ₹${data.inr?.toLocaleString()}\n` +
        `${changeEmoji} <b>24h Change:</b> ${change}%\n\n` +
        `<i>Source: CoinGecko</i>`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    logger.error(`Crypto error: ${err}`);
    const isRateLimit = err instanceof Error && err.message.includes("429");
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      isRateLimit
        ? `⏳ Abhi bohot requests aa rahi hain. 1 minute baad try karo!\n\n<code>/crypto bitcoin</code>`
        : `❌ Price nahi mila!\n\nSahi naam use karo:\n<code>/crypto bitcoin</code>\n<code>/crypto ethereum</code>\n<code>/crypto dogecoin</code>`,
      { parse_mode: "HTML" }
    );
  }
}

export async function handleQuote(ctx: Context) {
  try {
    const res = await axios.get<{
      content: string;
      author: string;
    }>("https://api.quotable.io/random", { timeout: 10000 });

    const { content, author } = res.data;
    await ctx.replyWithHTML(
      `💬 <b>Quote of the Day</b>\n\n` +
        `"<i>${content}</i>"\n\n` +
        `— <b>${author}</b>`
    );
  } catch {
    const quotes = [
      { q: "Khwab wo nahi jo hum sote waqt dekhte hain, khwab wo hain jo humein sone nahi dete.", a: "Dr. APJ Abdul Kalam" },
      { q: "Mushkilein insaan ko tod nahi sakti, balki aur strong banati hain.", a: "Unknown" },
      { q: "Success ka shortcut nahi hota, mehnat hi sabse badi dua hai.", a: "Unknown" },
      { q: "Kal jo tha so tha, aaj kya hai yahi socho.", a: "Unknown" },
    ];
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    await ctx.replyWithHTML(
      `💬 <b>Quote</b>\n\n"<i>${q.q}</i>"\n\n— <b>${q.a}</b>`
    );
  }
}

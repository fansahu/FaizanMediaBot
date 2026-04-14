import { Context } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY not set");
}
const ai = new GoogleGenAI({ apiKey });

const userChats = new Map<number, Array<{ role: string; text: string }>>();

export async function handleAI(ctx: Context) {
  const text = ctx.text || "";
  const query = text.replace(/^\/ai\s*/i, "").trim();

  if (!query) {
    return ctx.replyWithHTML(
      `🤖 <b>AI Chat</b>\n\n` +
        `Usage: <code>/ai [apna sawaal likho]</code>\n\n` +
        `Example:\n` +
        `<code>/ai Python kya hai?</code>\n` +
        `<code>/ai mujhe ek poem likho</code>\n` +
        `<code>/ai mere liye biryani recipe batao</code>\n\n` +
        `Chat reset karo: /aireset`
    );
  }

  const userId = ctx.from?.id || 0;
  const msg = await ctx.reply("🤖 Soch raha hoon...");

  try {
    const history = userChats.get(userId) || [];
    history.push({ role: "user", text: query });

    const contents = history.map((h) => ({
      role: h.role as "user" | "model",
      parts: [{ text: h.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        maxOutputTokens: 8192,
        systemInstruction:
          "You are a helpful assistant for a Telegram bot. Reply in the same language the user writes in. Be concise and friendly. If user writes in Hindi/Urdu, reply in Hindi/Urdu.",
      },
    });

    const reply = response.text || "Koi jawab nahi mila.";

    history.push({ role: "model", text: reply });
    if (history.length > 20) history.splice(0, 2);
    userChats.set(userId, history);

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `🤖 <b>AI:</b>\n\n${reply.slice(0, 4000)}`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`AI error: ${errMsg}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      "❌ AI se jawab nahi mila. Dubara try karo!"
    );
  }
}

export async function handleAIReset(ctx: Context) {
  const userId = ctx.from?.id || 0;
  userChats.delete(userId);
  await ctx.reply("✅ AI chat history reset ho gaya! /ai se naya conversation shuru karo.");
}

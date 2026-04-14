import { Context } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger.js";
import axios from "axios";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function handleVoice(ctx: Context) {
  const msg = ctx.message as any;
  const voice = msg?.voice || msg?.audio;
  if (!voice) return;

  const waitMsg = await ctx.reply("🎙️ Voice message sun raha hoon... ⏳");

  try {
    const file = await ctx.telegram.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64Audio = Buffer.from(response.data).toString("base64");

    const mimeType = file.file_path?.endsWith(".mp3") ? "audio/mp3" : "audio/ogg";

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Is audio/voice message ko text mein likho (transcribe karo). Agar Hindi/Urdu mein hai toh Hindi/Urdu mein likho. Sirf transcription do, koi extra explanation mat do." },
            { inlineData: { mimeType, data: base64Audio } },
          ],
        },
      ],
    });

    const transcription = result.text || "Koi text nahi mila.";

    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      `🎙️ <b>Voice → Text:</b>\n\n${transcription.slice(0, 3500)}`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Voice error: ${errMsg}`);
    await ctx.telegram.editMessageText(
      waitMsg.chat.id, waitMsg.message_id, undefined,
      "❌ Voice text mein convert nahi ho saka. Dubara try karo!"
    );
  }
}

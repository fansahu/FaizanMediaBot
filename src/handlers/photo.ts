import { Context } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import { logger } from "../utils/logger.js";
import axios from "axios";
import QRCode from "qrcode";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function handlePhotoAnalysis(ctx: Context) {
  const msg = ctx.message as any;
  const photo = msg?.photo;
  const caption = msg?.caption || "";

  if (!photo || photo.length === 0) return;

  const waitMsg = await ctx.reply("🔍 Photo analyze ho rahi hai... ⏳");

  try {
    const fileId = photo[photo.length - 1].file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
    const base64Image = Buffer.from(response.data).toString("base64");
    const mimeType = file.file_path?.endsWith(".png") ? "image/png" : "image/jpeg";

    const prompt = caption
      ? `User ka sawaal: "${caption}"\n\nIs image ke baare mein batao aur user ka sawaal answer karo. Hindi/Urdu mein jawab do agar possible ho.`
      : "Is image mein kya hai? Detail mein batao — objects, text, colors, scene sab kuch. Hindi ya English mein batao.";

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64Image } },
          ],
        },
      ],
    });

    const analysis = result.text || "Koi result nahi mila.";

    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      `🔍 <b>Image Analysis:</b>\n\n${analysis.slice(0, 3500)}`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Photo analysis error: ${errMsg}`);
    await ctx.telegram.editMessageText(
      waitMsg.chat.id,
      waitMsg.message_id,
      undefined,
      "❌ Photo analyze nahi ho saki. Dubara try karo!"
    );
  }
}

export async function handleQR(ctx: Context) {
  const text = (ctx.message as any)?.text || "";
  const content = text.replace(/^\/qr\s*/i, "").trim();

  if (!content) {
    return ctx.replyWithHTML(
      `📱 <b>QR Code Generator</b>\n\n` +
      `Usage: <code>/qr [text ya link]</code>\n\n` +
      `Examples:\n` +
      `<code>/qr https://youtube.com</code>\n` +
      `<code>/qr Mera number: 9876543210</code>\n` +
      `<code>/qr Hello World</code>`
    );
  }

  const waitMsg = await ctx.reply("📱 QR Code ban raha hai...");

  try {
    const tmpPath = path.join(os.tmpdir(), `qr_${Date.now()}.png`);
    await QRCode.toFile(tmpPath, content, {
      width: 512,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
    });

    await ctx.replyWithPhoto(
      { source: tmpPath },
      { caption: `📱 <b>QR Code</b>\n\n🔗 Content: <code>${content.slice(0, 100)}</code>\n\n📥 @FaizanMediaBot`, parse_mode: "HTML" }
    );

    await fs.unlink(tmpPath).catch(() => {});
    await ctx.telegram.deleteMessage(waitMsg.chat.id, waitMsg.message_id).catch(() => {});
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`QR error: ${errMsg}`);
    await ctx.telegram.editMessageText(
      waitMsg.chat.id, waitMsg.message_id, undefined,
      "❌ QR Code nahi bana. Dubara try karo!"
    );
  }
}

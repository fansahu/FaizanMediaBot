import { Context } from "telegraf";
import axios from "axios";
import { logger } from "../utils/logger.js";

const LANGUAGES: Record<string, string> = {
  hi: "Hindi हिंदी",
  en: "English",
  ur: "Urdu اردو",
  ar: "Arabic عربي",
  fr: "French Français",
  de: "German Deutsch",
  es: "Spanish Español",
  zh: "Chinese 中文",
  ja: "Japanese 日本語",
  ko: "Korean 한국어",
  ru: "Russian Русский",
  pt: "Portuguese",
  it: "Italian",
  tr: "Turkish",
  bn: "Bengali বাংলা",
  pa: "Punjabi ਪੰਜਾਬੀ",
  ta: "Tamil தமிழ்",
  te: "Telugu తెలుగు",
  mr: "Marathi मराठी",
  gu: "Gujarati ગુજરાતી",
};

export async function handleTranslate(ctx: Context) {
  const text = ctx.text || "";
  const parts = text.replace(/^\/translate\s*/i, "").trim().split(" ");

  if (parts.length < 2) {
    const langList = Object.entries(LANGUAGES)
      .map(([code, name]) => `<code>${code}</code> = ${name}`)
      .join("\n");
    return ctx.replyWithHTML(
      `🌐 <b>Translator</b>\n\n` +
        `Usage: <code>/translate [language code] [text]</code>\n\n` +
        `Example:\n` +
        `<code>/translate en Namaste kaise ho</code>\n` +
        `<code>/translate hi Hello how are you</code>\n` +
        `<code>/translate ur Good morning</code>\n\n` +
        `<b>Language Codes:</b>\n${langList}`
    );
  }

  const targetLang = parts[0].toLowerCase();
  const textToTranslate = parts.slice(1).join(" ");

  if (!LANGUAGES[targetLang]) {
    return ctx.reply(
      `❌ Language code galat hai!\n\n/translate likho to saare codes dikhenge.`
    );
  }

  const msg = await ctx.reply(`🌐 Translate ho raha hai...`);

  try {
    const res = await axios.get(
      `https://api.mymemory.translated.net/get`,
      {
        params: {
          q: textToTranslate,
          langpair: `auto|${targetLang}`,
        },
        timeout: 10000,
      }
    );

    const translated = res.data?.responseData?.translatedText;
    if (!translated) throw new Error("Translation failed");

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `🌐 <b>Translation → ${LANGUAGES[targetLang]}</b>\n\n` +
        `📝 <b>Original:</b>\n${textToTranslate}\n\n` +
        `✅ <b>Translated:</b>\n${translated}`,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    logger.error(`Translation error: ${err}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      "❌ Translation nahi hua! Dubara try karo."
    );
  }
}

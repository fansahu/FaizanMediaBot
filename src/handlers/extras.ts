import { Context } from "telegraf";
import axios from "axios";
import { logger } from "../utils/logger.js";

export async function handleScreenshot(ctx: Context) {
  const text = (ctx.message as any)?.text || "";
  let url = text.replace(/^\/ss\s*/i, "").trim();

  if (!url) {
    return ctx.replyWithHTML(
      `📸 <b>Website Screenshot</b>\n\n` +
      `Usage: <code>/ss [website URL]</code>\n\n` +
      `Examples:\n` +
      `<code>/ss google.com</code>\n` +
      `<code>/ss youtube.com</code>\n` +
      `<code>/ss https://github.com</code>`
    );
  }

  if (!url.startsWith("http")) url = "https://" + url;

  const waitMsg = await ctx.reply("📸 Website ka screenshot le raha hoon... ⏳");

  try {
    const screenshotUrl = `https://image.thum.io/get/width/1280/crop/800/noanimate/${url}`;

    const response = await axios.get(screenshotUrl, {
      responseType: "arraybuffer",
      timeout: 20000,
    });

    if (response.data.byteLength < 1000) {
      throw new Error("Screenshot nahi mila — website load nahi hui");
    }

    await ctx.replyWithPhoto(
      { source: Buffer.from(response.data) },
      {
        caption: `📸 <b>Screenshot</b>\n🌐 ${url}\n\n📥 @FaizanMediaBot`,
        parse_mode: "HTML",
      }
    );

    await ctx.telegram.deleteMessage(waitMsg.chat.id, waitMsg.message_id).catch(() => {});
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Screenshot error: ${errMsg}`);
    await ctx.telegram.editMessageText(
      waitMsg.chat.id, waitMsg.message_id, undefined,
      `❌ Screenshot nahi liya ja saka!\n\n💡 URL sahi hai? Example: <code>/ss google.com</code>`,
      { parse_mode: "HTML" }
    );
  }
}

export async function handleDefine(ctx: Context) {
  const text = (ctx.message as any)?.text || "";
  const word = text.replace(/^\/define\s*/i, "").trim().toLowerCase();

  if (!word) {
    return ctx.replyWithHTML(
      `📖 <b>Dictionary</b>\n\n` +
      `Usage: <code>/define [word]</code>\n\n` +
      `Example: <code>/define beautiful</code>`
    );
  }

  const waitMsg = await ctx.reply(`📖 "${word}" dhund raha hoon...`);

  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { timeout: 10000 }
    );

    const data = response.data[0];
    const phonetic = data.phonetic || data.phonetics?.[0]?.text || "";

    let result = `📖 <b>${data.word}</b> ${phonetic ? `<i>${phonetic}</i>` : ""}\n\n`;

    let count = 0;
    for (const meaning of data.meanings.slice(0, 3)) {
      result += `<b>${meaning.partOfSpeech}</b>\n`;
      for (const def of meaning.definitions.slice(0, 2)) {
        result += `• ${def.definition}\n`;
        if (def.example) result += `  <i>Example: "${def.example}"</i>\n`;
      }
      if (meaning.synonyms?.length) {
        result += `📝 Synonyms: ${meaning.synonyms.slice(0, 4).join(", ")}\n`;
      }
      result += "\n";
      count++;
      if (count >= 2) break;
    }

    await ctx.telegram.editMessageText(
      waitMsg.chat.id, waitMsg.message_id, undefined,
      result.slice(0, 3500),
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    await ctx.telegram.editMessageText(
      waitMsg.chat.id, waitMsg.message_id, undefined,
      `❌ "<b>${word}</b>" ka matlab nahi mila!\n\n💡 Sirf English words support hain.`,
      { parse_mode: "HTML" }
    );
  }
}

export async function handlePing(ctx: Context) {
  const start = Date.now();
  const msg = await ctx.reply("🏓 Pong!");
  const latency = Date.now() - start;
  await ctx.telegram.editMessageText(
    msg.chat.id, msg.message_id, undefined,
    `🏓 <b>Pong!</b>\n⚡ Latency: <b>${latency}ms</b>`,
    { parse_mode: "HTML" }
  );
}

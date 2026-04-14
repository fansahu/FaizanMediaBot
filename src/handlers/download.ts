import { Context } from "telegraf";
import { message } from "telegraf/filters";
import {
  detectPlatform,
  extractUrl,
  getPlatformEmoji,
  getPlatformName,
} from "../utils/detector.js";
import {
  downloadVideo,
  downloadAudio,
  downloadGeneric,
  getMediaInfo,
  cleanupFile,
} from "../downloaders/ytdlp.js";
import { logger } from "../utils/logger.js";
import { db, FREE_DAILY_LIMIT } from "../database/db.js";

const MAX_SIZE_MB = 45;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const ADMIN_ID = Number(process.env.ADMIN_ID || "0");

async function checkLimit(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  if (!userId) return false;

  if (ADMIN_ID && userId === ADMIN_ID) return true;

  await db.getOrCreate(userId, ctx.from?.username, ctx.from?.first_name);
  const check = await db.canDownload(userId);

  if (check.isBanned) {
    await ctx.reply("🚫 Tumhara account ban kiya gaya hai. Admin se contact karo.");
    return false;
  }

  if (!check.allowed) {
    await ctx.replyWithHTML(
      `⛔ <b>Daily Limit Khatam!</b>\n\n` +
      `🆓 Free plan: <b>${FREE_DAILY_LIMIT} downloads/day</b>\n` +
      `📊 Aaj tumne ${FREE_DAILY_LIMIT} downloads kar liye!\n\n` +
      `⭐ <b>Premium lo — Unlimited downloads!</b>\n` +
      `👉 /premium — Details dekho\n` +
      `🆔 /myid — Apna ID lo admin ko dene ke liye\n\n` +
      `⏰ Limit kal subah reset hogi!`
    );
    return false;
  }

  return true;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function handleYoutubeVideo(ctx: Context) {
  if (!(await checkLimit(ctx))) return;

  const text = ctx.text || "";
  const parts = text.trim().split(/\s+/);
  const url = parts.slice(1).find((p) => p.startsWith("http"));

  if (!url) {
    return ctx.reply(
      "❌ YouTube link provide karo!\n\nExample:\n/video https://youtu.be/xxx"
    );
  }

  await processDownloadVideo(ctx, url, "youtube");
}

export async function handleYoutubeAudio(ctx: Context) {
  if (!(await checkLimit(ctx))) return;

  const text = ctx.text || "";
  const parts = text.trim().split(/\s+/);
  const url = parts.slice(1).find((p) => p.startsWith("http"));

  if (!url) {
    return ctx.reply(
      "❌ YouTube link provide karo!\n\nExample:\n/mp3 https://youtu.be/xxx"
    );
  }

  await processDownloadAudio(ctx, url);
}

async function processDownloadVideo(
  ctx: Context,
  url: string,
  platform: string,
  quality: "360" | "480" | "720" | "1080" = "720"
) {
  const emoji = getPlatformEmoji(platform as ReturnType<typeof detectPlatform>);
  const platformName = getPlatformName(
    platform as ReturnType<typeof detectPlatform>
  );

  const msg = await ctx.reply(
    `${emoji} <b>${platformName}</b> se ${quality}p video download ho rahi hai...\n⏳ Please wait...`,
    { parse_mode: "HTML" }
  );

  let result: Awaited<ReturnType<typeof downloadVideo>> | null = null;

  try {
    let info = { title: "", duration: 0, uploader: "" };
    try {
      const fetched = await getMediaInfo(url);
      info = fetched;
      await ctx.telegram.editMessageText(
        msg.chat.id,
        msg.message_id,
        undefined,
        `${emoji} <b>${info.title.slice(0, 60)}</b>\n👤 ${info.uploader}\n⏱️ ${formatDuration(info.duration)}\n\n📥 Download ho rahi hai...`,
        { parse_mode: "HTML" }
      );
    } catch {
      // info fetch fail, continue anyway
    }

    result = await downloadVideo(url, "720");

    if (result.fileSize > MAX_SIZE_BYTES) {
      await ctx.reply(
        `⚠️ File bahut badi hai (${formatSize(result.fileSize)})!\n` +
          `Telegram ka limit 45MB hai.\n\n` +
          `🎵 Audio try karo: /mp3 ${url}`
      );
      return;
    }

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `${emoji} Download complete! Telegram pe bhej raha hoon...`,
      { parse_mode: "HTML" }
    );

    await ctx.replyWithVideo(
      { source: result.filePath },
      {
        caption: `${emoji} <b>${info.title || result.title}</b>\n📥 @FaizanMediaBot`,
        parse_mode: "HTML",
        supports_streaming: true,
      }
    );

    if (ctx.from?.id) await db.recordDownload(ctx.from.id);
    logger.info(`Video sent: ${result.title}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Video download error [${platformName}]: ${errMsg}`);

    let hint = "";
    if (platform === "instagram")
      hint =
        "\n\n💡 Instagram ke liye account public hona chahiye";
    if (platform === "twitter")
      hint = "\n\n💡 Video wala tweet ka link dena hoga";
    if (platform === "tiktok")
      hint = "\n\n💡 Direct TikTok share link use karo";

    await ctx.reply(
      `❌ Download nahi hua!\n\n` +
        `<code>${errMsg.slice(0, 200)}</code>` +
        hint,
      { parse_mode: "HTML" }
    );
  } finally {
    if (result?.filePath) await cleanupFile(result.filePath);
  }
}

async function processDownloadAudio(ctx: Context, url: string) {
  const msg = await ctx.reply(
    `🎵 Audio download ho raha hai...\n⏳ Please wait...`,
    { parse_mode: "HTML" }
  );

  let result: Awaited<ReturnType<typeof downloadAudio>> | null = null;

  try {
    result = await downloadAudio(url);

    if (result.fileSize > MAX_SIZE_BYTES) {
      await ctx.reply(
        `⚠️ Audio file bahut badi hai (${formatSize(result.fileSize)})!`
      );
      return;
    }

    await ctx.replyWithAudio(
      { source: result.filePath, filename: `${result.title}.mp3` },
      {
        title: result.title,
        caption: `🎵 <b>${result.title}</b>\n📥 @FaizanMediaBot`,
        parse_mode: "HTML",
      }
    );

    if (ctx.from?.id) await db.recordDownload(ctx.from.id);
    logger.info(`Audio sent: ${result.title}`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Audio download error: ${errMsg}`);
    await ctx.reply(`❌ Audio download nahi hua!\n\n<code>${errMsg.slice(0, 200)}</code>`, {
      parse_mode: "HTML",
    });
  } finally {
    if (result?.filePath) await cleanupFile(result.filePath);
  }
}

const pendingDownloads = new Map<string, { url: string; platform: string }>();

export async function handleCallbackQuery(ctx: Context) {
  const cb = ctx.callbackQuery as any;
  if (!cb?.data) return;

  const data: string = cb.data;
  if (!data.startsWith("dl_")) return;

  await ctx.answerCbQuery("⏳ Download shuru ho rahi hai...").catch(() => {});

  const parts = data.split("_");
  const quality = parts[1];
  const key = parts.slice(2).join("_");

  const pending = pendingDownloads.get(key);
  if (!pending) {
    return ctx.reply("⏰ Yeh request expire ho gayi. Dobara link bhejo!");
  }

  pendingDownloads.delete(key);

  if (!(await checkLimit(ctx))) return;

  if (quality === "audio") {
    await processDownloadAudio(ctx, pending.url);
  } else {
    const q = (["360", "720", "1080"].includes(quality) ? quality : "720") as "360" | "720" | "1080";
    await processDownloadVideo(ctx, pending.url, pending.platform, q);
  }
}

export async function handleUrl(ctx: Context) {
  if (!ctx.has(message("text"))) return;

  const text = ctx.message.text;
  const url = extractUrl(text);
  if (!url) return;

  const platform = detectPlatform(url);
  const emoji = getPlatformEmoji(platform);
  const platformName = getPlatformName(platform);

  if (platform === "unknown") {
    return ctx.reply(
      "❓ Yeh platform support nahi karta!\n\n" +
        "Supported: YouTube, Instagram, TikTok, Twitter/X, Facebook, Pinterest, Reddit\n\n" +
        "/help dekho"
    );
  }

  const userId = ctx.from?.id || 0;
  const key = `${userId}_${Date.now()}`;
  pendingDownloads.set(key, { url, platform });
  setTimeout(() => pendingDownloads.delete(key), 5 * 60 * 1000);

  await ctx.replyWithHTML(
    `${emoji} <b>${platformName}</b> link mila!\n\n🎬 Quality chuno:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📱 360p", callback_data: `dl_360_${key}` },
            { text: "📺 720p", callback_data: `dl_720_${key}` },
            { text: "🎬 1080p", callback_data: `dl_1080_${key}` },
          ],
          [
            { text: "🎵 Audio Only (MP3)", callback_data: `dl_audio_${key}` },
          ],
        ],
      },
    }
  );
}

async function processUrlDownload(ctx: Context, url: string, platform: string) {
  const emoji = getPlatformEmoji(platform as ReturnType<typeof detectPlatform>);
  const platformName = getPlatformName(platform as ReturnType<typeof detectPlatform>);

  const msg = await ctx.reply(
    `${emoji} <b>${platformName}</b> se download ho rahi hai...\n⏳ Please wait...`,
    { parse_mode: "HTML" }
  );

  let results: Awaited<ReturnType<typeof downloadGeneric>> = [];

  try {
    results = await downloadGeneric(url);

    if (results.length === 0) {
      throw new Error("Koi file download nahi hui");
    }

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `${emoji} ${results.length} file(s) ready! Bhej raha hoon...`,
      { parse_mode: "HTML" }
    );

    let sentCount = 0;
    for (const file of results) {
      try {
        if (file.fileSize > MAX_SIZE_BYTES) {
          await ctx.reply(
            `⚠️ File (${formatSize(file.fileSize)}) bahut badi hai - skip kar raha hoon`
          );
          continue;
        }

        const isImage = ["jpg", "jpeg", "png", "webp"].includes(
          file.ext.toLowerCase()
        );
        const isAudio = ["mp3", "m4a", "aac", "ogg"].includes(
          file.ext.toLowerCase()
        );

        const caption = `${emoji} <b>${file.title.slice(0, 80)}</b>\n📥 @FaizanMediaBot`;

        if (isImage) {
          await ctx.replyWithPhoto(
            { source: file.filePath },
            { caption, parse_mode: "HTML" }
          );
        } else if (isAudio) {
          await ctx.replyWithAudio(
            { source: file.filePath, filename: `${file.title}.${file.ext}` },
            { caption, parse_mode: "HTML" }
          );
        } else {
          await ctx.replyWithVideo(
            { source: file.filePath },
            { caption, parse_mode: "HTML", supports_streaming: true }
          );
        }

        sentCount++;
        if (ctx.from?.id) await db.recordDownload(ctx.from.id);
      } catch (e) {
        logger.warn(`Failed to send file: ${file.filePath}`);
      } finally {
        await cleanupFile(file.filePath);
      }
    }

    if (sentCount > 0) {
      logger.info(`${platformName}: ${sentCount} files sent`);
    } else {
      await ctx.reply(`❌ Files send nahi hui. Dubara try karo.`);
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`${platformName} error: ${errMsg}`);

    let hint = "";
    if (platform === "instagram")
      hint = "\n\n💡 Instagram account public hona chahiye";
    else if (platform === "tiktok")
      hint = "\n\n💡 Direct share link use karo";
    else if (platform === "twitter")
      hint = "\n\n💡 Video wala tweet ka link bhejo";

    await ctx.reply(
      `❌ <b>${platformName}</b> se download nahi hua!\n\n` +
        `Reason: <code>${errMsg.slice(0, 150)}</code>` +
        hint,
      { parse_mode: "HTML" }
    );

    for (const f of results) {
      await cleanupFile(f.filePath).catch(() => {});
    }
  }
}

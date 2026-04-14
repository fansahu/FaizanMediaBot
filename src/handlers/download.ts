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
import { promises as fs } from "fs";

const MAX_SIZE_MB = 45;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export async function handleYoutubeVideo(ctx: Context) {
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
  platform: string
) {
  const emoji = getPlatformEmoji(platform as ReturnType<typeof detectPlatform>);
  const platformName = getPlatformName(
    platform as ReturnType<typeof detectPlatform>
  );

  const msg = await ctx.reply(
    `${emoji} <b>${platformName}</b> se video download ho rahi hai...\n⏳ Please wait...`,
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
        caption: `${emoji} <b>${info.title || result.title}</b>\n📥 @ddoshulk_bot`,
        parse_mode: "HTML",
        supports_streaming: true,
      }
    );

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
        caption: `🎵 <b>${result.title}</b>\n📥 @ddoshulk_bot`,
        parse_mode: "HTML",
      }
    );

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

  if (
    platform === "youtube" &&
    (text.toLowerCase().includes("mp3") ||
      text.toLowerCase().includes("audio") ||
      text.toLowerCase().includes("song") ||
      text.toLowerCase().includes("music"))
  ) {
    return processDownloadAudio(ctx, url);
  }

  const isAudioOnlyPlatform = false;
  if (isAudioOnlyPlatform) {
    return processDownloadAudio(ctx, url);
  }

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

        const caption = `${emoji} <b>${file.title.slice(0, 80)}</b>\n📥 @ddoshulk_bot`;

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

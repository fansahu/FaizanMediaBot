import { Context } from "telegraf";
import axios from "axios";
import { logger } from "../utils/logger.js";

export async function handleLyrics(ctx: Context) {
  const text = ctx.text || "";
  const query = text.replace(/^\/lyrics\s*/i, "").trim();

  if (!query) {
    return ctx.replyWithHTML(
      `🎵 <b>Lyrics Finder</b>\n\n` +
        `Usage: <code>/lyrics [artist - song name]</code>\n\n` +
        `Examples:\n` +
        `<code>/lyrics Arijit Singh - Tum Hi Ho</code>\n` +
        `<code>/lyrics Ed Sheeran - Shape of You</code>\n` +
        `<code>/lyrics Diljit Dosanjh - Born to Shine</code>`
    );
  }

  const msg = await ctx.reply(`🎵 Lyrics dhundh raha hoon: "${query}"...`);

  try {
    let artist = "";
    let title = query;

    if (query.includes(" - ")) {
      const parts = query.split(" - ");
      artist = parts[0].trim();
      title = parts[1].trim();
    }

    const apiUrl = artist
      ? `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
      : `https://api.lyrics.ovh/suggest/${encodeURIComponent(query)}`;

    if (!artist) {
      const suggestRes = await axios.get<{
        data: Array<{ artist: { name: string }; title: string }>;
      }>(apiUrl, { timeout: 10000 });
      const songs = suggestRes.data?.data;
      if (!songs?.length) throw new Error("Song not found");

      const songList = songs
        .slice(0, 5)
        .map(
          (s, i) =>
            `${i + 1}. <code>/lyrics ${s.artist.name} - ${s.title}</code>`
        )
        .join("\n");

      return ctx.telegram.editMessageText(
        msg.chat.id,
        msg.message_id,
        undefined,
        `🎵 <b>Search Results for "${query}":</b>\n\n${songList}\n\nKoi ek choose karo aur run karo!`,
        { parse_mode: "HTML" }
      );
    }

    const lyricsRes = await axios.get<{ lyrics: string }>(apiUrl, {
      timeout: 10000,
    });
    const lyrics = lyricsRes.data?.lyrics;
    if (!lyrics) throw new Error("Lyrics not found");

    const cleanLyrics = lyrics.replace(/\r\n/g, "\n").trim();
    const maxLen = 3800;

    const header = `🎵 <b>${artist} - ${title}</b>\n\n`;

    if (cleanLyrics.length > maxLen) {
      await ctx.telegram.editMessageText(
        msg.chat.id,
        msg.message_id,
        undefined,
        header + cleanLyrics.slice(0, maxLen) + "\n\n<i>...continue below</i>",
        { parse_mode: "HTML" }
      );
      await ctx.reply(cleanLyrics.slice(maxLen, maxLen * 2), {
        parse_mode: "HTML",
      });
    } else {
      await ctx.telegram.editMessageText(
        msg.chat.id,
        msg.message_id,
        undefined,
        header + cleanLyrics,
        { parse_mode: "HTML" }
      );
    }
  } catch (err: unknown) {
    logger.error(`Lyrics error: ${err}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `❌ Lyrics nahi mili!\n\n` +
        `Try: <code>/lyrics Artist Name - Song Name</code>\n` +
        `Example: <code>/lyrics Arijit Singh - Tum Hi Ho</code>`,
      { parse_mode: "HTML" }
    );
  }
}

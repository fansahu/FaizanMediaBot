import { Context } from "telegraf";
import Parser from "rss-parser";
import { logger } from "../utils/logger.js";

const parser = new Parser();

const NEWS_FEEDS: Record<string, { name: string; url: string; emoji: string }> = {
  india: {
    name: "India News",
    emoji: "🇮🇳",
    url: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
  },
  world: {
    name: "World News",
    emoji: "🌍",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
  },
  tech: {
    name: "Tech News",
    emoji: "💻",
    url: "https://feeds.feedburner.com/TechCrunch",
  },
  sports: {
    name: "Sports News",
    emoji: "⚽",
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
  },
  business: {
    name: "Business News",
    emoji: "💰",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
  },
};

export async function handleNews(ctx: Context) {
  const text = ctx.text || "";
  const category = text.replace(/^\/news\s*/i, "").trim().toLowerCase();

  if (!category || !NEWS_FEEDS[category]) {
    const cats = Object.entries(NEWS_FEEDS)
      .map(([k, v]) => `${v.emoji} <code>/news ${k}</code> — ${v.name}`)
      .join("\n");
    return ctx.replyWithHTML(
      `📰 <b>News Bot</b>\n\n` +
        `Usage: <code>/news [category]</code>\n\n` +
        `<b>Categories:</b>\n${cats}`
    );
  }

  const feed = NEWS_FEEDS[category];
  const msg = await ctx.reply(`${feed.emoji} ${feed.name} le raha hoon...`);

  try {
    const result = await parser.parseURL(feed.url);
    const items = result.items.slice(0, 8);

    if (!items.length) throw new Error("No news found");

    const newsText = items
      .map((item, i) => {
        const title = item.title?.replace(/<[^>]*>/g, "") || "No title";
        const link = item.link || "";
        return `${i + 1}. <a href="${link}">${title}</a>`;
      })
      .join("\n\n");

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `${feed.emoji} <b>${feed.name}</b>\n\n${newsText}\n\n<i>Source: RSS Feed</i>`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } }
    );
  } catch (err: unknown) {
    logger.error(`News error: ${err}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `❌ News nahi mila! Thodi der baad try karo.\n\n` +
        `/news india — try karo`
    );
  }
}

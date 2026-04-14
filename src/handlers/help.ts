import { Context } from "telegraf";

const helpSections: Record<string, string> = {
  download:
    `📥 <b>MEDIA DOWNLOADER</b>\n\n` +
    `Bas link paste karo — quality buttons dikhenge!\n\n` +
    `✅ YouTube • Instagram • TikTok\n` +
    `✅ Twitter/X • Facebook • Reddit\n\n` +
    `<b>Commands:</b>\n` +
    `▶️ /video [link] — YouTube video\n` +
    `🎵 /mp3 [link] — YouTube audio\n\n` +
    `⚠️ Max 45MB | Private account support nahi`,

  ai:
    `🤖 <b>AI FEATURES</b>\n\n` +
    `💬 /ai [sawaal] — AI se baat karo\n` +
    `📸 Photo bhejo → AI image analysis\n` +
    `🎙️ Voice bhejo → Text mein convert\n` +
    `🔄 /aireset — Chat history reset\n\n` +
    `<i>Gemini AI powered — free & unlimited!</i>`,

  tools:
    `🛠️ <b>TOOLS</b>\n\n` +
    `🌤️ /weather Delhi — Mausam\n` +
    `🌐 /translate en Hello — Translate\n` +
    `📰 /news india — Latest news\n` +
    `🎵 /lyrics Arijit - Tum Hi Ho\n` +
    `🔗 /shorten [URL] — Chhota link\n` +
    `🧮 /calc 25*4+10 — Calculator\n` +
    `💰 /crypto bitcoin — Crypto price\n` +
    `💬 /quote — Motivational quote`,

  extras:
    `✨ <b>EXTRA FEATURES</b>\n\n` +
    `📱 /qr [text/link] — QR Code banao\n` +
    `📸 /ss google.com — Website screenshot\n` +
    `📖 /define [word] — English dictionary\n` +
    `🏓 /ping — Bot speed check\n\n` +
    `<b>Account:</b>\n` +
    `⭐ /premium — Premium info\n` +
    `📊 /mystats — Apni stats\n` +
    `🆔 /myid — Apna Telegram ID`,
};

export async function handleHelp(ctx: Context) {
  await ctx.replyWithHTML(
    `📖 <b>FaizanMediaBot — Help Menu</b>\n\n` +
    `Category chuno 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📥 Downloader", callback_data: "help_download" },
            { text: "🤖 AI Features", callback_data: "help_ai" },
          ],
          [
            { text: "🛠️ Tools", callback_data: "help_tools" },
            { text: "✨ Extras", callback_data: "help_extras" },
          ],
        ],
      },
    }
  );
}

export async function handleHelpCallback(ctx: Context) {
  const cb = ctx.callbackQuery as any;
  if (!cb?.data?.startsWith("help_")) return;

  const section = cb.data.replace("help_", "");
  const text = helpSections[section];
  if (!text) return;

  await ctx.answerCbQuery().catch(() => {});
  await ctx.editMessageText(text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "📥 Downloader", callback_data: "help_download" },
          { text: "🤖 AI Features", callback_data: "help_ai" },
        ],
        [
          { text: "🛠️ Tools", callback_data: "help_tools" },
          { text: "✨ Extras", callback_data: "help_extras" },
        ],
      ],
    },
  });
}

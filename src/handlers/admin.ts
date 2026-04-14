import { Context, Telegraf } from "telegraf";
import { db, FREE_DAILY_LIMIT } from "../database/db.js";
import { logger } from "../utils/logger.js";

const ADMIN_ID = Number(process.env.ADMIN_ID || "0");

export function isAdmin(userId: number): boolean {
  return userId === ADMIN_ID;
}

function adminCheck(ctx: Context): boolean {
  const userId = ctx.from?.id;
  if (!userId || !isAdmin(userId)) {
    ctx.reply("❌ Yeh command sirf admin ke liye hai!");
    return false;
  }
  return true;
}

export async function handleAdmin(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const stats = db.getStats();
  const text =
    `🛡️ <b>Admin Panel — FaizanMediaBot</b>\n\n` +
    `👥 Total Users: <b>${stats.totalUsers}</b>\n` +
    `⭐ Premium: <b>${stats.premiumUsers}</b>\n` +
    `🆓 Free: <b>${stats.freeUsers}</b>\n` +
    `🚫 Banned: <b>${stats.bannedUsers}</b>\n` +
    `📊 Active Today: <b>${stats.activeToday}</b>\n` +
    `📥 Total Downloads: <b>${stats.totalDownloads}</b>\n\n` +
    `<b>Commands:</b>\n` +
    `/addpremium &lt;user_id&gt; — Premium add karo\n` +
    `/removepremium &lt;user_id&gt; — Premium hatao\n` +
    `/ban &lt;user_id&gt; — User ban karo\n` +
    `/unban &lt;user_id&gt; — User unban karo\n` +
    `/userinfo &lt;user_id&gt; — User info dekho\n` +
    `/broadcast &lt;message&gt; — Sabko message bhejo\n` +
    `/premiumlist — Saare premium users\n` +
    `/allusers — Saare users\n` +
    `/botstats — Detailed stats`;

  await ctx.replyWithHTML(text);
}

export async function handleAddPremium(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const parts = msg?.text?.split(" ");
  if (!parts || parts.length < 2) {
    return ctx.reply("❌ Usage: /addpremium <user_id> [note]\n\nExample: /addpremium 123456789 Paid via UPI");
  }

  const targetId = Number(parts[1]);
  const note = parts.slice(2).join(" ") || "Admin se premium mili";

  if (isNaN(targetId)) return ctx.reply("❌ Valid user ID do!");

  let user = db.getUserById(targetId);
  if (!user) {
    return ctx.reply(`❌ User ID ${targetId} database mein nahi mila.\n\nUser ko pehle bot use karna hoga.`);
  }

  const updated = await db.setPremium(targetId, true, note);
  if (!updated) return ctx.reply("❌ User nahi mila!");

  await ctx.replyWithHTML(
    `✅ <b>Premium Add!</b>\n\n` +
    `👤 User: ${updated.firstName || "Unknown"} (@${updated.username || "N/A"})\n` +
    `🆔 ID: <code>${targetId}</code>\n` +
    `📝 Note: ${note}\n` +
    `⭐ Status: PREMIUM`
  );

  try {
    await ctx.telegram.sendMessage(
      targetId,
      `🎉 <b>Congratulations!</b>\n\n` +
      `⭐ Aapko <b>Premium</b> mil gayi!\n\n` +
      `✅ Ab aap <b>unlimited</b> downloads kar sakte hain!\n` +
      `📥 Koi bhi link bhejo — YouTube, Instagram, TikTok sab!\n\n` +
      `Shukriya FaizanMediaBot use karne ke liye! 🙏`,
      { parse_mode: "HTML" }
    );
  } catch {
    await ctx.reply("ℹ️ User ko notification nahi jai — shayad bot block kiya hai.");
  }
}

export async function handleRemovePremium(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const parts = msg?.text?.split(" ");
  if (!parts || parts.length < 2) return ctx.reply("❌ Usage: /removepremium <user_id>");

  const targetId = Number(parts[1]);
  if (isNaN(targetId)) return ctx.reply("❌ Valid user ID do!");

  const updated = await db.setPremium(targetId, false);
  if (!updated) return ctx.reply("❌ User nahi mila!");

  await ctx.replyWithHTML(
    `✅ Premium hataya gaya\n` +
    `👤 ${updated.firstName || "Unknown"} (@${updated.username || "N/A"})\n` +
    `🆔 ID: <code>${targetId}</code>\n` +
    `📊 Ab Free user hai (${FREE_DAILY_LIMIT}/day limit)`
  );

  try {
    await ctx.telegram.sendMessage(
      targetId,
      `ℹ️ Aapki Premium membership expire ho gayi hai.\n` +
      `Ab aap ${FREE_DAILY_LIMIT} downloads/day kar sakte hain.\n\n` +
      `Premium ke liye admin se contact karein.`
    );
  } catch {}
}

export async function handleBan(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const parts = msg?.text?.split(" ");
  if (!parts || parts.length < 2) return ctx.reply("❌ Usage: /ban <user_id>");

  const targetId = Number(parts[1]);
  if (isNaN(targetId)) return ctx.reply("❌ Valid user ID do!");
  if (isAdmin(targetId)) return ctx.reply("❌ Admin ko ban nahi kar sakte!");

  const updated = await db.setBan(targetId, true);
  if (!updated) return ctx.reply("❌ User nahi mila!");

  await ctx.replyWithHTML(`🚫 <b>User Banned!</b>\n👤 ${updated.firstName || "Unknown"}\n🆔 <code>${targetId}</code>`);
}

export async function handleUnban(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const parts = msg?.text?.split(" ");
  if (!parts || parts.length < 2) return ctx.reply("❌ Usage: /unban <user_id>");

  const targetId = Number(parts[1]);
  if (isNaN(targetId)) return ctx.reply("❌ Valid user ID do!");

  const updated = await db.setBan(targetId, false);
  if (!updated) return ctx.reply("❌ User nahi mila!");

  await ctx.replyWithHTML(`✅ <b>User Unbanned!</b>\n👤 ${updated.firstName || "Unknown"}\n🆔 <code>${targetId}</code>`);
}

export async function handleUserInfo(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const parts = msg?.text?.split(" ");
  if (!parts || parts.length < 2) return ctx.reply("❌ Usage: /userinfo <user_id>");

  const targetId = Number(parts[1]);
  if (isNaN(targetId)) return ctx.reply("❌ Valid user ID do!");

  const user = db.getUserById(targetId);
  if (!user) return ctx.reply("❌ User nahi mila! (Bot use nahi kiya abhi tak)");

  const joinDate = new Date(user.joinedAt).toLocaleDateString("en-IN");
  await ctx.replyWithHTML(
    `👤 <b>User Info</b>\n\n` +
    `🆔 ID: <code>${user.userId}</code>\n` +
    `📛 Name: ${user.firstName || "N/A"}\n` +
    `👤 Username: @${user.username || "N/A"}\n` +
    `⭐ Status: ${user.isPremium ? "PREMIUM ⭐" : "Free 🆓"}\n` +
    `🚫 Banned: ${user.isBanned ? "Yes" : "No"}\n` +
    `📥 Today: ${user.dailyDownloads}/${user.isPremium ? "∞" : FREE_DAILY_LIMIT}\n` +
    `📊 Total Downloads: ${user.totalDownloads}\n` +
    `📅 Joined: ${joinDate}\n` +
    `${user.premiumNote ? `📝 Note: ${user.premiumNote}` : ""}`
  );
}

export async function handleBroadcast(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const msg = ctx.message as any;
  const text = msg?.text?.replace("/broadcast", "").trim();
  if (!text) return ctx.reply("❌ Usage: /broadcast <message>");

  const users = db.getAllUsers().filter((u) => !u.isBanned);
  await ctx.reply(`📡 Broadcast shuru — ${users.length} users ko bhej raha hoon...`);

  let success = 0;
  let failed = 0;

  for (const user of users) {
    try {
      await ctx.telegram.sendMessage(
        user.userId,
        `📢 <b>FaizanMediaBot Update</b>\n\n${text}`,
        { parse_mode: "HTML" }
      );
      success++;
      await new Promise((r) => setTimeout(r, 50));
    } catch {
      failed++;
    }
  }

  await ctx.reply(`✅ Broadcast complete!\n✅ Success: ${success}\n❌ Failed: ${failed}`);
}

export async function handlePremiumList(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const premiumUsers = db.getAllUsers().filter((u) => u.isPremium);
  if (premiumUsers.length === 0) return ctx.reply("❌ Koi premium user nahi hai abhi.");

  let text = `⭐ <b>Premium Users (${premiumUsers.length})</b>\n\n`;
  for (const u of premiumUsers) {
    text += `• <code>${u.userId}</code> — ${u.firstName || "N/A"} (@${u.username || "N/A"})\n`;
    if (u.premiumNote) text += `  📝 ${u.premiumNote}\n`;
  }

  await ctx.replyWithHTML(text);
}

export async function handleAllUsers(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const users = db.getAllUsers();
  if (users.length === 0) return ctx.reply("❌ Koi user nahi hai abhi.");

  const sorted = users.sort((a, b) => b.totalDownloads - a.totalDownloads).slice(0, 30);
  let text = `👥 <b>Top Users (${users.length} total)</b>\n\n`;

  for (const u of sorted) {
    const badge = u.isPremium ? "⭐" : u.isBanned ? "🚫" : "🆓";
    text += `${badge} <code>${u.userId}</code> — ${u.firstName || "N/A"} | ${u.totalDownloads} downloads\n`;
  }

  await ctx.replyWithHTML(text);
}

export async function handleBotStats(ctx: Context) {
  if (!adminCheck(ctx)) return;

  const stats = db.getStats();
  await ctx.replyWithHTML(
    `📊 <b>Bot Statistics</b>\n\n` +
    `👥 Total Users: <b>${stats.totalUsers}</b>\n` +
    `⭐ Premium Users: <b>${stats.premiumUsers}</b>\n` +
    `🆓 Free Users: <b>${stats.freeUsers}</b>\n` +
    `🚫 Banned Users: <b>${stats.bannedUsers}</b>\n` +
    `🟢 Active Today: <b>${stats.activeToday}</b>\n` +
    `📥 Total Downloads: <b>${stats.totalDownloads}</b>\n\n` +
    `⚙️ Free Limit: <b>${FREE_DAILY_LIMIT}/day</b>`
  );
}

export async function handleMyId(ctx: Context) {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const name = ctx.from?.first_name;
  await ctx.replyWithHTML(
    `🆔 <b>Tumhara Telegram ID</b>\n\n` +
    `ID: <code>${userId}</code>\n` +
    `Name: ${name || "N/A"}\n` +
    `Username: @${username || "N/A"}\n\n` +
    `Yeh ID admin ko do premium ke liye!`
  );
}

export async function handleMyStats(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await db.getOrCreate(userId, ctx.from?.username, ctx.from?.first_name);
  const check = await db.canDownload(userId);

  await ctx.replyWithHTML(
    `📊 <b>Tumhari Info</b>\n\n` +
    `👤 Name: ${user.firstName || "N/A"}\n` +
    `⭐ Status: ${user.isPremium ? "<b>PREMIUM ⭐</b>" : "Free 🆓"}\n` +
    `📥 Aaj ke downloads: <b>${user.dailyDownloads}</b>/${user.isPremium ? "∞" : FREE_DAILY_LIMIT}\n` +
    `${!user.isPremium ? `🔄 Remaining: <b>${check.remaining}</b>\n` : ""}` +
    `📊 Total Downloads: <b>${user.totalDownloads}</b>\n\n` +
    `${!user.isPremium ? `💡 Premium ke liye /premium dekho` : "✅ Unlimited downloads enjoy karo!"}`
  );
}

export async function handlePremiumInfo(ctx: Context) {
  await ctx.replyWithHTML(
    `⭐ <b>Premium Membership</b>\n\n` +
    `🆓 <b>Free Plan:</b>\n` +
    `• ${FREE_DAILY_LIMIT} downloads per day\n` +
    `• Sab platforms support\n\n` +
    `⭐ <b>Premium Plan:</b>\n` +
    `• Unlimited downloads\n` +
    `• Priority support\n` +
    `• Koi limit nahi!\n\n` +
    `📲 Premium ke liye admin se contact karo:\n` +
    `👉 Apna ID bhejo: /myid\n` +
    `Phir admin ko ID do!`
  );
}

export function registerAdminHandlers(bot: Telegraf) {
  bot.command("admin", handleAdmin);
  bot.command("addpremium", handleAddPremium);
  bot.command("removepremium", handleRemovePremium);
  bot.command("ban", handleBan);
  bot.command("unban", handleUnban);
  bot.command("userinfo", handleUserInfo);
  bot.command("broadcast", handleBroadcast);
  bot.command("premiumlist", handlePremiumList);
  bot.command("allusers", handleAllUsers);
  bot.command("botstats", handleBotStats);
  bot.command("myid", handleMyId);
  bot.command("mystats", handleMyStats);
  bot.command("premium", handlePremiumInfo);
}

import { Context } from "telegraf";
import axios from "axios";
import { logger } from "../utils/logger.js";

interface WttrResponse {
  current_condition: Array<{
    temp_C: string;
    FeelsLikeC: string;
    humidity: string;
    windspeedKmph: string;
    weatherDesc: Array<{ value: string }>;
    uvIndex: string;
  }>;
  nearest_area: Array<{
    areaName: Array<{ value: string }>;
    country: Array<{ value: string }>;
  }>;
  weather: Array<{
    date: string;
    maxtempC: string;
    mintempC: string;
    hourly: Array<{
      time: string;
      tempC: string;
      weatherDesc: Array<{ value: string }>;
      chanceofrain: string;
    }>;
  }>;
}

const weatherEmoji = (desc: string): string => {
  const d = desc.toLowerCase();
  if (d.includes("sunny") || d.includes("clear")) return "☀️";
  if (d.includes("cloud")) return "☁️";
  if (d.includes("rain") || d.includes("drizzle")) return "🌧️";
  if (d.includes("thunder") || d.includes("storm")) return "⛈️";
  if (d.includes("snow") || d.includes("blizzard")) return "❄️";
  if (d.includes("fog") || d.includes("mist")) return "🌫️";
  if (d.includes("wind")) return "💨";
  if (d.includes("haze")) return "🌁";
  return "🌤️";
};

export async function handleWeather(ctx: Context) {
  const text = ctx.text || "";
  const city = text.replace(/^\/weather\s*/i, "").trim();

  if (!city) {
    return ctx.replyWithHTML(
      `🌤️ <b>Weather Bot</b>\n\n` +
        `Usage: <code>/weather [shehar ka naam]</code>\n\n` +
        `Examples:\n` +
        `<code>/weather Delhi</code>\n` +
        `<code>/weather Mumbai</code>\n` +
        `<code>/weather London</code>\n` +
        `<code>/weather New York</code>`
    );
  }

  const msg = await ctx.reply(`🌤️ ${city} ka mausam dekh raha hoon...`);

  try {
    const encoded = encodeURIComponent(city);
    const res = await axios.get<WttrResponse>(
      `https://wttr.in/${encoded}?format=j1`,
      { timeout: 10000 }
    );

    const data = res.data;
    const current = data.current_condition[0];
    const area = data.nearest_area[0];
    const today = data.weather[0];
    const tomorrow = data.weather[1];

    const desc = current.weatherDesc[0].value;
    const emoji = weatherEmoji(desc);
    const location = `${area.areaName[0].value}, ${area.country[0].value}`;

    const todayDesc = today.hourly[4]?.weatherDesc[0]?.value || desc;
    const tomorrowDesc = tomorrow?.hourly[4]?.weatherDesc[0]?.value || "";

    const reply =
      `${emoji} <b>${location}</b>\n\n` +
      `🌡️ <b>Temperature:</b> ${current.temp_C}°C (feels ${current.FeelsLikeC}°C)\n` +
      `📝 <b>Condition:</b> ${desc}\n` +
      `💧 <b>Humidity:</b> ${current.humidity}%\n` +
      `💨 <b>Wind:</b> ${current.windspeedKmph} km/h\n` +
      `🌞 <b>UV Index:</b> ${current.uvIndex}\n\n` +
      `📅 <b>Aaj (${today.date}):</b>\n` +
      `   🔺 Max: ${today.maxtempC}°C | 🔻 Min: ${today.mintempC}°C\n` +
      `   ${weatherEmoji(todayDesc)} ${todayDesc}\n\n` +
      (tomorrow
        ? `📅 <b>Kal (${tomorrow.date}):</b>\n` +
          `   🔺 Max: ${tomorrow.maxtempC}°C | 🔻 Min: ${tomorrow.mintempC}°C\n` +
          `   ${weatherEmoji(tomorrowDesc)} ${tomorrowDesc}\n\n`
        : "") +
      `📍 <i>Data: wttr.in</i>`;

    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      reply,
      { parse_mode: "HTML" }
    );
  } catch (err: unknown) {
    logger.error(`Weather error: ${err}`);
    await ctx.telegram.editMessageText(
      msg.chat.id,
      msg.message_id,
      undefined,
      `❌ <b>${city}</b> ka mausam nahi mila!\nShehar ka naam English mein likhke try karo.`,
      { parse_mode: "HTML" }
    );
  }
}

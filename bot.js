import "dotenv/config";
import { createServer } from "node:http";
import { Telegraf, Markup } from "telegraf";
import { createReadStream, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { offersForAmount, groupOffers, FALLBACKS } from "./offers.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const logosDir = join(__dirname, "photos", "logos");

const {
  TELEGRAM_BOT_TOKEN,
  CALCULATOR_URL = "https://example.com/calculator",
  MIN_AMOUNT = "3000",
  MAX_AMOUNT = "100000",
} = process.env;

const [FALLBACK_FIN5, FALLBACK_TZAEM] = FALLBACKS;

const minAmount = Number(MIN_AMOUNT);
const maxAmount = Number(MAX_AMOUNT);

if (!TELEGRAM_BOT_TOKEN) {
  console.error("Укажите TELEGRAM_BOT_TOKEN в файле .env");
  process.exit(1);
}

const photos = {
  hello: join(__dirname, "photos", "hello.png"),
};

const amountButtons = Markup.keyboard([
  ["10 000", "30 000", "50 000"],
  ["70 000", "100 000", "Другая сумма"],
]).resize();

function formatMoney(n) {
  return new Intl.NumberFormat("ru-RU").format(n);
}

function parseAmount(text) {
  if (!text) return null;
  const cleaned = text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/₽|руб\.?|р\.?/g, "")
    .replace(/тыс(?:яч)?а?и?/g, "000")
    .replace(/k/g, "000");

  const match = cleaned.match(/(\d[\d.,]*)/);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function logoPath(filename) {
  if (!filename) return null;
  const path = join(logosDir, filename);
  return existsSync(path) ? path : null;
}

function offerCaption(offer) {
  const star = offer.zeroFirst ? "⭐ " : "";
  return `${star}${offer.title}\n${offer.blurb}`;
}

function offerKeyboard(offer) {
  return Markup.inlineKeyboard([[Markup.button.url("👉 Оформить", offer.url)]]);
}

function followUpKeyboard(noAction = "loan_no") {
  const rows = [];
  if (CALCULATOR_URL && !CALCULATOR_URL.includes("example.com")) {
    rows.push([Markup.button.url("📊 Калькулятор", CALCULATOR_URL)]);
  }
  rows.push([
    Markup.button.callback("✅ Да, взял", "loan_yes"),
    Markup.button.callback("❌ Нет", noAction),
  ]);
  rows.push([Markup.button.callback("Другая сумма", "again")]);
  return Markup.inlineKeyboard(rows);
}

function fallbackOpenKeyboard(offer) {
  return Markup.inlineKeyboard([[Markup.button.url("👉 Оформить", offer.url)]]);
}

async function sendFallbackCard(ctx, offer, askAgainAction) {
  const caption = `Запасной вариант: ${offer.title}\n${offer.blurb}`;
  const path = logoPath(offer.logo);

  if (path) {
    await ctx.replyWithPhoto(
      { source: createReadStream(path) },
      { caption, ...fallbackOpenKeyboard(offer) }
    );
  } else {
    await ctx.reply(caption, fallbackOpenKeyboard(offer));
  }

  if (askAgainAction) {
    await ctx.reply(
      "Удалось оформить этот вариант?\nЕсли нет — предложу ещё один.",
      followUpKeyboard(askAgainAction)
    );
  } else {
    await ctx.reply(
      "Это последний запасной вариант.\nЕсли понадобится ещё — /start или «Другая сумма».",
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ Да, взял", "loan_yes")],
        [Markup.button.callback("Другая сумма", "again")],
      ])
    );
  }
}

function buildIntroText(amount, offers) {
  const { headline, sections } = groupOffers(offers, amount);
  let text = `Ок, сумма: ${formatMoney(amount)} ₽.\n\n${headline}.\n`;
  for (const section of sections) {
    text += `\n${section.title}:\n`;
    for (const o of section.items) {
      text += `• ${o.title}\n`;
    }
  }
  text += `\nНиже варианты — откройте подходящий 👇`;
  return text;
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

async function sendPhoto(ctx, key, caption, extra = {}) {
  const path = photos[key];
  if (!existsSync(path)) {
    await ctx.reply(caption, extra);
    return;
  }
  await ctx.replyWithPhoto({ source: createReadStream(path) }, { caption, ...extra });
}

async function sendOfferCard(ctx, offer) {
  const path = logoPath(offer.logo);
  const caption = offerCaption(offer);
  const extra = offerKeyboard(offer);

  if (path) {
    await ctx.replyWithPhoto({ source: createReadStream(path) }, { caption, ...extra });
  } else {
    await ctx.reply(caption, extra);
  }
}

async function askAmount(ctx) {
  await ctx.reply(
    "Какую сумму хотите взять?\nВыберите кнопку или напишите свою сумму.",
    amountButtons
  );
}

async function sendOffer(ctx, amount) {
  if (amount < minAmount) {
    await ctx.reply(
      `Минимальная сумма — ${formatMoney(minAmount)} ₽.\nВыберите другую сумму.`,
      amountButtons
    );
    return;
  }

  if (amount > maxAmount) {
    await ctx.reply(
      `Максимум сейчас — ${formatMoney(maxAmount)} ₽.\nМогу предложить расчёт на максимум.`,
      amountButtons
    );
    amount = maxAmount;
  }

  const offers = offersForAmount(amount);
  if (!offers.length) {
    await ctx.reply(
      `Под ${formatMoney(amount)} ₽ прямых вариантов нет.\nПредложу запасной вариант.`
    );
    await sendFallbackCard(ctx, FALLBACK_FIN5, "loan_no_fin5");
    return;
  }

  await ctx.reply("Готово ✅", Markup.removeKeyboard());
  await ctx.reply(buildIntroText(amount, offers));

  for (const offer of offers) {
    await sendOfferCard(ctx, offer);
  }

  await ctx.reply(
    "Удалось оформить займ?\nЕсли нет — предложу запасной вариант.",
    followUpKeyboard("loan_no")
  );
}

bot.start(async (ctx) => {
  await sendPhoto(
    ctx,
    "hello",
    "Здравствуйте! Я онлайн-консультант по займам.\nСначала выберите сумму — покажу подходящие варианты."
  );
  await askAmount(ctx);
});

bot.command("summa", askAmount);

bot.action("again", async (ctx) => {
  await ctx.answerCbQuery();
  await askAmount(ctx);
});

bot.action("loan_yes", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "Отлично! Рада, что получилось 😊\nЕсли понадобится ещё — напишите /start"
  );
});

bot.action("loan_no", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("Поняла. Сначала попробуйте этот вариант 👇");
  await sendFallbackCard(ctx, FALLBACK_FIN5, "loan_no_fin5");
});

bot.action("loan_no_fin5", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply("Тогда последний запасной вариант 👇");
  await sendFallbackCard(ctx, FALLBACK_TZAEM, null);
});

bot.hears("Другая сумма", async (ctx) => {
  await ctx.reply("Напишите нужную сумму цифрами, например: 25000");
});

bot.hears(/^\d[\d\s]*$/, async (ctx) => {
  const amount = parseAmount(ctx.message.text);
  if (!amount) {
    await ctx.reply("Не распознала сумму. Пример: 30000");
    return;
  }
  await sendOffer(ctx, amount);
});

bot.on("text", async (ctx) => {
  const text = ctx.message.text?.trim() || "";
  if (text.startsWith("/")) return;

  const amount = parseAmount(text);
  if (!amount) {
    await ctx.reply(
      "Напишите сумму цифрами или выберите кнопку ниже.\nПример: 30000",
      amountButtons
    );
    return;
  }

  await sendOffer(ctx, amount);
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

const port = Number(process.env.PORT) || 3000;
createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("loan-bot ok");
}).listen(port, () => {
  console.log(`Healthcheck on :${port}`);
});

bot.launch().then(() => {
  console.log("Loan bot started (sum → logo cards → fallback T-Zaem)");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

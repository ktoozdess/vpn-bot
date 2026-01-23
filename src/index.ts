import { Telegraf, Markup, Context } from "telegraf";
import dotenv from "dotenv";
import { XUIClient } from "./xui.js";

import fs from "fs";
import { getUserLocale, labels, strings } from "./i18n.js";
import { PLANS, pricingConfig } from "./Pricing/pricingConfig.js";
import { adminUsername } from "./constants.js";

const USERS_FILE = "./users.json";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const xuiClient = new XUIClient({
    baseURL: process.env.XUI_BASE_URL!,
    username: process.env.XUI_USERNAME!,
    password: process.env.XUI_PASSWORD!,
});

const getReplyKeyboard = (ctx: any) => {
    const lang = ctx.from?.language_code === "ru" ? "ru" : "en";
    const l = labels[lang];

    return Markup.keyboard([[l.status, l.link], [l.info, l.help], [l.about]]).resize();
};

bot.hears([labels.ru.about, labels.en.about], async (ctx) => {
    const locale = getUserLocale(ctx);
    const aboutText = strings[locale].about;

    await ctx.reply(aboutText, {
        parse_mode: "HTML",
    });
});

const subscribeKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback(PLANS.TRIAL.label, "buy_trial")],
    [Markup.button.callback(PLANS.MONTHLY.label, "buy_monthly")],
]);

// subscriptionPlans
bot.hears([labels.ru.info, labels.en.info], async (ctx) => {
    const locale = getUserLocale(ctx);
    const text = strings[locale].subscriptionPlans;

    await ctx.reply(text, {
        parse_mode: "HTML",
        ...subscribeKeyboard,
        link_preview_options: {
            is_disabled: true,
        },
    });
});

// Логика покупки ТРИАЛА
bot.action("buy_trial", async (ctx) => {
    await ctx.answerCbQuery();
    const tgId = ctx.from!.id;
    const locale = getUserLocale(ctx);

    try {
        const existing = await xuiClient.findUserByTelegramId(tgId);

        if (existing) {
            return ctx.reply(strings[locale].trialUsed);
        }

        const inbounds = await xuiClient.getInbounds();
        if (!inbounds.length) {
            return ctx.reply(strings[locale].noInbounds);
        }

        const uuid = await xuiClient.createUser(inbounds[0].id, tgId, PLANS.TRIAL.days);

        await ctx.reply(strings[locale].trialActivated(PLANS.TRIAL.days), { parse_mode: "HTML" });
    } catch (e) {
        console.error(e);
        ctx.reply(strings[locale].error);
    }
});

// Логика покупки МЕСЯЦА (здесь обычно добавляется ссылка на оплату)
bot.action("buy_monthly", async (ctx) => {
    await ctx.answerCbQuery();
    const locale = getUserLocale(ctx);

    const invoiceStrings = {
        ru: {
            title: "Tiina VPN: 30 дней",
            description: "Доступ к VPN на 30 дней.",
            label: "Доступ на 30 дней",
        },
        en: {
            title: "Tiina VPN: 30 Days",
            description: "VPN access for 30 days.",
            label: "30-day access",
        },
    };

    await ctx.replyWithInvoice({
        title: invoiceStrings[locale].title,
        description: invoiceStrings[locale].description,
        payload: "month_subscription",
        provider_token: "",
        currency: "XTR",
        prices: [
            {
                label: invoiceStrings[locale].label,
                amount: pricingConfig.starsPrice,
            },
        ],
    });
});
bot.on("pre_checkout_query", async (ctx) => {
    // Здесь можно еще раз проверить наличие свободных мест на сервере
    await ctx.answerPreCheckoutQuery(true);
});

// 2. Действие после успешной оплаты
bot.on("successful_payment", async (ctx) => {
    const tgId = ctx.from.id;
    const days = PLANS.MONTHLY.days;
    const locale = getUserLocale(ctx);

    try {
        const existing = await xuiClient.findUserByTelegramId(tgId);

        if (existing) {
            await xuiClient.updateUserExpiry(existing.inbound.id, existing.client.id, tgId, days);
        } else {
            const inbounds = await xuiClient.getInbounds();
            if (inbounds.length > 0) {
                await xuiClient.createUser(inbounds[0].id, tgId, days);
            }
        }

        await ctx.reply(strings[locale].paymentSuccess(days), { parse_mode: "HTML" });
    } catch (e) {
        console.error("Error after payment:", e);
        await ctx.reply(strings[locale].paymentError(adminUsername), { parse_mode: "HTML" });
    }
});

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (LOGIC) ---

const formatTraffic = (bytes: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// getUserInfo func
async function getUserInfo(tgId: number, locale: "ru" | "en") {
    const user = await xuiClient.findUserByTelegramId(tgId);
    if (!user) return { error: strings[locale].noActiveSub };

    const { client } = user;
    const now = Date.now();
    const isExpired = client.expiryTime > 0 && client.expiryTime < now;
    const stats = await xuiClient.getClientStats(client.email);

    const dateLocale = locale === "ru" ? "ru-RU" : "en-US";
    const expiryDate =
        client.expiryTime > 0
            ? new Date(client.expiryTime).toLocaleString(dateLocale)
            : strings[locale].unlimited;

    const status = isExpired ? strings[locale].statusExpired : strings[locale].statusActive;

    const text = strings[locale].infoText(
        status,
        expiryDate,
        formatTraffic(stats?.up || 0),
        formatTraffic(stats?.down || 0),
    );

    return { text };
}

// Функция получения ссылки (общая)
async function getConnectionLink(tgId: number, locale: "ru" | "en") {
    const user = await xuiClient.findUserByTelegramId(tgId);

    if (!user) return { error: strings[locale].noSubFound };

    const { client, inbound } = user;
    if (client.expiryTime > 0 && client.expiryTime < Date.now()) {
        return { error: strings[locale].subExpired };
    }

    // Парсим настройки стрима
    const streamSettings =
        typeof inbound.streamSettings === "string"
            ? JSON.parse(inbound.streamSettings)
            : inbound.streamSettings;

    const security = streamSettings.security || "none";
    const transport = streamSettings.network || "tcp";

    const baseUrl = new URL(process.env.XUI_BASE_URL!);
    const host = baseUrl.hostname;

    const inboundName = encodeURIComponent(inbound.remark || inbound.tag || "Tiina_VPN");

    const params = new URLSearchParams({
        type: transport,
        encryption: "none",
        security: security,
    });

    // Настройки для TLS
    if (security === "tls") {
        const tlsSettings = streamSettings.tlsSettings;

        const sni = tlsSettings?.serverName || host;
        const cleanSni = sni.replace(/^https?:\/\//, "").split("/")[0];
        params.append("sni", cleanSni);

        const fp = tlsSettings?.settings?.utls || "chrome";
        params.append("fp", fp);

        if (tlsSettings?.alpn && tlsSettings.alpn.length > 0) {
            params.append("alpn", tlsSettings.alpn.join(","));
        }
    }

    const link = `vless://${client.id}@${host}:${inbound.port}?${params.toString()}#${inboundName}`;

    const text = strings[locale].connectionLinkHeader.replace("{link}", link);

    return { text };
}

// --- КОМАНДЫ ---

// Функция для получения списка всех ID
function getAllUsers(): number[] {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, "utf-8");
        return JSON.parse(data || "[]");
    } catch (e) {
        console.error("Error reading users file:", e);
        return [];
    }
}

// Функция сохранения (с проверкой)
function saveUser(id: number) {
    const users = getAllUsers();
    if (!users.includes(id)) {
        users.push(id);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        console.log(`Saved new user: ${id}`);
    }
}

bot.command("start", async (ctx) => {
    await xuiClient.login();

    const locale = getUserLocale(ctx);

    saveUser(ctx.from.id);

    await ctx.reply(strings[locale].welcome, {
        parse_mode: "HTML",
        reply_markup: getReplyKeyboard(ctx).reply_markup,
    });
});

const ADMIN_ID = 680365861; // ADMIN_ID

bot.command("all", async (ctx) => {
    // Check for admin rights
    if (ctx.from.id !== ADMIN_ID) return;

    const args = ctx.message.text.split(" ");
    const replyTo = ctx.message.reply_to_message;
    const users = getAllUsers();

    if (users.length === 0) {
        return ctx.reply("❌ User list is empty.");
    }

    // Determine what we are sending
    const broadcastText = args.slice(1).join(" ");

    if (!replyTo && !broadcastText) {
        return ctx.reply(
            "Usage:\n1. `/all Hello world` - send text\n2. Reply to any message with `/all` - copy that message",
            { parse_mode: "Markdown" },
        );
    }

    await ctx.reply(`🚀 Starting broadcast to ${users.length} users...`);

    let count = 0;
    let blockedCount = 0;

    for (const userId of users) {
        try {
            if (replyTo) {
                // Copies any message type (photo, video, document, etc.)
                await ctx.telegram.copyMessage(userId, ctx.chat.id, replyTo.message_id);
            } else {
                // Sends plain text
                await ctx.telegram.sendMessage(userId, broadcastText, {
                    parse_mode: "HTML",
                });
            }
            count++;

            // Anti-flood delay (approx 30 messages per second)
            await new Promise((res) => setTimeout(res, 35));
        } catch (e: any) {
            // Common error: user blocked the bot
            if (e.description === "Forbidden: bot was blocked by the user") {
                blockedCount++;
            }
            console.log(`Failed to send message to ${userId}: ${e.message}`);
        }
    }

    await ctx.reply(
        `✅ <b>Broadcast completed!</b>\n\n` +
            `Доставлено: <code>${count}</code>\n` +
            `Blocked/Failed: <code>${blockedCount}</code>`,
        { parse_mode: "HTML" },
    );
});

bot.command("info", async (ctx) => {
    const locale = getUserLocale(ctx);

    const res = await getUserInfo(ctx.from.id, locale);
    await ctx.reply(res.text || res.error!, { parse_mode: "HTML" });
});

bot.command("get", async (ctx) => {
    const locale = getUserLocale(ctx);

    const res = await getConnectionLink(ctx.from.id, locale);
    await ctx.reply(res.text || res.error!, { parse_mode: "HTML" });
});

// --- ОБРАБОТКА КНОПОК (ACTIONS) ---

// Кнопка Статуса
bot.hears([labels.ru.status, labels.en.status], async (ctx) => {
    const locale = getUserLocale(ctx);

    const res = await getUserInfo(ctx.from.id, locale);
    await ctx.reply(res.text || res.error!, { parse_mode: "HTML" });
});

// Кнопка Ссылки
bot.hears([labels.ru.link, labels.en.link], async (ctx) => {
    const locale = getUserLocale(ctx);

    const res = await getConnectionLink(ctx.from.id, locale);

    if (res.error) {
        return ctx.reply(res.error, { parse_mode: "HTML" });
    }

    await ctx.reply(res.text!, {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([[Markup.button.callback(labels[locale].help, "btn_help_sub")]]),
    });
});

bot.hears([labels.ru.help, labels.en.help], async (ctx) => {
    await sendHelp(ctx);
});

bot.action("btn_help_sub", async (ctx) => {
    await ctx.answerCbQuery();
    await sendHelp(ctx);
});

async function sendHelp(ctx: any) {
    const locale = getUserLocale(ctx);
    const helpText = strings[locale].helpText;

    await ctx.reply(helpText, {
        parse_mode: "HTML",
        link_preview_options: {
            is_disabled: true,
        },
    });
}

bot.launch();
console.log("🚀 Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

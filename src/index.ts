import { Telegraf, Markup, Context } from 'telegraf';
import dotenv from 'dotenv';
import { XUIClient } from './xui.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const xuiClient = new XUIClient({
  baseURL: process.env.XUI_BASE_URL!,
  username: process.env.XUI_USERNAME!,
  password: process.env.XUI_PASSWORD!,
});

const replyKeyboard = Markup.keyboard([
  ['📊 My Status', '🔗 Get VPN Link'],
  ['💳 Subscription Info', '❓ How to start use'],
  ['ℹ️ About Us'] // Новый ряд для одной кнопки
]).resize();

bot.hears('ℹ️ About Us', async (ctx) => {
  const aboutText = 
     `<b>Tiina VPN - Security made simple</b>\n\n` +
    `<b>About Our Service</b>\n\n` +
    `🚀 <b>High Speed:</b> We use modern protocols (VLESS) to ensure maximum performance.\n` +
    `🛡 <b>Privacy:</b> We do not log your activity. Your data is secure.\n` +
    `🌍 <b>Global Access:</b> Bypass restrictions and access any content worldwide.\n\n` +
    `<i>Thank you for choosing us!</i>`;

  await ctx.reply(aboutText, { 
    parse_mode: 'HTML',
    // // Опционально: можно добавить кнопку со ссылкой на канал с новостями
    // ...Markup.inlineKeyboard([
    //   [Markup.button.url('📢 Our Channel', 'https://t.me/your_channel_link')]
    // ])
  });
});

const PLANS = {
  TRIAL: { days: 10, label: '🎁 Free Trial (10 days)', price: 'Free' },
  MONTHLY: { days: 30, label: '🗓 1 Month Plan', price: '3 USDT / 299 RUB' }
};

const subscribeKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback(PLANS.TRIAL.label, 'buy_trial')],
  [Markup.button.callback(PLANS.MONTHLY.label, 'buy_monthly')],
]);

// Кнопка Информации о подписке (вызывает меню выбора)
bot.hears('💳 Subscription Info', async (ctx) => {
  const text = 
    `💳 <b>Subscription Plans:</b>\n\n` +
    `• <b>Trial:</b> 10 days (Available once per user)\n` +
    `• <b>Monthly:</b> 30 days for 3 USDT / 299 RUB\n\n` +
    `Select your option below:`;
  
  await ctx.reply(text, { parse_mode: 'HTML', ...subscribeKeyboard });
});

// Логика покупки ТРИАЛА
bot.action('buy_trial', async (ctx) => {
  await ctx.answerCbQuery();
  const tgId = ctx.from!.id;

  try {
    const existing = await xuiClient.findUserByTelegramId(tgId);
    
    // Если пользователь уже есть в базе 3X-UI, значит он уже создавался (триал использован)
    if (existing) {
      return ctx.reply('❌ You have already used your trial period or have an active subscription.');
    }

    const inbounds = await xuiClient.getInbounds();
    if (!inbounds.length) return ctx.reply('❌ Server error: No inbounds.');

    const uuid = await xuiClient.createUser(inbounds[0].id, tgId, PLANS.TRIAL.days);
    
    await ctx.reply(
      `✅ <b>Trial activated!</b>\n` +
      `You have ${PLANS.TRIAL.days} days of free access.\n\n` +
      `Tap "🔗 Get VPN Link" in the menu to start.`,
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    ctx.reply('❌ Error activating trial.');
  }
});

// Логика покупки МЕСЯЦА (здесь обычно добавляется ссылка на оплату)
bot.action('buy_monthly', async (ctx) => {
  await ctx.answerCbQuery();
  
  const paymentText = 
    `💎 <b>Monthly Subscription</b>\n\n` +
    `Price: <b>${PLANS.MONTHLY.price}</b>\n\n` +
    `To pay, please contact our administrator: @your_admin_handle\n` +
    `<i>(Or you can integrate an automatic payment system here later)</i>`;
    
  await ctx.reply(paymentText, { parse_mode: 'HTML' });
});

// --- ОБНОВЛЕННАЯ КОМАНДА SUBSCRIBE (для ручного ввода админом) ---
bot.command('subscribe', async (ctx) => {
  // Проверяем, является ли отправитель админом (опционально)
  const args = ctx.message.text.split(' ');
  const days = parseInt(args[1]);
  
  if (!days) return ctx.reply('Usage: /subscribe <days>');

  try {
    const tgId = ctx.from.id;
    const existing = await xuiClient.findUserByTelegramId(tgId);
    
    if (existing) {
      await xuiClient.updateUserExpiry(existing.inbound.id, existing.client.id, tgId, days);
      return ctx.reply(`✅ Subscription extended by ${days} days.`);
    }
    // ... логика создания нового пользователя (как в старом коде)
  } catch (e: any) {
    ctx.reply(`❌ Error: ${escapeMarkdown(e.message)}`);
  }
});


// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (LOGIC) ---

const formatTraffic = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const escapeMarkdown = (text: string) => {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

// Функция получения инфо (общая для команды и кнопки)
async function getUserInfo(tgId: number) {
  const user = await xuiClient.findUserByTelegramId(tgId);
  if (!user) return { error: '❌ You do not have an active subscription. Use /subscribe' };

  const { client } = user;
  const now = Date.now();
  const isExpired = client.expiryTime > 0 && client.expiryTime < now;
  const stats = await xuiClient.getClientStats(client.email);

  const expiryDate = client.expiryTime > 0 
    ? new Date(client.expiryTime).toLocaleString('en-US') 
    : 'Unlimited';

  const status = isExpired ? '❌ <b>EXPIRED</b>' : '✅ <b>ACTIVE</b>';

  const text = 
    `<b>Subscription Information:</b>\n` +
    `Status: ${status}\n\n` +
    `📅 Expires: <code>${expiryDate}</code>\n` +
    `🔼 Uploaded: <code>${formatTraffic(stats?.up || 0)}</code>\n` +
    `🔽 Downloaded: <code>${formatTraffic(stats?.down || 0)}</code>\n\n` +
    `<i>To extend, use /subscribe [days]</i>`;

  return { text };
}

// Функция получения ссылки (общая)
async function getConnectionLink(tgId: number) {
  const user = await xuiClient.findUserByTelegramId(tgId);
  if (!user) return { error: '❌ Subscription not found. Use /subscribe' };

  const { client, inbound } = user;
  if (client.expiryTime > 0 && client.expiryTime < Date.now()) {
    return { error: '❌ Your subscription has expired.' };
  }

  const baseUrl = new URL(process.env.XUI_BASE_URL!);
  const host = baseUrl.hostname;
  const inboundName = encodeURIComponent(inbound.remark || inbound.tag || 'XUI_VPN');
  const link = `vless://${client.id}@${host}:${inbound.port}?encryption=none&security=tls&type=tcp#${inboundName}`;

  const text = 
    `🔗 <b>Your connection link:</b>\n\n` +
    `<code>${link}</code>\n\n` +
    `<i>Tap the link above to copy it.</i>`;
    
  return { text };
}

// --- КОМАНДЫ ---

bot.command('start', async (ctx) => {
  await xuiClient.login();
  
  const welcomeText = 
    `👋 <b>Welcome!</b>\n\n` +
    `We provide VPN keys for fast and secure access using the <b>VLESS</b> protocol. ` +
    `Simply paste the key into your VPN application.\n\n` +
    `📍 The menu is located in your keyboard (☰) — select a section below or get your VPN link instantly.`;

  await ctx.reply(welcomeText, {
    parse_mode: 'HTML',
    ...replyKeyboard
  });
});

bot.command('info', async (ctx) => {
  const res = await getUserInfo(ctx.from.id);
  await ctx.reply(res.text || res.error!, { parse_mode: 'HTML' });
});

bot.command('get', async (ctx) => {
  const res = await getConnectionLink(ctx.from.id);
  await ctx.reply(res.text || res.error!, { parse_mode: 'HTML' });
});

bot.command('subscribe', async (ctx) => {
  const days = parseInt(ctx.message.text.split(' ')[1]);
  if (!days) return ctx.reply('Usage: /subscribe <days>\nExample: `/subscribe 30`', { parse_mode: 'Markdown' });

  try {
    const tgId = ctx.from.id;
    const existing = await xuiClient.findUserByTelegramId(tgId);
    
    if (existing) {
      await xuiClient.updateUserExpiry(existing.inbound.id, existing.client.id, tgId, days);
      return ctx.reply(`✅ Subscription extended by ${days} days.`);
    }

    const inbounds = await xuiClient.getInbounds();
    if (!inbounds.length) return ctx.reply('❌ Server error: No inbounds.');

    const uuid = await xuiClient.createUser(inbounds[0].id, tgId, days);
    await ctx.reply(`✅ Subscribed\\! Your ID:\n\`${uuid}\``, { parse_mode: 'MarkdownV2' });
  } catch (e: any) {
    ctx.reply(`❌ Error: ${escapeMarkdown(e.message)}`);
  }
});

// --- ОБРАБОТКА КНОПОК (ACTIONS) ---

// Кнопка Статуса
bot.hears('📊 My Status', async (ctx) => {
  const res = await getUserInfo(ctx.from.id);
  await ctx.reply(res.text || res.error!, { parse_mode: 'HTML' });
});

// Кнопка Ссылки
bot.hears('🔗 Get VPN Link', async (ctx) => {
  const res = await getConnectionLink(ctx.from.id);
  
  // Если произошла ошибка (например, нет подписки), просто выводим текст ошибки
  if (res.error) {
    return ctx.reply(res.error, { parse_mode: 'HTML' });
  }

  // Если ссылка получена, добавляем к сообщению кнопку "How to start"
  await ctx.reply(res.text!, { 
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('❓ How to start use', 'btn_help_sub')] 

    ])
  });
});

// Кнопка Информации о подписке
bot.hears('💳 Subscription Info', async (ctx) => {
  const infoText = 
    `💳 <b>How to subscribe:</b>\n\n` +
    `Use the command <code>/subscribe [days]</code> to get access.\n` +
    `Example: <code>/subscribe 30</code> for a 1-month plan.\n\n` +
    `<i>Accepted automatically via the bot system.</i>`;
  
  await ctx.reply(infoText, { parse_mode: 'HTML' });
});

bot.hears('❓ How to start use', async (ctx) => {
  await sendHelp(ctx);
});

// 2. ДОБАВЛЯЕМ обработчик для Inline-кнопки (которая под ссылкой)
bot.action('btn_help_sub', async (ctx) => {
  await ctx.answerCbQuery(); // Обязательно, чтобы убрать "часики" на кнопке
  await sendHelp(ctx);
});

// 3. Выносим текст помощи в отдельную функцию, чтобы не дублировать код
async function sendHelp(ctx: Context) {
  const helpText =
    `<b>How to get started:</b>\n\n` +
    `1️⃣ <b>Install the app (Happ Proxy):</b>\n` +
    `• <a href="https://play.google.com/store/apps/details?id=com.happproxy">Download for Android</a>\n` +
    `• <a href="https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973">Download for iOS (Russia)</a>\n` +
    `• <a href="https://apps.apple.com/us/app/happ-proxy-utility/id6504287215">Download for iOS (Global)</a>\n\n` +
    `2️⃣ <b>Get your link:</b>\n` +
    `Click "🔗 Get VPN Link" in this bot and copy the link.\n\n` +
    `3️⃣ <b>Connect:</b>\n` +
    `Open the app, add the configuration (usually via the "+" icon or "Import from Clipboard"), and press "Connect".\n\n` +
    `🤝 <b>Support:</b>\n` +
    `If you have any questions, contact <a href="https://t.me/Tiina_Support">the administrator</a>.`;

  await ctx.reply(helpText, { 
    parse_mode: 'HTML',
    link_preview_options:{
      is_disabled: true
    }
  });
}

// --- ЗАПУСК ---

bot.launch();
console.log('🚀 Bot is running with menus...');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { XUIClient } from './xui.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const xuiClient = new XUIClient({
  baseURL: process.env.XUI_BASE_URL!,
  username: process.env.XUI_USERNAME!,
  password: process.env.XUI_PASSWORD!,
});

bot.command('start', async (ctx) => {
  const ok = await xuiClient.login();
  ctx.reply(ok ? '✅ Connected to 3X-UI' : '❌ Connection failed');
});

bot.command('help', (ctx) => {
  const helpText = 
    `<b>Доступные команды:</b>\n\n` +
    `/start — Проверить соединение с панелью\n` +
    `/subscribe &lt;days&gt; — Активировать или продлить подписку\n` +
    `/get — Получить ссылку для подключения (VLESS)\n` +
    `/info — Проверить статус подписки и трафик\n` +
    `/help — Показать это сообщение`;

  ctx.reply(helpText, { parse_mode: 'HTML' });
});

// --- Обновленная команда INFO ---
bot.command('info', async (ctx) => {
  try {
    const tgId = ctx.from!.id;
    const user = await xuiClient.findUserByTelegramId(tgId);
    
    if (!user) {
      return ctx.reply('❌ У вас нет активной подписки. Используйте /subscribe');
    }

    const { client } = user;
    const now = Date.now();
    const isExpired = client.expiryTime > 0 && client.expiryTime < now;
    
    // Получаем реальный трафик именно этого пользователя
    const stats = await xuiClient.getClientStats(client.email);

    const expiryDate = client.expiryTime > 0 
      ? new Date(client.expiryTime).toLocaleString('ru-RU') 
      : 'Бессрочно';

    const formatTraffic = (bytes: number) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const status = isExpired ? '❌ <b>ИСТЕКЛА</b>' : '✅ <b>АКТИВНА</b>';

    const infoMessage = 
      `<b>Информация о подписке:</b>\n` +
      `Статус: ${status}\n\n` +
      `📅 Истекает: <code>${expiryDate}</code>\n` +
      `🔼 Отправлено: <code>${formatTraffic(stats?.up || 0)}</code>\n` +
      `🔽 Загружено: <code>${formatTraffic(stats?.down || 0)}</code>\n\n` +
      `<i>Чтобы продлить, используйте /subscribe [дни]</i>`;

    ctx.reply(infoMessage, { parse_mode: 'HTML' });
  } catch (e) {
    console.error(e);
    ctx.reply('❌ Не удалось получить свежую информацию.');
  }
});

// Функция для экранирования символов MarkdownV2
const escapeMarkdown = (text: string) => {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
};

bot.command('subscribe', async (ctx) => {
  const days = parseInt(ctx.message.text.split(' ')[1]);
  if (!days) return ctx.reply('Usage: /subscribe <days>');

  const tgId = ctx.from.id;

  try {
    const existing = await xuiClient.findUserByTelegramId(tgId);
    
    if (existing) {
      await xuiClient.updateUserExpiry(existing.inbound.id, existing.client.id, tgId, days);
      // Экранируем текст, но оставляем разметку если нужно (здесь просто текст)
      return ctx.reply(escapeMarkdown(`✅ Subscription extended by ${days} days.`));
    }

    const inbounds = await xuiClient.getInbounds();
    if (!inbounds.length) return ctx.reply('❌ No inbounds found.');

    const targetInbound = inbounds[0];
    const uuid = await xuiClient.createUser(targetInbound.id, tgId, days);

    // Важно: UUID внутри кода ` ` не требует экранирования, 
    // но текст вокруг него — требует!
    const message = `✅ Subscribed\\! Your ID:\n\`${uuid}\``;
    
    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  } catch (e: any) {
    ctx.reply(`❌ Error: ${escapeMarkdown(e.message)}`);
  }
});

bot.command('list', async (ctx) => {
  try {
    const inbounds = await xuiClient.getInbounds();
    if (inbounds.length === 0) {
      ctx.reply('No VPN connections available.');
      return;
    }
    const names = inbounds.map(i => i.remark || i.tag).join('\n');
    ctx.reply('Available VPNs:\n' + names);
  } catch (e) {
    console.error(e);
    ctx.reply('Failed to fetch VPN list.');
  }
});

bot.command('get', async (ctx) => {
  try {
    const user = await xuiClient.findUserByTelegramId(ctx.from.id);
    
    if (!user) {
      return ctx.reply('❌ У вас нет активной подписки. Используйте /subscribe');
    }

    const { client, inbound } = user;
    const now = Date.now();

    // Проверка на истечение срока перед выдачей ссылки
    if (client.expiryTime > 0 && client.expiryTime < now) {
      return ctx.reply('❌ Ваша подписка истекла. Продлите её, чтобы получить доступ.');
    }

    const baseUrl = new URL(process.env.XUI_BASE_URL!);
    const host = baseUrl.hostname;
    
    // Используем remark (имя в панели) или tag. 
    // encodeURIComponent нужен, чтобы пробелы в названии не сломали ссылку
    const inboundName = encodeURIComponent(inbound.remark || inbound.tag || 'XUI_VPN');
    
    // Формируем ссылку. Используем client.id (UUID)
    const link = `vless://${client.id}@${host}:${inbound.port}?encryption=none&security=tls&type=tcp#${inboundName}`;

    await ctx.reply(
      `🔗 <b>Ваша ссылка для подключения:</b>\n\n` +
      `<code>${link}</code>\n\n` +
      `<i>Нажмите на ссылку выше, чтобы скопировать её.</i>`, 
      { parse_mode: 'HTML' }
    );
  } catch (e) {
    console.error('Get link error:', e);
    ctx.reply('❌ Ошибка при получении ссылки.');
  }
});

bot.launch();
console.log('Bot is running...');
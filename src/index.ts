import { Telegraf, Context } from 'telegraf';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { XUIClient, XUIConfig, Inbound } from './xui.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// --- Локальная база пользователей ---
const usersFile = path.resolve('./users.json');

interface User {
  id: number;
  username: string;
  subscriptionExpiry: string | null;
}

function loadUsers(): User[] {
  if (!fs.existsSync(usersFile)) return [];
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function saveUsers(users: User[]) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function getUser(ctx: Context): User {
  const users = loadUsers();
  let user = users.find(u => u.id === ctx.from?.id);
  if (!user) {
    user = { id: ctx.from!.id, username: ctx.from!.username || '', subscriptionExpiry: null };
    users.push(user);
    saveUsers(users);
  }
  return user;
}

// --- 3X-UI ---
const xuiConfig: XUIConfig = {
  baseURL: process.env.XUI_BASE_URL!,
  username: process.env.XUI_USERNAME!,
  password: process.env.XUI_PASSWORD!,
};

const xuiClient = new XUIClient(xuiConfig);

// --- Команды ---

bot.command('start', async (ctx) => {
  try {
    await xuiClient.login();
    await ctx.reply('✅ Connected to 3X-UI\nUse /help to see commands.');
  } catch (e) {
    console.error(e);
    ctx.reply('❌ Failed to connect to 3X-UI.');
  }
});

bot.command('help', (ctx) => {
  ctx.reply(
    `/start - connect to 3X-UI\n` +
    `/subscribe <days> - activate subscription\n` +
    `/list - show VPN connections\n` +
    `/get <name> - get VPN link if subscription active\n` +
    `/info <name> - traffic & subscription info`
  );
});

bot.command('subscribe', (ctx) => {
  const args = ctx.message.text.split(' ');
  const days = parseInt(args[1]);
  if (!days || days <= 0) {
    ctx.reply('Usage: /subscribe <days>');
    return;
  }

  const user = getUser(ctx);
  const now = new Date();
  const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : now;
  const newExpiry = new Date(Math.max(now.getTime(), expiry.getTime()) + days * 24 * 60 * 60 * 1000);
  user.subscriptionExpiry = newExpiry.toISOString();

  const users = loadUsers();
  const index = users.findIndex(u => u.id === user.id);
  users[index] = user;
  saveUsers(users);

  ctx.reply(`✅ Subscription active until ${newExpiry.toLocaleString()}`);
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
  const args = ctx.message.text.split(' ');
  const name = args[1];
  if (!name) {
    ctx.reply('Usage: /get <name>');
    return;
  }

  const user = getUser(ctx);
  if (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) < new Date()) {
    ctx.reply('❌ Your subscription is inactive. Use /subscribe.');
    return;
  }

  try {
    const inbounds = await xuiClient.getInbounds();
    const inbound = inbounds.find(i => (i.remark || i.tag) === name);
    if (!inbound) {
      ctx.reply('VPN not found.');
      return;
    }

    const baseUrl = new URL(process.env.XUI_BASE_URL!);
    const host = baseUrl.hostname;
    const uuid = inbound.client?.uuid || 'MISSING_UUID';
    const url = `vless://${uuid}@${host}:${inbound.port}?encryption=none&security=tls&type=tcp#${name}`;

    ctx.reply(`🔗 Connection link for "${name}":\n${url}`);
  } catch (e) {
    console.error(e);
    ctx.reply('Failed to fetch VPN info.');
  }
});

bot.command('info', async (ctx) => {
  const args = ctx.message.text.split(' ');
  const name = args[1];
  if (!name) {
    ctx.reply('Usage: /info <name>');
    return;
  }

  const user = getUser(ctx);
  if (!user.subscriptionExpiry) {
    ctx.reply('❌ You have no subscription.');
    return;
  }

  try {
    const inbounds = await xuiClient.getInbounds();
    const inbound = inbounds.find(i => (i.remark || i.tag) === name);
    if (!inbound) {
      ctx.reply('VPN not found.');
      return;
    }

    ctx.reply(`Info for "${name}":\n` +
      `Protocol: ${inbound.protocol}\n` +
      `Port: ${inbound.port}\n` +
      `Up: ${(inbound.up / 1024).toFixed(2)} KB\n` +
      `Down: ${(inbound.down / 1024).toFixed(2)} KB\n` +
      `Total: ${(inbound.total / 1024).toFixed(2)} KB\n` +
      `Subscription expiry: ${new Date(user.subscriptionExpiry).toLocaleString()}`
    );
  } catch (e) {
    console.error(e);
    ctx.reply('Failed to fetch VPN info.');
  }
});

// --- Start bot ---
bot.launch();
console.log('Bot started ✅');

// --- Graceful shutdown ---
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
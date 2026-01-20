export const labels = {
  ru: {
    status: '📊 Мой статус',
    link: '🔗 Ссылка VPN',
    info: '💳 О подписке',
    help: '❓ Как начать',
    about: 'ℹ️ О нас'
  },
  en: {
    status: '📊 My Status',
    link: '🔗 Get VPN Link',
    info: '💳 Subscription Info',
    help: '❓ How to start use',
    about: 'ℹ️ About Us'
  }
};

export const strings = {
  ru: {
    welcome: 
      `👋 <b>Добро пожаловать!</b>\n\n` +
      `Мы предоставляем VPN ключи для быстрого и безопасного доступа по протоколу <b>VLESS</b>. ` +
      `Просто вставьте ключ в ваше VPN-приложение.\n\n` +
      `📍 Меню находится в вашей клавиатуре (☰) — выберите раздел ниже или получите ссылку мгновенно.`
  },
  en: {
    welcome: 
      `👋 <b>Welcome!</b>\n\n` +
      `We provide VPN keys for fast and secure access using the <b>VLESS</b> protocol. ` +
      `Simply paste the key into your VPN application.\n\n` +
      `📍 The menu is located in your keyboard (☰) — select a section below or get your VPN link instantly.`
  }
};

export const getUserLocale = (ctx: any) => {
  const code = ctx.from?.language_code;
  return code === 'ru' ? 'ru' : 'en'; // en - default
};
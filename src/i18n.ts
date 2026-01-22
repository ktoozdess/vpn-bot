import { adminUsername } from "./constants";
import { pricingConfig } from "./Pricing/pricingConfig";

export const labels = {
    ru: {
        status: "📊 Мой статус",
        link: "🔗 Ссылка VPN",
        info: "💳 О подписке",
        help: "❓ Как начать",
        about: "ℹ️ О нас",
    },
    en: {
        status: "📊 My Status",
        link: "🔗 Get VPN Link",
        info: "💳 Subscription Info",
        help: "❓ How to start use",
        about: "ℹ️ About Us",
    },
};

export const strings = {
    ru: {
        welcome:
            `👋 <b>Добро пожаловать!</b>\n\n` +
            `Мы предоставляем VPN ключи для быстрого и безопасного доступа по протоколу <b>VLESS</b>. ` +
            `Просто вставьте ключ в ваше VPN-приложение.\n\n` +
            `📍 Меню находится в вашей клавиатуре (☰) — выберите раздел ниже или получите ссылку мгновенно.`,
        about:
            `<b>Tiina VPN - Безопасность — это просто</b>\n\n` +
            `<b>О нашем сервисе</b>\n\n` +
            `🚀 <b>Высокая скорость:</b> Мы используем современные протоколы (VLESS) для максимальной производительности.\n` +
            `🛡 <b>Конфиденциальность:</b> Мы не ведем логи вашей активности. Ваши данные в безопасности.\n` +
            `🌍 <b>Глобальный доступ:</b> Получайте доступ к любому контенту по всему миру.\n\n` +
            `<i>Спасибо, что выбрали нас!</i>`,
        subscriptionPlans:
            `💳 <b>Тарифные планы:</b>\n\n` +
            `• <b>Пробный:</b> 10 дней (доступен один раз для каждого пользователя <b>бесплатно</b>)\n` +
            `• <b>Месячный:</b> 30 дней за ${pricingConfig.starsPrice} STARS (для оплаты в USDT напишите <a href="https://t.me/${adminUsername}">Админу</a>)\n\n` +
            `Выберите подходящий вариант ниже:`,
        trialUsed: "❌ Вы уже использовали пробный период или у вас есть активная подписка.",
        noInbounds: "❌ Ошибка сервера: Входящие подключения не найдены.",
        trialActivated: (days: number) =>
            `✅ <b>Пробный период активирован!</b>\n` +
            `У вас есть ${days} дней бесплатного доступа.\n\n` +
            `Нажмите "🔗 Ссылка VPN" в меню, чтобы начать.`,
        error: "❌ Ошибка при активации пробного периода.",
        paymentSuccess: (days: number) =>
            `🎉 <b>Оплата прошла успешно!</b>\n` +
            `Ваша подписка продлена на ${days} дней.\n\n` +
            `Нажмите "🔗 Ссылка VPN", чтобы получить конфиг.`,
        paymentError: (admin: string) =>
            `❌ Оплата получена, но возникла ошибка при обновлении подписки. Пожалуйста, свяжитесь с @${admin}`,
        noActiveSub: "❌ У вас нет активной подписки.",
        unlimited: "Безлимитно",
        statusActive: "✅ <b>АКТИВНА</b>",
        statusExpired: "❌ <b>ИСТЕКЛА</b>",
        infoText: (status: string, expiry: string, up: string, down: string) =>
            `<b>Информация о подписке:</b>\n` +
            `Статус: ${status}\n\n` +
            `📅 Истекает: <code>${expiry}</code>\n` +
            `🔼 Отправлено: <code>${up}</code>\n` +
            `🔽 Загружено: <code>${down}</code>\n\n` +
            `<i>Для продления используйте 💳 О подписке</i>`,
        noSubFound: "❌ Подписка не найдена. Используйте /subscribe",
        subExpired: "❌ Срок вашей подписки истек.",
        connectionLinkHeader:
            `🔗 <b>Ваша ссылка для подключения:</b>\n\n` +
            `<code>{link}</code>\n\n` +
            `<i>Нажмите на ссылку выше, чтобы скопировать её.</i>`,
        helpText:
            `<b>Как начать пользоваться:</b>\n\n` +
            `1️⃣ <b>Установите приложение (Happ Proxy):</b>\n` +
            `• <a href="https://play.google.com/store/apps/details?id=com.happproxy">Скачать для Android</a>\n` +
            `• <a href="https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973">Скачать для iOS (Россия)</a>\n` +
            `• <a href="https://apps.apple.com/us/app/happ-proxy-utility/id6504287215">Скачать для iOS (Весь мир)</a>\n\n` +
            `2️⃣ <b>Получите ссылку:</b>\n` +
            `Нажмите кнопку "🔗 Ссылка VPN" в этом боте и скопируйте её.\n\n` +
            `3️⃣ <b>Подключитесь:</b>\n` +
            `Откройте приложение, добавьте конфигурацию (обычно через иконку "+" или "Import from Clipboard") и нажмите "Connect".\n\n` +
            `🤝 <b>Поддержка:</b>\n` +
            `Если у вас остались вопросы, напишите <a href="https://t.me/${adminUsername}">администратору</a>.`,
    },
    en: {
        welcome:
            `👋 <b>Welcome!</b>\n\n` +
            `We provide VPN keys for fast and secure access using the <b>VLESS</b> protocol. ` +
            `Simply paste the key into your VPN application.\n\n` +
            `📍 The menu is located in your keyboard (☰) — select a section below or get your VPN link instantly.`,
        about:
            `<b>Tiina VPN - Security made simple</b>\n\n` +
            `<b>About Our Service</b>\n\n` +
            `🚀 <b>High Speed:</b> We use modern protocols (VLESS) to ensure maximum performance.\n` +
            `🛡 <b>Privacy:</b> We do not log your activity. Your data is secure.\n` +
            `🌍 <b>Global Access:</b>Access any content worldwide.\n\n` +
            `<i>Thank you for choosing us!</i>`,
        subscriptionPlans:
            `💳 <b>Subscription Plans:</b>\n\n` +
            `• <b>Trial:</b> 10 days (Available once per user <b>for free</b>)\n` +
            `• <b>Monthly:</b> 30 days for ${pricingConfig.starsPrice} STARS (To pay with USDT contact <a href="https://t.me/${adminUsername}">admin</a>)\n\n` +
            `Select your option below:`,
        trialUsed: "❌ You have already used your trial period or have an active subscription.",
        noInbounds: "❌ Server error: No inbounds.",
        trialActivated: (days: number) =>
            `✅ <b>Trial activated!</b>\n` +
            `You have ${days} days of free access.\n\n` +
            `Tap "🔗 Get VPN Link" in the menu to start.`,
        error: "❌ Error activating trial.",
        paymentSuccess: (days: number) =>
            `🎉 <b>Payment successful!</b>\n` +
            `Your subscription has been extended by ${days} days.\n\n` +
            `Tap "🔗 Get VPN Link" to get your config.`,
        paymentError: (admin: string) =>
            `❌ Payment received, but there was an error updating your subscription. Please contact @${admin}`,
        noActiveSub: "❌ You do not have an active subscription.",
        unlimited: "Unlimited",
        statusActive: "✅ <b>ACTIVE</b>",
        statusExpired: "❌ <b>EXPIRED</b>",
        infoText: (status: string, expiry: string, up: string, down: string) =>
            `<b>Subscription Information:</b>\n` +
            `Status: ${status}\n\n` +
            `📅 Expires: <code>${expiry}</code>\n` +
            `🔼 Uploaded: <code>${up}</code>\n` +
            `🔽 Downloaded: <code>${down}</code>\n\n` +
            `<i>To extend, use 💳 Subscription Info</i>`,
        noSubFound: "❌ Subscription not found. Use /subscribe",
        subExpired: "❌ Your subscription has expired.",
        connectionLinkHeader:
            `🔗 <b>Your connection link:</b>\n\n` +
            `<code>{link}</code>\n\n` +
            `<i>Tap the link above to copy it.</i>`,
        helpText:
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
            `If you have any questions, contact <a href="https://t.me/${adminUsername}">the administrator</a>.`,
    },
};

export const getUserLocale = (ctx: any) => {
    const code = ctx.from?.language_code;
    return code === "ru" ? "ru" : "en"; // en - default
};

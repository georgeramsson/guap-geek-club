/**
 * @file src/lib/telegram.ts
 * @description Модуль отправки уведомлений о новых записях в Telegram-чат клуба.
 * Использует стандартный Bot API (без сторонних тяжелых библиотек).
 * Если переменные окружения не заданы, аккуратно выводит сообщение в консоль для отладки.
 */

interface NotificationPayload {
  gameTitle: string;
  system: string;
  master: string;
  dateTime: string;
  location: string;
  playerName: string;
  playerContact: string;
  comment?: string;
  isWaitlist: boolean;
  currentPlayers: number;
  maxPlayers: number;
}

/**
 * Отправляет форматированное сообщение в Telegram-чат организаторов клуба
 */
export async function sendTelegramNotification(payload: NotificationPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[Telegram Bot Disabled] Новое бронирование:', {
      game: payload.gameTitle,
      player: payload.playerName,
      contact: payload.playerContact,
      status: payload.isWaitlist ? 'Резерв' : 'Основа'
    });
    return false;
  }

  const statusEmoji = payload.isWaitlist ? '⏳' : '🎲';
  const statusTitle = payload.isWaitlist 
    ? '<b>ЛИСТ ОЖИДАНИЯ (РЕЗЕРВ)</b>' 
    : '<b>НОВАЯ ЗАПИСЬ НА ИГРУ!</b>';

  const message = [
    `${statusEmoji} ${statusTitle}`,
    '',
    `🎮 <b>Игра:</b> ${escapeHtml(payload.gameTitle)}`,
    `📜 <b>Система:</b> ${escapeHtml(payload.system)}`,
    `🧙 <b>Мастер:</b> ${escapeHtml(payload.master)}`,
    `📅 <b>Когда:</b> ${escapeHtml(payload.dateTime)}`,
    `📍 <b>Где:</b> ${escapeHtml(payload.location)}`,
    '',
    `👤 <b>Игрок:</b> ${escapeHtml(payload.playerName)}`,
    `🔗 <b>Контакт:</b> ${formatContact(payload.playerContact)}`,
    payload.comment ? `💬 <b>Заметка:</b> <i>${escapeHtml(payload.comment)}</i>` : null,
    '',
    `📊 <b>Места:</b> ${payload.currentPlayers}/${payload.maxPlayers} ${payload.currentPlayers >= payload.maxPlayers ? '🔴 (Набор закрыт)' : '🟢 (Есть места)'}`,
  ].filter(Boolean).join('\n');

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Telegram API Error]:', errText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[Telegram Notification Failed]:', error);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatContact(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `<a href="${trimmed}">${trimmed}</a>`;
  }
  if (trimmed.startsWith('@')) {
    const username = trimmed.slice(1);
    return `<a href="https://t.me/${username}">${trimmed}</a>`;
  }
  if (trimmed.startsWith('vk.com/')) {
    return `<a href="https://${trimmed}">${trimmed}</a>`;
  }
  return escapeHtml(trimmed);
}

/**
 * @file src/components/CopyAnnouncementModal.tsx
 * @description Модальное окно для мастеров и организаторов клуба «СОЗВЕЗДИЕ»:
 * Генерирует готовый красивый текст анонса с прямой ссылкой на конкретную игру (/games/[id])
 * для быстрой публикации на стене ВКонтакте или в Telegram-канале клуба.
 * 
 * Поддерживает форматы:
 * - Ваншоты по НРИ;
 * - Кампании (с выводом списка всех дат сессий);
 * - Открытые игротеки со свободным входом;
 * - Мероприятия формата «Прочее» с кастомным заголовком.
 */

'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { GameWithBookings } from '@/lib/types';
import { formatRuDate } from '@/lib/dateUtils';

interface CopyAnnouncementModalProps {
  game: GameWithBookings | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CopyAnnouncementModal({ game, isOpen, onClose }: CopyAnnouncementModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !game) return null;

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://guap-geek-club.onrender.com';
  const directGameUrl = `${siteOrigin}/games/${game.id}`;

  const isCampaign = game.eventType === 'campaign';
  const isOther = game.eventType === 'other';
  const isOpenBoardgame = game.eventType === 'open_boardgame';

  let announcementHeader = `🎲 АНОНС ИГРЫ: ${game.title}`;
  if (isCampaign) {
    announcementHeader = `🗺️ АНОНС КАМПАНИИ: ${game.title}`;
  } else if (isOpenBoardgame) {
    announcementHeader = `🎉 ОТКРЫТАЯ ИГРОТЕКА ГУАП: ${game.title}`;
  } else if (isOther) {
    announcementHeader = `✨ ${game.customEventType ? game.customEventType.toUpperCase() : 'МЕРОПРИЯТИЕ'}: ${game.title}`;
  }

  const dateLine = isCampaign && game.dates && game.dates.length > 1
    ? `📅 Даты сессий: ${game.dates.map(d => formatRuDate(d)).join(', ')} в ${game.time}`
    : `📅 Дата и время: ${formatRuDate(game.date)} в ${game.time}`;

  const announcementText = !game.requiresBooking ? `${announcementHeader}

🎲 Формат: ${isOpenBoardgame ? 'Настольные игры, свободный вход (без записи!)' : (game.customEventType || 'Свободный вход')}
🧙 Организаторы: ${game.master}
${dateLine}
📍 Место: ${game.location}

📖 Подробности:
${game.description}

${game.tags?.length ? `Теги: ${game.tags.map(t => '#' + t).join(' ')}\n` : ''}
🔗 Подробная информация:
${directGameUrl}

Приходи один или с друзьями! Всегда рады новичкам и опытным игрокам.`
  : `${announcementHeader}

📜 Система / Формат: ${game.system}${isCampaign ? ' (Кампания)' : ''}
🧙 Ведущий (Мастер): ${game.master}
${dateLine}
📍 Место: ${game.location}
👥 Свободных мест: ${Math.max(0, game.maxPlayers - game.playersCount)} из ${game.maxPlayers}

📖 Описание:
${game.description}

${game.tags?.length ? `Теги: ${game.tags.map(t => '#' + t).join(' ')}\n` : ''}
🔗 Прямая ссылка на запись (места обновляются в реальном времени):
${directGameUrl}

(Записывайтесь по ссылке на сайте, чтобы занять гарантированное место или встать в лист ожидания!)`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(announcementText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="relative w-full max-w-lg rounded-2xl glass-panel p-6 sm:p-7 text-white border border-purple-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-purple-300 hover:text-white rounded-lg hover:bg-purple-900/40 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Share2 className="w-5 h-5 text-yellow-300" />
          <h3 className="font-pixy text-xl text-gradient-accent">
            Текст анонса для ВК и Telegram
          </h3>
        </div>

        <p className="text-xs text-purple-200/80 mb-4">
          Текст уже содержит <b>прямую ссылку на эту сессию</b>. Опубликуйте его в группе ВК или канале ТГ — игроки перейдут сразу на карточку игры!
        </p>

        <div className="relative mb-4">
          <textarea
            readOnly
            rows={12}
            value={announcementText}
            className="w-full p-3.5 rounded-xl bg-purple-950/80 border border-purple-700/60 text-xs font-mono text-purple-100 focus:outline-none resize-none leading-relaxed select-all"
          />
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-gradient-accent text-[#0B0741] hover:opacity-90 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#0B0741]" />
              <span>Текст с прямой ссылкой скопирован!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Скопировать готовый анонс</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

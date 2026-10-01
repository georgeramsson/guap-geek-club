/**
 * @file src/components/CopyAnnouncementModal.tsx
 * @description Модальное окно для мастеров и организаторов:
 * Генерирует готовый красивый текст анонса с прямой ссылкой на конкретную игру (/games/[id])
 * для быстрой публикации на стене ВКонтакте или в Telegram-канале клуба.
 */

'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { GameWithBookings } from '@/lib/types';

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

  const isRpg = game.requiresBooking;

  const announcementText = isRpg ? `🎲 АНОНС ИГРЫ: ${game.title}

📜 Система: ${game.system}
🧙 Ведущий (Мастер): ${game.master}
📅 Дата и время: ${game.date} в ${game.time}
📍 Место: ${game.location}
👥 Свободных мест: ${game.maxPlayers - game.playersCount} из ${game.maxPlayers}

📖 Описание:
${game.description}

${game.tags?.length ? `Теги: ${game.tags.map(t => '#' + t).join(' ')}\n` : ''}
🔗 Прямая ссылка на запись (места обновляются в реальном времени):
${directGameUrl}

(Записывайтесь по ссылке на сайте, чтобы занять гарантированное место или встать в лист ожидания!)`
  : `🎉 ОТКРЫТАЯ ИГРОТЕКА ГУАП: ${game.title}

🎲 Формат: Настольные игры, свободный вход (без записи!)
🧙 Организаторы: ${game.master}
📅 Дата и время: ${game.date} с ${game.time}
📍 Место: ${game.location}

📖 Подробности:
${game.description}

${game.tags?.length ? `Теги: ${game.tags.map(t => '#' + t).join(' ')}\n` : ''}
🔗 Подробная информация об игротеке:
${directGameUrl}

Приходи один или с друзьями в любое удобное время! Волонтеры встретят и объяснят правила любой игры.`;

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
          className="absolute top-4 right-4 p-2 text-purple-300 hover:text-white rounded-lg hover:bg-purple-900/40"
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
          className="w-full py-3 px-5 rounded-xl font-bold text-sm bg-gradient-accent text-[#0B0741] hover:opacity-90 flex items-center justify-center gap-2 shadow-lg transition-all"
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

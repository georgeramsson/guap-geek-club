/**
 * @file src/components/GameCard.tsx
 * @description Карточка настольной или ролевой игры для витрины анонсов клуба «СОЗВЕЗДИЕ» (ГУАП).
 * 
 * Назначение:
 * Отображает ключевые сведения о предстоящей или архивной партии: НРИ-систему, ведущего,
 * дату и аудиторию в ГУАП, прогресс заполнения стола и список участников.
 * 
 * Принцип работы:
 * 1. Вычисляет статус заполненности (основной состав, лист ожидания, свободный вход).
 * 2. Применяет табличные цифры (tabular-nums) для стабильного отображения счетчиков и времени без скачков верстки.
 * 3. Позволяет скопировать прямую ссылку на карточку игры в буфер обмена.
 * 4. Предоставляет кнопку перехода к форме записи (onBookClick) или просмотру страницы игры.
 * 
 * Стандарты UI/UX:
 * - Реализован согласно принципам better-ui и better-typography:
 *   концентрические скругления элементов, лаконичный текст, отсутствие лишних неоновых пятен и эмодзи-шума.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Check, 
  ArrowRight,
  Info
} from 'lucide-react';
import { GameWithBookings } from '@/lib/types';

interface GameCardProps {
  game: GameWithBookings;
  onBookClick: (game: GameWithBookings) => void;
}

export function GameCard({ game, onBookClick }: GameCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const mainPlayers = game.bookings.filter((b) => !b.isWaitlist);
  const waitlistPlayers = game.bookings.filter((b) => b.isWaitlist);
  const freeSeats = Math.max(0, game.maxPlayers - mainPlayers.length);
  const percentFilled = game.maxPlayers > 0 
    ? Math.min(100, Math.round((mainPlayers.length / game.maxPlayers) * 100))
    : 0;

  const handleCopyDirectLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/games/${game.id}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const getSystemBadgeColor = (sys: string) => {
    const s = sys.toLowerCase();
    if (s.includes('игротек') || s.includes('настол')) return 'bg-emerald-950/70 text-emerald-200 border-emerald-500/40';
    if (s.includes('d&d') || s.includes('dnd')) return 'bg-red-950/70 text-red-200 border-red-500/35';
    if (s.includes('wfrp') || s.includes('warhammer') || s.includes('вархаммер')) return 'bg-stone-900 text-amber-300 border-amber-600/40';
    if (s.includes('вампир') || s.includes('маскарад') || s.includes('vampire') || s.includes('vtm')) return 'bg-rose-950/70 text-rose-200 border-rose-500/40';
    if (s.includes('pathfinder') || s.includes('пасфайндер')) return 'bg-sky-950/70 text-sky-200 border-sky-500/40';
    return 'bg-purple-950/70 text-purple-200 border-purple-500/35';
  };

  return (
    <div 
      id={`game-${game.id}`}
      className={`glass-panel rounded-2xl p-5 sm:p-6 transition-all duration-200 flex flex-col justify-between group relative overflow-hidden ${
        game.isPast ? 'opacity-85 border-purple-950/80' : ''
      }`}
    >
      <div>
        {/* Верхняя строка: Бейдж системы, статус и кнопка прямой ссылки */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${getSystemBadgeColor(game.system)}`}>
              {game.system}
            </span>

            {/* Статус записи */}
            {game.isPast ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-950/60 text-purple-300 border border-purple-800/40">
                Завершена
              </span>
            ) : !game.requiresBooking ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-500/40">
                Вход свободный
              </span>
            ) : game.status === 'closed' ? (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-950/60 text-red-300 border border-red-800/40">
                Запись закрыта
              </span>
            ) : freeSeats === 0 ? (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-950/70 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <span>Мест нет</span>
                {waitlistPlayers.length > 0 && <span className="tabular-nums">(+{waitlistPlayers.length} в резерве)</span>}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="tabular-nums">Осталось {freeSeats} {freeSeats === 1 ? 'место' : freeSeats < 5 ? 'места' : 'мест'}</span>
              </span>
            )}
          </div>

          {/* Кнопка "Скопировать прямую ссылку" */}
          <button
            onClick={handleCopyDirectLink}
            className="p-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/40 text-purple-300 hover:text-yellow-300 transition-colors"
            title="Скопировать ссылку на эту игру"
            aria-label="Скопировать ссылку"
          >
            {copiedLink ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Название игры */}
        <Link href={`/games/${game.id}`} className="block group/title">
          <h3 className="text-lg sm:text-xl font-bold text-white group-hover/title:text-yellow-300 transition-colors tracking-tight mb-3">
            {game.title}
          </h3>
        </Link>

        {/* Инфо-блок: Ведущий, Дата/Время, Аудитория ГУАП */}
        <div className="space-y-2 text-xs text-purple-200/90 mb-4 bg-purple-950/40 p-3 rounded-xl border border-purple-800/30">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
            <span>Ведущий: <strong className="text-white font-medium">{game.master}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#7be7ff] flex-shrink-0" />
            <span>
              <span className="tabular-nums">{game.date}</span> в <strong className="text-white font-medium tabular-nums">{game.time}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#BB10F3] flex-shrink-0" />
            <span className="truncate">{game.location}</span>
          </div>
        </div>

        {/* Описание игры */}
        <div className="mb-4">
          <p className={`text-xs text-purple-300/80 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>
            {game.description}
          </p>
          {game.description.length > 140 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[11px] text-yellow-300 hover:text-yellow-200 mt-1 flex items-center gap-0.5 font-medium transition-colors"
            >
              <span>{isExpanded ? 'Свернуть' : 'Читать полностью'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Теги */}
        {game.tags && game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {game.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/30"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        {/* Шкала мест за игровым столом */}
        {game.requiresBooking ? (
          <div className="mb-4 pt-3 border-t border-purple-900/40">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-purple-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-yellow-300" />
                <span>{game.isPast ? 'Участников:' : 'Занято мест:'}</span>
              </span>
              <span className="font-medium text-white tabular-nums">
                {mainPlayers.length} / {game.maxPlayers}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-purple-950 overflow-hidden border border-purple-800/40">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  game.isPast
                    ? 'bg-purple-600'
                    : percentFilled >= 100 
                    ? 'bg-amber-400' 
                    : 'bg-gradient-to-r from-purple-500 to-yellow-300'
                }`}
                style={{ width: `${percentFilled}%` }}
              />
            </div>

            {/* Список участников */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
              {mainPlayers.length === 0 ? (
                <span className="text-[11px] text-purple-400/70">
                  Свободно {game.maxPlayers} мест. Запись открыта.
                </span>
              ) : (
                mainPlayers.map((player) => (
                  <span
                    key={player.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-800/40 text-purple-200"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                    <span>{player.name}</span>
                  </span>
                ))
              )}

              {waitlistPlayers.length > 0 && !game.isPast && (
                <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-600/40 text-amber-300 font-medium tabular-nums">
                  +{waitlistPlayers.length} в резерве
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Открытая игротека без предварительной записи */
          <div className="mb-4 pt-3 border-t border-purple-900/40 text-xs text-purple-200/90 flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
            <span>Вход свободный. Предварительная запись не требуется.</span>
          </div>
        )}

        {/* Кнопка действия (глагол-ориентированная по better-writing) */}
        {game.isPast ? (
          <Link
            href={`/games/${game.id}`}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium bg-purple-950/60 hover:bg-purple-900/80 border border-purple-800/40 text-purple-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Смотреть итоги игры</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : !game.requiresBooking ? (
          <Link
            href={`/games/${game.id}`}
            className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-purple-900/80 hover:bg-purple-850 border border-purple-600/40 text-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>Информация об игротеке</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button
            onClick={() => onBookClick(game)}
            disabled={game.status === 'closed'}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold tracking-wide transition-all flex items-center justify-center gap-2 ${
              game.status === 'closed'
                ? 'bg-gray-800/60 text-gray-400 cursor-not-allowed border border-gray-700/40'
                : freeSeats > 0
                ? 'bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-sm hover:shadow-[0_0_15px_rgba(255,252,28,0.25)] cursor-pointer'
                : 'bg-gradient-to-r from-amber-600 to-purple-800 text-white hover:opacity-95 shadow-sm cursor-pointer'
            }`}
          >
            {game.status === 'closed' ? (
              <span>Запись закрыта</span>
            ) : freeSeats > 0 ? (
              <span>Записаться за игровой стол</span>
            ) : (
              <span>Встать в лист ожидания</span>
            )}
          </button>
        )}
      </div>

    </div>
  );
}

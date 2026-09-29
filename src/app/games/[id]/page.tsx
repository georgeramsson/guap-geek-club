/**
 * @file src/app/games/[id]/page.tsx
 * @description Страница конкретной игры/игротеки по прямой ссылке.
 * Идеально подходит для публикации в постах ВКонтакте и Telegram-канала.
 * Игрок переходит прямо на карточку нужной сессии и сразу видит свободные места.
 */

'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { BookingModal } from '@/components/BookingModal';
import { GameWithBookings } from '@/lib/types';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  Sparkles, 
  ArrowLeft, 
  Share2, 
  Check, 
  AlertCircle,
  Dices,
  PartyPopper
} from 'lucide-react';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GameDetailPage({ params }: GamePageProps) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  const [game, setGame] = useState<GameWithBookings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchGame = async () => {
    try {
      const res = await fetch(`/api/games?id=${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setGame(data.game);
      } else {
        setGame(null);
      }
    } catch (err) {
      console.error(err);
      setGame(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  const handleCopyLink = async () => {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col stars-bg">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-yellow-300 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex flex-col stars-bg">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <div className="p-8 rounded-3xl glass-panel border border-purple-800/40">
            <Dices className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-60" />
            <h1 className="font-pixy text-2xl text-white mb-2">Игра не найдена</h1>
            <p className="text-xs text-purple-300 mb-6">
              Возможно, этот анонс был удален мастером или ссылка содержит ошибку.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-accent text-[#0B0741]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Вернуться ко всем анонсам</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mainPlayers = game.bookings.filter((b) => !b.isWaitlist);
  const waitlistPlayers = game.bookings.filter((b) => b.isWaitlist);
  const freeSeats = Math.max(0, game.maxPlayers - mainPlayers.length);
  const percentFilled = game.maxPlayers > 0 
    ? Math.min(100, Math.round((mainPlayers.length / game.maxPlayers) * 100))
    : 0;

  return (
    <div className="min-h-screen flex flex-col stars-bg">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        
        {/* Кнопка назад и Поделиться */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Все анонсы клуба</span>
          </Link>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/50 text-yellow-300 transition-all"
            title="Скопировать прямую ссылку на эту игру"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Ссылка скопирована!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Поделиться ссылкой</span>
              </>
            )}
          </button>
        </div>

        {/* Главная карточка игры */}
        <div className="rounded-3xl glass-panel p-6 sm:p-10 border border-purple-500/30 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-900/80 text-yellow-300 border border-yellow-300/40">
              {game.system}
            </span>

            {game.requiresBooking ? (
              game.status === 'closed' ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950/60 text-red-300 border border-red-800/40">
                  Запись закрыта
                </span>
              ) : freeSeats === 0 ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/50">
                  Мест нет (запись в резерв)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/50">
                  Свободно {freeSeats} из {game.maxPlayers} мест
                </span>
              )
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-accent text-[#0B0741] flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,252,28,0.3)]">
                <PartyPopper className="w-3.5 h-3.5" />
                <span>Вход свободный • Без записи</span>
              </span>
            )}
          </div>

          <h1 className="font-pixy text-2xl sm:text-4xl text-white tracking-wide mb-6 leading-tight">
            {game.title}
          </h1>

          {/* Инфо-блок */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-purple-950/60 border border-purple-800/40 text-xs text-purple-200 mb-8">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-yellow-300 flex-shrink-0" />
              <div>
                <div className="text-purple-400 text-[10px]">Ведущий / Мастер:</div>
                <strong className="text-white text-sm">{game.master}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#7be7ff] flex-shrink-0" />
              <div>
                <div className="text-purple-400 text-[10px]">Дата и время:</div>
                <strong className="text-white text-sm">{game.date} в {game.time}</strong>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-[#BB10F3] flex-shrink-0" />
              <div>
                <div className="text-purple-400 text-[10px]">Аудитория:</div>
                <strong className="text-white text-sm">{game.location}</strong>
              </div>
            </div>
          </div>

          {/* Описание */}
          <div className="mb-8 space-y-3">
            <h3 className="font-pixy text-lg text-yellow-300">
              О сессии
            </h3>
            <p className="text-sm text-purple-100/90 leading-relaxed whitespace-pre-line">
              {game.description}
            </p>

            {game.tags && game.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {game.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-lg bg-purple-900/40 text-purple-300 border border-purple-700/40"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Блок свободных мест (если это игра с записью) */}
          {game.requiresBooking ? (
            <div className="p-6 rounded-2xl bg-purple-950/50 border border-purple-800/40 mb-8 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-300 flex items-center gap-1.5 font-semibold">
                  <Users className="w-4 h-4 text-yellow-300" />
                  <span>Заполнение стола:</span>
                </span>
                <span className="font-bold text-white text-sm">
                  {mainPlayers.length} / {game.maxPlayers}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-purple-950 overflow-hidden border border-purple-800/40">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentFilled >= 100 
                      ? 'bg-amber-400' 
                      : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-yellow-300'
                  }`}
                  style={{ width: `${percentFilled}%` }}
                />
              </div>

              {/* Список игроков */}
              <div>
                <div className="text-xs text-purple-300 mb-2 font-semibold">
                  Записавшиеся игроки:
                </div>
                {mainPlayers.length === 0 ? (
                  <p className="text-xs text-purple-400 italic">Пока никто не записался. Будьте первым!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {mainPlayers.map((player) => (
                      <span
                        key={player.id}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-purple-900/60 border border-purple-700/40 text-purple-200"
                      >
                        <span className="w-2 h-2 rounded-full bg-yellow-300" />
                        <span>{player.name}</span>
                      </span>
                    ))}
                    {waitlistPlayers.length > 0 && (
                      <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-600/40 text-amber-300 font-semibold">
                        +{waitlistPlayers.length} в резерве
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Кнопка записи */}
              <button
                onClick={() => setIsBookingOpen(true)}
                disabled={game.status === 'closed'}
                className={`w-full py-4 px-6 rounded-2xl text-sm sm:text-base font-bold tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 ${
                  game.status === 'closed'
                    ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                    : freeSeats > 0
                    ? 'bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-[0_0_25px_rgba(255,252,28,0.4)]'
                    : 'bg-gradient-to-r from-amber-500 to-purple-700 text-white hover:opacity-95 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                }`}
              >
                {game.status === 'closed' ? (
                  <span>Запись закрыта мастером</span>
                ) : freeSeats > 0 ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Записаться на игру (свободно {freeSeats} мест)</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-300" />
                    <span>Записаться в лист ожидания (резерв)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Блок для открытой игротеки */
            <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/80 to-[#130a38] border border-yellow-300/40 mb-8 space-y-3">
              <div className="flex items-center gap-2 text-yellow-300 font-pixy text-lg">
                <PartyPopper className="w-5 h-5" />
                <span>Это открытая игротека клуба!</span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
                Для участия в игротеке не нужно бронировать конкретное место или регистрироваться. 
                Просто приходите в указанное время в коворкинг клуба (с собой нужен студенческий билет для входа в корпус). 
                Мы поможем выбрать игру под компанию и сразу начнём!
              </p>
            </div>
          )}

        </div>
      </main>

      {/* Модальное окно записи */}
      <BookingModal
        game={game}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={fetchGame}
      />
    </div>
  );
}

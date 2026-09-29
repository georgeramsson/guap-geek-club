/**
 * @file src/components/CalendarView.tsx
 * @description Интерактивный календарь событий клуба «СОЗВЕЗДИЕ».
 * Отображает игры и игротеки по дням месяца, позволяет смотреть прошедшие партии
 * и сразу переходить к записи на будущие сессии.
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GameWithBookings } from '@/lib/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, Sparkles, PartyPopper } from 'lucide-react';

interface CalendarViewProps {
  games: GameWithBookings[];
  onBookClick: (game: GameWithBookings) => void;
}

export function CalendarView({ games, onBookClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1)); // Октябрь 2026 (по контексту)
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Расчет дней в месяце
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  // Понедельник = 0 в РФ
  const startingDayIndex = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Получить игры для конкретной даты YYYY-MM-DD
  const getGamesForDate = (dayNum: number): GameWithBookings[] => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const targetDateStr = `${year}-${formattedMonth}-${formattedDay}`;

    return games.filter((g) => g.date === targetDateStr);
  };

  // Игры выбранного дня
  const activeSelectedGames = selectedDay
    ? games.filter((g) => g.date === selectedDay)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Навигация по месяцам */}
      <div className="flex items-center justify-between p-4 rounded-2xl glass-panel border border-purple-800/40">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-yellow-300" />
          <h2 className="font-pixy text-xl text-white">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800/40 text-purple-300 hover:text-white transition-colors"
            title="Предыдущий месяц"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-purple-950/60 hover:bg-purple-900 border border-purple-800/40 text-purple-300 hover:text-white transition-colors"
            title="Следующий месяц"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Сетка календаря */}
      <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-purple-800/40 overflow-hidden">
        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-purple-300/80">
          {daysOfWeek.map((day, i) => (
            <div key={day} className={`py-1.5 ${i >= 5 ? 'text-yellow-400/80' : ''}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Ячейки дней */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Пустые ячейки до первого дня */}
          {Array.from({ length: startingDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 sm:h-28 rounded-xl bg-purple-950/10 border border-transparent" />
          ))}

          {/* Дни текущего месяца */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedDay = String(dayNum).padStart(2, '0');
            const dayDateStr = `${year}-${formattedMonth}-${formattedDay}`;

            const dayGames = getGamesForDate(dayNum);
            const hasGames = dayGames.length > 0;
            const isSelected = selectedDay === dayDateStr;

            return (
              <div
                key={dayDateStr}
                onClick={() => {
                  if (hasGames) {
                    setSelectedDay(isSelected ? null : dayDateStr);
                  }
                }}
                className={`min-h-[80px] sm:min-h-[110px] p-1.5 sm:p-2 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-purple-900/80 border-yellow-300 shadow-[0_0_15px_rgba(255,252,28,0.3)] ring-1 ring-yellow-300'
                    : hasGames
                    ? 'bg-purple-950/50 border-purple-700/50 hover:border-yellow-400/50 hover:bg-purple-900/40 cursor-pointer'
                    : 'bg-purple-950/20 border-purple-900/20 text-purple-400/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold font-mono ${hasGames ? 'text-white' : 'text-purple-400/50'}`}>
                    {dayNum}
                  </span>

                  {hasGames && (
                    <span className="w-2 h-2 rounded-full bg-yellow-300 shadow-[0_0_6px_#FFFC1C]" />
                  )}
                </div>

                {/* Бейджи событий в ячейке */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayGames.slice(0, 2).map((g) => (
                    <div
                      key={g.id}
                      className={`text-[9px] sm:text-[10px] truncate px-1.5 py-0.5 rounded font-medium ${
                        g.isPast
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                          : g.eventType === 'open_boardgame'
                          ? 'bg-amber-900/80 text-amber-200 border border-amber-600/50'
                          : 'bg-indigo-900/80 text-yellow-200 border border-yellow-400/30'
                      }`}
                      title={`${g.time} - ${g.title} (${g.system})`}
                    >
                      {g.eventType === 'open_boardgame' ? '🎲 ' : ''}{g.system}: {g.title}
                    </div>
                  ))}

                  {dayGames.length > 2 && (
                    <div className="text-[9px] text-purple-300 text-center">
                      +{dayGames.length - 2} еще
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Список событий для выбранного дня */}
      {selectedDay && (
        <div className="p-6 rounded-3xl glass-panel border border-yellow-300/40 animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-pixy text-lg text-yellow-300 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span>События на {selectedDay}:</span>
            </h3>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-purple-300 hover:text-white"
            >
              Скрыть
            </button>
          </div>

          <div className="space-y-3">
            {activeSelectedGames.map((game) => (
              <div
                key={game.id}
                className="p-4 rounded-2xl bg-purple-950/70 border border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900 text-yellow-300">
                      {game.system}
                    </span>
                    <span className="text-xs text-purple-300">
                      🕒 {game.time}
                    </span>
                    <span className="text-xs text-purple-300">
                      📍 {game.location}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">
                    {game.title}
                  </h4>
                  <p className="text-xs text-purple-300/80 mt-1">
                    Ведущий: {game.master}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href={`/games/${game.id}`}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-900/60 border border-purple-700 text-purple-200 hover:text-white"
                  >
                    Подробнее
                  </Link>

                  {game.requiresBooking && !game.isPast && (
                    <button
                      onClick={() => onBookClick(game)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-md"
                    >
                      Записаться
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

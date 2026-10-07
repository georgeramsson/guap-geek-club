/**
 * @file src/app/archive/page.tsx
 * @description Публичная страница архива завершённых партий и мероприятий клуба «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Предоставляет игрокам и мастерам клуба хронику всех сыгранных сессий:
 * - Ролевые ваншоты и завершённые акты кампаний;
 * - Прошедшие игротеки и турниры;
 * - Списки участников и мастеров, оставивших след в летописи клуба.
 * 
 * Принцип работы:
 * - Загружает партии через /api/games;
 * - Фильтрует только прошедшие (isPast === true) или архивные (status === 'archived');
 * - Сортирует в обратном хронологическом порядке (самые свежие из завершённых — первыми);
 * - Поддерживает фильтрацию по игровым системам (D&D, WFRP, Вампиры, Pathfinder, Игротека) и полнотекстовый поиск.
 * 
 * Запуск:
 * Рендерится Next.js по маршруту /archive (клиентский компонент 'use client').
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { BookingModal } from '@/components/BookingModal';
import { GameWithBookings } from '@/lib/types';
import { 
  Archive, 
  Search, 
  RefreshCw, 
  RotateCcw, 
  ArrowLeft,
  Dices,
  BookOpen,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function ArchivePage() {
  const [games, setGames] = useState<GameWithBookings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGameForBooking, setSelectedGameForBooking] = useState<GameWithBookings | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (data.games) {
        setGames(data.games);
      }
    } catch (err) {
      console.error('Ошибка загрузки архива игр:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 45000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Фильтрация и сортировка исключительно прошедших и архивных партий
  const pastGames = games
    .filter((g) => g.isPast || g.status === 'archived')
    .sort((a, b) => {
      const getSortDate = (g: GameWithBookings) => {
        if (g.dates && g.dates.length > 0) {
          const sorted = [...g.dates].sort();
          return sorted[sorted.length - 1];
        }
        return g.date;
      };
      const timeA = (a.time?.match(/\d{1,2}:\d{2}/)?.[0] || '00:00').padStart(5, '0');
      const timeB = (b.time?.match(/\d{1,2}:\d{2}/)?.[0] || '00:00').padStart(5, '0');
      return new Date(`${getSortDate(b)}T${timeB}`).getTime() - new Date(`${getSortDate(a)}T${timeA}`).getTime();
    });

  const filteredGames = pastGames.filter((game) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      game.title.toLowerCase().includes(q) ||
      game.system.toLowerCase().includes(q) ||
      game.master.toLowerCase().includes(q) ||
      game.location.toLowerCase().includes(q) ||
      (game.customEventType && game.customEventType.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'campaign') return game.eventType === 'campaign';
    if (activeFilter === 'dnd') return game.system.toLowerCase().includes('d&d') || game.system.toLowerCase().includes('dnd');
    if (activeFilter === 'wfrp') return game.system.toLowerCase().includes('wfrp') || game.system.toLowerCase().includes('warhammer') || game.system.toLowerCase().includes('вархаммер');
    if (activeFilter === 'vampire') return game.system.toLowerCase().includes('вампир') || game.system.toLowerCase().includes('маскарад') || game.system.toLowerCase().includes('vampire');
    if (activeFilter === 'pathfinder') return game.system.toLowerCase().includes('pathfinder') || game.system.toLowerCase().includes('пасфайндер');
    if (activeFilter === 'boardgames') return game.eventType === 'open_boardgame' || game.system.toLowerCase().includes('игротек') || game.system.toLowerCase().includes('настол');
    if (activeFilter === 'other') return game.eventType === 'other';

    return true;
  });

  // Расчет метрик архива
  const totalCompletedGames = pastGames.length;
  const totalPlayersParticipated = pastGames.reduce((acc, g) => acc + g.playersCount, 0);
  const totalUniqueMasters = new Set(pastGames.map((g) => g.master)).size;

  return (
    <div className="min-h-screen flex flex-col stars-bg">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Кнопка быстрого возврата к витрине предстоящих игр */}
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-purple-300 hover:text-white bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Вернуться к актуальным анонсам</span>
          </Link>
        </div>

        {/* Hero-баннер архива */}
        <section className="relative rounded-2xl p-6 sm:p-10 mb-8 overflow-hidden glass-panel border border-purple-500/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/40 text-xs font-medium text-purple-200 mb-4">
                <Archive className="w-3.5 h-3.5 text-yellow-300" />
                <span className="font-semibold text-yellow-300">Летопись клуба</span>
                <span className="w-1 h-1 rounded-full bg-purple-400" />
                <span>Завершённые сессии</span>
              </div>

              <h1 className="font-pixy text-3xl sm:text-5xl text-white tracking-wide mb-3 leading-tight">
                АРХИВ <span className="text-gradient-accent">ПАРТИЙ</span>
              </h1>

              <p className="text-sm sm:text-base text-purple-200/85 leading-relaxed mb-6 max-w-xl">
                Хроника проведённых ролевых и настольных игр клуба «СОЗВЕЗДИЕ».
                Здесь собраны все завершённые приключения, отважные сыщики, герои Подземья и участники больших открытых игротек ГУАП.
              </p>

              {/* Метрики архива */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-md mx-auto md:mx-0">
                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-300 font-pixy tabular-nums">
                    {totalCompletedGames}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Сыграно партий</div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-pixy tabular-nums">
                    {totalPlayersParticipated}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Участников игр</div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-200 font-pixy tabular-nums">
                    {totalUniqueMasters}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Мастеров клуба</div>
                </div>
              </div>

            </div>

            {/* Фирменный логотип клуба */}
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex-shrink-0 transition-transform duration-300 hover:scale-[1.03]">
              <Image
                src="/logo-stars.png"
                alt="Эмблема клуба Созвездие ГУАП"
                fill
                sizes="(max-width: 640px) 176px, 224px"
                className="object-contain drop-shadow-[0_0_20px_rgba(187,16,243,0.35)]"
                priority
              />
            </div>
          </div>
        </section>

        {/* Панель фильтров и поиска */}
        <section className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            
            {/* Вкладки форматов и систем */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'all', label: 'Все завершённые' },
                { id: 'campaign', label: '🗺️ Кампании' },
                { id: 'dnd', label: 'D&D 5e' },
                { id: 'wfrp', label: 'WFRP 4e' },
                { id: 'vampire', label: 'Вампиры' },
                { id: 'pathfinder', label: 'Pathfinder' },
                { id: 'boardgames', label: 'Игротека' },
                { id: 'other', label: 'Прочее' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-purple-800 text-yellow-300 border border-yellow-300/50 shadow-sm'
                      : 'bg-purple-950/50 text-purple-300 hover:text-white border border-purple-800/30 hover:bg-purple-900/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Поле поиска */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Поиск по названию или мастеру..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-purple-950/60 border border-purple-800/40 text-xs text-white placeholder-purple-400/60 focus:outline-none focus:border-yellow-300 transition-colors"
                />
              </div>

              {/* Быстрое обновление */}
              <button
                onClick={fetchGames}
                className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors cursor-pointer"
                title="Обновить архив"
                aria-label="Обновить архив"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>
        </section>

        {/* Сетка карточек архива */}
        <section className="mb-12">
          {isLoading && pastGames.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-purple-300 font-medium">Открываем летопись клуба...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-14 px-4 rounded-2xl glass-panel border border-purple-800/40">
              <BookOpen className="w-10 h-10 text-purple-400/60 mx-auto mb-2.5" />
              <h3 className="font-pixy text-lg text-white mb-1.5">В архиве ничего не найдено</h3>
              <p className="text-xs text-purple-300 max-w-sm mx-auto mb-4">
                По выбранным параметрам в архиве нет подходящих проведённых партий.
              </p>
              <button
                onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-purple-900/80 text-yellow-300 border border-yellow-300/30 hover:bg-purple-850 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Сбросить фильтры</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onBookClick={() => {}}
                />
              ))}
            </div>
          )}
        </section>

        {/* Информационный блок о клубе */}
        <section className="rounded-2xl p-6 sm:p-8 glass-panel border border-purple-800/30 text-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-yellow-300" />
            <h2 className="font-pixy text-lg text-gradient-accent tracking-wide">
              О летописи клуба «СОЗВЕЗДИЕ»
            </h2>
          </div>
          <p className="text-xs text-purple-300/85 leading-relaxed max-w-3xl mb-4">
            Каждая проведённая партия остаётся в истории студенческого клуба ГУАП Geek Club. 
            Если вы хотите провести свою кампанию или ваншот в стенах университета — обратитесь к организаторам или подайте заявку в сообществе клуба.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-accent text-[#0B0741] hover:opacity-95 transition-opacity"
            >
              <span>Посмотреть актуальные игры</span>
            </Link>
            <a
              href="https://vk.ru/guap_geek_club"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-purple-950/70 hover:bg-purple-900/70 border border-purple-700/40 text-purple-200 hover:text-white transition-colors"
            >
              <span>Сообщество ВКонтакте</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

      </main>

      {/* Футер */}
      <footer className="border-t border-purple-900/40 py-6 bg-[#070422]/90 mt-10 text-center text-xs text-purple-400/80">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <p className="font-pixy text-xs text-gradient-accent">
            СОЗВЕЗДИЕ • ГУАП GEEK CLUB
          </p>
          <p className="text-[11px]">
            Клуб настольных и ролевых игр Санкт-Петербургского государственного университета аэрокосмического приборостроения.
          </p>
          <div className="pt-1.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-medium">
            <Link 
              href="/" 
              className="text-purple-300 hover:text-yellow-300 transition-colors"
            >
              Главная витрина
            </Link>
            <span>•</span>
            <a 
              href="https://vk.ru/guap_geek_club" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-300 hover:text-yellow-300 transition-colors"
            >
              ВКонтакте: vk.ru/guap_geek_club
            </a>
            <span>•</span>
            <a 
              href="https://t.me/guap_geek_club" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-300 hover:text-yellow-300 transition-colors"
            >
              Telegram: t.me/guap_geek_club
            </a>
          </div>
        </div>
      </footer>

      <BookingModal
        game={selectedGameForBooking}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={fetchGames}
      />
    </div>
  );
}

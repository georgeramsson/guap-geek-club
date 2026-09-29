/**
 * @file src/app/page.tsx
 * @description Главная страница клуба «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Предоставляет студентам витрину открытых игротек и партий по НРИ с живым учетом мест,
 * фильтрацией по игровым системам, поиском, переключением в интерактивный календарь и архив.
 * 
 * Принцип работы:
 * 1. Загружает список сессий через GET /api/games с фоновым поллингом раз в 30 секунд.
 * 2. Разделяет игры на актуальные и архивные, вычисляет метрики свободных мест с tabular-nums.
 * 3. Поддерживает три режима просмотра: карточки (витрина), календарь и архив сыгранных партий.
 * 4. Управляет открытием модального окна записи (BookingModal) с передачей выбранной игры.
 * 
 * Стандарты UI/UX:
 * - Соответствие design engineering (better-ui, better-typography, better-writing):
 *   концентрические скругления, оптическое выравнивание, табличные цифры, сдержанные анимации
 *   и лаконичный человечный текст без дешевого ИИ-слопа.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { CalendarView } from '@/components/CalendarView';
import { BookingModal } from '@/components/BookingModal';
import { GameWithBookings } from '@/lib/types';
import { 
  Dices, 
  Calendar as CalendarIcon, 
  Search, 
  RefreshCw, 
  HelpCircle, 
  LayoutGrid, 
  History,
  RotateCcw
} from 'lucide-react';

export default function HomePage() {
  const [games, setGames] = useState<GameWithBookings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGameForBooking, setSelectedGameForBooking] = useState<GameWithBookings | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Режим отображения: 'cards' (витрина), 'calendar' (календарь), 'archive' (прошедшие игры)
  const [viewMode, setViewMode] = useState<'cards' | 'calendar' | 'archive'>('cards');
  
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
      console.error('Ошибка загрузки игр:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  // Обработка перехода по хэшу #game-id
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined' && window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const elem = document.getElementById(targetId);
      if (elem) {
        setTimeout(() => {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [isLoading]);

  const handleOpenBooking = (game: GameWithBookings) => {
    setSelectedGameForBooking(game);
    setIsBookingOpen(true);
  };

  const handleBookingSuccess = () => {
    fetchGames();
  };

  // Разделение на актуальные и прошедшие
  const upcomingGames = games.filter((g) => !g.isPast);
  const pastGames = games.filter((g) => g.isPast);

  // Список игр для отображения в зависимости от режима
  const currentList = viewMode === 'archive' ? pastGames : upcomingGames;

  const filteredGames = currentList.filter((game) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      game.title.toLowerCase().includes(q) ||
      game.system.toLowerCase().includes(q) ||
      game.master.toLowerCase().includes(q) ||
      game.location.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeFilter === 'all') return true;
    if (activeFilter === 'dnd') return game.system.toLowerCase().includes('d&d') || game.system.toLowerCase().includes('dnd');
    if (activeFilter === 'wfrp') return game.system.toLowerCase().includes('wfrp') || game.system.toLowerCase().includes('warhammer') || game.system.toLowerCase().includes('вархаммер');
    if (activeFilter === 'vampire') return game.system.toLowerCase().includes('вампир') || game.system.toLowerCase().includes('маскарад') || game.system.toLowerCase().includes('vampire');
    if (activeFilter === 'pathfinder') return game.system.toLowerCase().includes('pathfinder') || game.system.toLowerCase().includes('пасфайндер');
    if (activeFilter === 'boardgames') return game.eventType === 'open_boardgame' || game.system.toLowerCase().includes('игротек') || game.system.toLowerCase().includes('настол');

    return true;
  });

  // Расчет ключевых метрик сезона
  const activeUpcomingCount = upcomingGames.filter((g) => g.status === 'open').length;
  const totalFreeSlots = upcomingGames.reduce((acc, g) => {
    if (!g.requiresBooking || g.status !== 'open') return acc;
    return acc + Math.max(0, g.maxPlayers - g.playersCount);
  }, 0);
  const totalRegisteredPlayers = upcomingGames.reduce((acc, g) => acc + g.playersCount, 0);

  return (
    <div className="min-h-screen flex flex-col stars-bg">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Главный Hero-баннер клуба: концентрические скругления, чистые акценты */}
        <section className="relative rounded-2xl p-6 sm:p-10 mb-8 overflow-hidden glass-panel border border-purple-500/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-700/40 text-xs font-medium text-purple-200 mb-4">
                <span className="font-semibold text-yellow-300">ГУАП Geek Club</span>
                <span className="w-1 h-1 rounded-full bg-purple-400" />
                <span>Сезон 2026</span>
              </div>

              <h1 className="font-pixy text-3xl sm:text-5xl text-white tracking-wide mb-3 leading-tight">
                КЛУБ <span className="text-gradient-accent">«СОЗВЕЗДИЕ»</span>
              </h1>

              <p className="text-sm sm:text-base text-purple-200/85 leading-relaxed mb-6 max-w-xl">
                Онлайн-запись на настольные и ролевые партии в корпусах ГУАП. 
                Выбирайте сессию, знакомьтесь с мастером и занимайте свободные места за игровым столом.
              </p>

              {/* Метрики со стабильными табличными цифрами */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-3 max-w-md mx-auto md:mx-0">
                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-300 font-pixy tabular-nums">
                    {activeUpcomingCount}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Активных игр</div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-pixy tabular-nums">
                    {totalFreeSlots}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Свободных мест</div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-950/50 border border-purple-800/30 text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-purple-200 font-pixy tabular-nums">
                    {totalRegisteredPlayers}
                  </div>
                  <div className="text-[11px] text-purple-300/80 mt-0.5">Игроков записано</div>
                </div>
              </div>

            </div>

            {/* Фирменный логотип клуба с мягким интерактивным эффектом */}
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

        {/* Панель переключения режимов */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-xl bg-purple-950/70 border border-purple-800/40">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-gradient-accent text-[#0B0741] font-semibold shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Витрина анонсов</span>
            </button>

            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-gradient-accent text-[#0B0741] font-semibold shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Календарь событий</span>
            </button>

            <button
              onClick={() => setViewMode('archive')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'archive'
                  ? 'bg-gradient-accent text-[#0B0741] font-semibold shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Архив партий ({pastGames.length})</span>
            </button>
          </div>

          {/* Быстрое обновление */}
          <button
            onClick={fetchGames}
            className="p-2 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white hover:bg-purple-900/40 transition-colors ml-auto"
            title="Обновить список игр"
            aria-label="Обновить список игр"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </section>

        {/* Если выбран режим КАЛЕНДАРЬ */}
        {viewMode === 'calendar' ? (
          <section className="mb-12">
            <CalendarView games={games} onBookClick={handleOpenBooking} />
          </section>
        ) : (
          /* Режим СПИСКА (Витрина или Архив) */
          <>
            {/* Панель фильтров и поиска */}
            <section className="mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                
                {/* Вкладки игровых систем */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { id: 'all', label: 'Все события' },
                    { id: 'dnd', label: 'D&D 5e' },
                    { id: 'wfrp', label: 'WFRP 4e' },
                    { id: 'vampire', label: 'Вампиры: Маскарад' },
                    { id: 'pathfinder', label: 'Pathfinder 2e' },
                    { id: 'boardgames', label: 'Игротека' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeFilter === tab.id
                          ? 'bg-purple-800 text-yellow-300 border border-yellow-300/50 shadow-sm'
                          : 'bg-purple-950/50 text-purple-300 hover:text-white border border-purple-800/30 hover:bg-purple-900/30'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

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

              </div>
            </section>

            {/* Информационная плашка архива */}
            {viewMode === 'archive' && (
              <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/30 mb-6 text-xs text-purple-300 flex items-center gap-2">
                <History className="w-4 h-4 text-yellow-300 flex-shrink-0" />
                <span>Летопись клуба: завершенные кампании, ваншоты и турниры прошлых недель.</span>
              </div>
            )}

            {/* Сетка карточек */}
            <section className="mb-12">
              {isLoading && games.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-8 h-8 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-purple-300 font-medium">Загружаем список событий...</p>
                </div>
              ) : filteredGames.length === 0 ? (
                <div className="text-center py-14 px-4 rounded-2xl glass-panel border border-purple-800/40">
                  <Dices className="w-10 h-10 text-purple-400/60 mx-auto mb-2.5" />
                  <h3 className="font-pixy text-lg text-white mb-1.5">Ничего не найдено</h3>
                  <p className="text-xs text-purple-300 max-w-sm mx-auto mb-4">
                    По выбранным параметрам нет подходящих игр.
                  </p>
                  <button
                    onClick={() => { setActiveFilter('all'); setSearchQuery(''); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-purple-900/80 text-yellow-300 border border-yellow-300/30 hover:bg-purple-850 transition-colors"
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
                      onBookClick={handleOpenBooking}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Памятка для новичка: структурированная информация без лишней воды */}
        <section className="rounded-2xl p-6 sm:p-8 glass-panel border border-purple-800/30 text-purple-200">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-yellow-300" />
            <h2 className="font-pixy text-lg text-gradient-accent tracking-wide">
              Памятка для участников
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs leading-relaxed">
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-900/30">
              <h3 className="font-bold text-white mb-1 flex items-center gap-1.5 text-sm">
                <span>🎲</span>
                <span>Если вы новичок в НРИ</span>
              </h3>
              <p className="text-purple-300/80">
                Большинство ваншотов адаптированы для новичков. Мастер объяснит базовые правила перед стартом, а лист персонажа вам предоставят на месте.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-900/30">
              <h3 className="font-bold text-white mb-1 flex items-center gap-1.5 text-sm">
                <span>🎒</span>
                <span>Что нужно взять с собой</span>
              </h3>
              <p className="text-purple-300/80">
                Студенческий билет для прохода в корпус ГУАП. Дайсы, карандаши и поля есть в клубе, но свои кубики всегда приветствуются.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-900/30">
              <h3 className="font-bold text-white mb-1 flex items-center gap-1.5 text-sm">
                <span>⏳</span>
                <span>Если планы изменились</span>
              </h3>
              <p className="text-purple-300/80">
                Отмените запись через форму на сайте или предупредите ведущего заранее — освободившееся место автоматически перейдет игроку из резерва.
              </p>
            </div>
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
          <div className="pt-1.5 flex justify-center gap-3 text-[11px] font-medium">
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
              href="https://guap.ru" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-purple-300 hover:text-yellow-300 transition-colors"
            >
              Официальный сайт ГУАП
            </a>
          </div>
        </div>
      </footer>

      {/* Модальное окно записи */}
      <BookingModal
        game={selectedGameForBooking}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}

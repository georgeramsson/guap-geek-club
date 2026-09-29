/**
 * @file src/app/admin/page.tsx
 * @description Панель управления для мастеров и администраторов клуба «СОЗВЕЗДИЕ».
 * Поддерживает создание как НРИ-сессий с записью на места,
 * так и открытых игротек без записи со свободным входом.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CopyAnnouncementModal } from '@/components/CopyAnnouncementModal';
import { GameWithBookings, CreateGameInput } from '@/lib/types';
import { 
  PlusCircle, 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Share2, 
  ExternalLink, 
  Users, 
  Calendar, 
  MapPin, 
  CheckCircle, 
  XCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  PartyPopper,
  Link as LinkIcon
} from 'lucide-react';

const ADMIN_PIN_CODE = 'geek2026';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [games, setGames] = useState<GameWithBookings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGameForCopy, setSelectedGameForCopy] = useState<GameWithBookings | null>(null);

  const [newGame, setNewGame] = useState<CreateGameInput>({
    title: '',
    system: 'D&D 5e',
    master: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: 'Большая Морская 67, ауд. 13-04',
    maxPlayers: 5,
    description: '',
    tags: ['Ваншот', 'Для новичков'],
    requiresBooking: true,
  });

  const [tagInput, setTagInput] = useState('Ваншот, Для новичков');

  useEffect(() => {
    const saved = sessionStorage.getItem('geek_admin_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN_CODE || pinInput.trim() === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('geek_admin_auth', 'true');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch('/api/games');
      const data = await res.json();
      if (data.games) {
        setGames(data.games);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchGames();
    }
  }, [isAuthenticated, fetchGames]);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tagsArray = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGame,
          tags: tagsArray,
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        setNewGame({
          title: '',
          system: 'D&D 5e',
          master: '',
          date: new Date().toISOString().split('T')[0],
          time: '18:00',
          location: 'Большая Морская 67, ауд. 13-04',
          maxPlayers: 5,
          description: '',
          tags: ['Ваншот', 'Для новичков'],
          requiresBooking: true,
        });
        fetchGames();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (game: GameWithBookings) => {
    const nextStatus = game.status === 'open' ? 'closed' : 'open';
    try {
      await fetch('/api/games', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: game.id, status: nextStatus }),
      });
      fetchGames();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот анонс игры и все записи?')) return;
    try {
      await fetch(`/api/games?id=${gameId}`, { method: 'DELETE' });
      fetchGames();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelBooking = async (bookingId: string, playerName: string) => {
    if (!confirm(`Снять участника «${playerName}» с игры? (Если есть лист ожидания, первый человек автоматически перейдет в основу)`)) {
      return;
    }

    try {
      await fetch(`/api/bookings?id=${bookingId}`, { method: 'DELETE' });
      fetchGames();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col stars-bg">
        <Header />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-3xl glass-panel border border-purple-500/40 text-center text-white shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-purple-900/60 border border-yellow-300/40 flex items-center justify-center mx-auto mb-4 text-yellow-300 shadow-[0_0_20px_rgba(255,252,28,0.25)]">
              <Lock className="w-8 h-8" />
            </div>

            <h1 className="font-pixy text-2xl text-gradient-accent mb-2">
              Вход для мастеров
            </h1>
            <p className="text-xs text-purple-300 mb-6 leading-relaxed">
              Введите пин-код доступа организатора клуба (по умолчанию: <code>geek2026</code>)
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Пин-код"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-lg px-4 py-3 rounded-xl bg-purple-950/80 border border-purple-700 text-white placeholder-purple-400 focus:outline-none focus:border-yellow-300"
              />

              {pinError && (
                <p className="text-xs text-red-400">
                  Неверный пин-код доступа
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-accent text-[#0B0741] hover:opacity-90 transition-all shadow-lg"
              >
                Войти в панель
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-white pt-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Вернуться на главную</span>
              </Link>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col stars-bg">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Заголовок панели */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-purple-900/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-yellow-300" />
              <h1 className="font-pixy text-2xl sm:text-3xl text-gradient-accent">
                Панель мастера клуба
              </h1>
            </div>
            <p className="text-xs text-purple-300">
              Управление играми, открытыми игротеками и составами игроков
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white transition-colors"
            >
              На сайт
            </Link>

            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isFormOpen ? 'Закрыть форму' : 'Создать игру / игротеку'}</span>
            </button>
          </div>
        </div>

        {/* Форма создания новой игры */}
        {isFormOpen && (
          <section className="mb-10 p-6 sm:p-8 rounded-3xl glass-panel border border-yellow-300/40 animate-in fade-in duration-200 shadow-2xl">
            <h2 className="font-pixy text-xl text-yellow-300 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Создание анонса</span>
            </h2>

            <form onSubmit={handleCreateGame} className="space-y-5">
              
              {/* Переключатель формата: НРИ с записью или открытая игротека */}
              <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700/60 space-y-2">
                <label className="block text-xs font-bold text-yellow-300">
                  Формат мероприятия:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewGame({ ...newGame, requiresBooking: true, system: 'D&D 5e', maxPlayers: 5 })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      newGame.requiresBooking
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-[0_0_12px_rgba(255,252,28,0.2)]'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5">🎲 НРИ с записью на места</div>
                    <div className="text-[11px] text-purple-300/80">Ограниченное число мест, участники бронируют слоты.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewGame({ ...newGame, requiresBooking: false, system: 'Открытая игротека', maxPlayers: 0 })}
                    className={`p-3 rounded-xl border text-left text-xs transition-all ${
                      !newGame.requiresBooking
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-[0_0_12px_rgba(255,252,28,0.2)]'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5 text-yellow-300 flex items-center gap-1">
                      <PartyPopper className="w-3.5 h-3.5" />
                      <span>Открытая игротека (без записи)</span>
                    </div>
                    <div className="text-[11px] text-purple-300/80">Свободный вход для всех желающих, правила объясняются на месте.</div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Название */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Название сессии / игротеки *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newGame.requiresBooking ? "например, Проклятие Страда: Врата замка" : "например, Большая игротека ГУАП: Мафия и Дюна"}
                    value={newGame.title}
                    onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Система */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Игровая система *
                  </label>
                  <div className="flex gap-2 mb-1.5 flex-wrap">
                    {['D&D 5e', 'WFRP 4e', 'Вампиры: Маскарад', 'Pathfinder 2e', 'Игротека'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewGame({ ...newGame, system: s })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                          newGame.system === s
                            ? 'bg-yellow-400/20 text-yellow-300 border-yellow-300'
                            : 'bg-purple-900/40 text-purple-300 border-purple-700/50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    value={newGame.system}
                    onChange={(e) => setNewGame({ ...newGame, system: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Мастер / Ведущие */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Ведущий / Организаторы *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, Алексей Смирнов или Волонтеры клуба"
                    value={newGame.master}
                    onChange={(e) => setNewGame({ ...newGame, master: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Мест за столом (только если есть бронирование) */}
                {newGame.requiresBooking ? (
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Количество мест за столом *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={newGame.maxPlayers}
                      onChange={(e) => setNewGame({ ...newGame, maxPlayers: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Лимит мест
                    </label>
                    <div className="px-3.5 py-2 rounded-xl bg-purple-950/40 border border-purple-800/40 text-purple-300 text-xs">
                      Без ограничений (свободный вход)
                    </div>
                  </div>
                )}

                {/* Дата и время */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Дата проведения *
                  </label>
                  <input
                    type="date"
                    required
                    value={newGame.date}
                    onChange={(e) => setNewGame({ ...newGame, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Время *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, 18:00 или 16:00 - 21:00"
                    value={newGame.time}
                    onChange={(e) => setNewGame({ ...newGame, time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Место */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Место / аудитория проведения *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, Большая Морская 67, ауд. 13-04 или Гастелло 15"
                    value={newGame.location}
                    onChange={(e) => setNewGame({ ...newGame, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Теги */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Теги (через запятую)
                  </label>
                  <input
                    type="text"
                    placeholder="Ваншот, Для новичков, 18+, Свободный вход"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Описание */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Описание *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Краткий синопсис, правила, что приносить с собой..."
                    value={newGame.description}
                    onChange={(e) => setNewGame({ ...newGame, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none leading-relaxed"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-white"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-lg"
                >
                  {isSubmitting ? 'Публикация...' : 'Опубликовать анонс'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Список текущих игр */}
        <section className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-purple-300 font-pixy">
              Загружаем игры...
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12 glass-panel rounded-2xl p-6 text-purple-300 text-xs">
              Анонсов пока нет.
            </div>
          ) : (
            games.map((game) => {
              const mainRoster = game.bookings.filter((b) => !b.isWaitlist);
              const waitlistRoster = game.bookings.filter((b) => b.isWaitlist);

              return (
                <div 
                  key={game.id} 
                  className="rounded-3xl glass-panel p-6 border border-purple-800/40 text-white space-y-5"
                >
                  {/* Верхняя часть карточки игры */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-900/80 text-yellow-300 border border-yellow-300/30">
                          {game.system}
                        </span>

                        {!game.requiresBooking ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-accent text-[#0B0741]">
                            🎉 Свободный вход (без записи)
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            game.status === 'open'
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-950/60 text-red-300 border-red-500/40'
                          }`}>
                            {game.status === 'open' ? '🟢 Набор открыт' : '🔴 Набор закрыт'}
                          </span>
                        )}

                        {game.isPast && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-950 text-purple-400 border border-purple-800">
                            Прошедшая
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {game.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-purple-300 mt-2">
                        <span>🧙 {game.master}</span>
                        <span>📅 {game.date} в {game.time}</span>
                        <span>📍 {game.location}</span>
                        {game.requiresBooking && <span>👥 Мест: {mainRoster.length} / {game.maxPlayers}</span>}
                      </div>
                    </div>

                    {/* Кнопки действий над игрой */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Ссылка на карточку */}
                      <Link
                        href={`/games/${game.id}`}
                        target="_blank"
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-950/60 border border-purple-700/50 hover:bg-purple-900 text-purple-200 transition-colors"
                        title="Открыть страницу игры"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Открыть</span>
                      </Link>

                      {/* Копировать пост для ВК/ТГ с прямой ссылкой */}
                      <button
                        onClick={() => setSelectedGameForCopy(game)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-900/60 border border-purple-600/40 hover:bg-purple-800 text-yellow-300 transition-colors"
                        title="Скопировать готовый текст с прямой ссылкой для ВК и Telegram"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Текст для ВК/ТГ</span>
                      </button>

                      {/* Закрыть / Открыть набор (только для НРИ) */}
                      {game.requiresBooking && (
                        <button
                          onClick={() => handleToggleStatus(game)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                            game.status === 'open'
                              ? 'bg-amber-950/60 border-amber-600/40 text-amber-200 hover:bg-amber-900/60'
                              : 'bg-emerald-950/60 border-emerald-600/40 text-emerald-200 hover:bg-emerald-900/60'
                          }`}
                        >
                          {game.status === 'open' ? (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Закрыть</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Открыть</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Удалить игру */}
                      <button
                        onClick={() => handleDeleteGame(game.id)}
                        className="p-2 rounded-xl text-xs bg-red-950/40 border border-red-800/40 text-red-300 hover:bg-red-900/60 transition-colors"
                        title="Удалить анонс"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Список участников (если игра с бронированием) */}
                  {game.requiresBooking ? (
                    <div>
                      <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-yellow-300" />
                          <span>Список записавшихся студентов:</span>
                        </span>
                        <span className="text-[11px] text-purple-400 lowercase font-normal">
                          ({mainRoster.length} в основе, {waitlistRoster.length} в резерве)
                        </span>
                      </h4>

                      {game.bookings.length === 0 ? (
                        <p className="text-xs text-purple-400 italic py-2">
                          Пока никто не записался.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {game.bookings.map((booking, idx) => (
                            <div
                              key={booking.id}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border text-xs ${
                                booking.isWaitlist
                                  ? 'bg-amber-950/20 border-amber-700/30 text-amber-200'
                                  : 'bg-purple-950/40 border-purple-800/40 text-purple-100'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-5 text-center font-mono text-purple-400">
                                  {idx + 1}.
                                </span>

                                <div>
                                  <div className="flex items-center gap-2">
                                    <strong className="text-white text-sm">
                                      {booking.name}
                                    </strong>

                                    {booking.isWaitlist ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 border border-amber-500/50 text-amber-300">
                                        Резерв
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                                        Основной состав
                                      </span>
                                    )}
                                  </div>

                                  {booking.comment && (
                                    <p className="text-[11px] text-purple-300/80 mt-0.5 italic">
                                      {booking.comment}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Контакт и кнопка снять */}
                              <div className="flex items-center gap-3 self-end sm:self-center">
                                <a
                                  href={
                                    booking.contact.startsWith('http')
                                      ? booking.contact
                                      : booking.contact.startsWith('@')
                                      ? `https://t.me/${booking.contact.slice(1)}`
                                      : `https://${booking.contact}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-yellow-300 border border-purple-700/50 transition-colors font-medium"
                                >
                                  <span>{booking.contact}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <button
                                  onClick={() => handleCancelBooking(booking.id, booking.name)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 transition-colors"
                                  title="Снять с игры"
                                >
                                  Снять
                                </button>
                              </div>

                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-purple-300/80 bg-purple-950/40 p-3 rounded-xl border border-purple-800/30 flex items-center gap-2">
                      <PartyPopper className="w-4 h-4 text-yellow-300" />
                      <span>Открытая игротека: вход свободный без бронирования мест. Все желающие приходят в указанную аудиторию.</span>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </section>

      </main>

      <CopyAnnouncementModal
        game={selectedGameForCopy}
        isOpen={Boolean(selectedGameForCopy)}
        onClose={() => setSelectedGameForCopy(null)}
      />
    </div>
  );
}

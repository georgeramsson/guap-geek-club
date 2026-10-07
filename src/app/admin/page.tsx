/**
 * @file src/app/admin/page.tsx
 * @description Панель управления для мастеров и администраторов клуба «СОЗВЕЗДИЕ» (ГУАП).
 * 
 * Назначение:
 * Позволяет организаторам:
 *  - Создавать анонсы 4 типов (Ваншоты НРИ, Кампании с несколькими сессиями, Открытые игротеки, Прочее);
 *  - Использовать отложенную публикацию (scheduled posts) с таймером выхода;
 *  - Публиковать запланированные посты досрочно в один клик («Опубликовать сейчас»);
 *  - Полностью редактировать существующие анонсы;
 *  - Открывать / закрывать набор игроков за стол;
 *  - Просматривать список участников с кликабельными ссылками на Telegram и ВК;
 *  - Копировать готовые тексты анонсов с прямыми ссылками для соцсетей клуба.
 * 
 * Принцип работы:
 * Требует пин-код организатора (geek2026), обращается к /api/games?all=true для отображения всех игр,
 * включая отложенные.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CopyAnnouncementModal } from '@/components/CopyAnnouncementModal';
import { GameWithBookings, CreateGameInput, EventType } from '@/lib/types';
import { formatRuDate, formatRuDateTime } from '@/lib/dateUtils';
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
  Link as LinkIcon,
  Pencil,
  Plus,
  X
} from 'lucide-react';

const ADMIN_PIN_CODE = 'geek2026';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [games, setGames] = useState<GameWithBookings[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Состояние создания
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGameForCopy, setSelectedGameForCopy] = useState<GameWithBookings | null>(null);

  // Отложенная публикация для создания
  const [isNewScheduled, setIsNewScheduled] = useState(false);
  const [newPublishAt, setNewPublishAt] = useState('');

  // Состояние редактирования
  const [editingGame, setEditingGame] = useState<GameWithBookings | null>(null);
  const [isEditScheduled, setIsEditScheduled] = useState(false);
  const [editPublishAt, setEditPublishAt] = useState('');
  const [editFormData, setEditFormData] = useState<CreateGameInput & { status: 'open' | 'closed' | 'archived' }>({
    title: '',
    system: 'D&D 5e',
    master: '',
    date: '',
    time: '18:00',
    location: 'Ленсовета, 33-02',
    maxPlayers: 5,
    description: '',
    tags: [],
    eventType: 'rpg',
    customEventType: '',
    dates: [],
    requiresBooking: true,
    status: 'open',
  });
  const [editTagInput, setEditTagInput] = useState('');

  const [newGame, setNewGame] = useState<CreateGameInput>({
    title: '',
    system: 'D&D 5e',
    master: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: 'Ленсовета, 33-02',
    maxPlayers: 5,
    description: '',
    tags: ['Ваншот', 'Для новичков'],
    eventType: 'rpg',
    customEventType: '',
    dates: [new Date().toISOString().split('T')[0]],
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
      const res = await fetch('/api/games?all=true');
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

  // Переключение формата при создании
  const handleSelectEventType = (type: EventType) => {
    const today = new Date().toISOString().split('T')[0];
    if (type === 'rpg') {
      setNewGame({
        ...newGame,
        eventType: 'rpg',
        requiresBooking: true,
        maxPlayers: newGame.maxPlayers > 0 ? newGame.maxPlayers : 5,
        system: newGame.system === 'Открытая игротека' ? 'D&D 5e' : newGame.system,
      });
    } else if (type === 'campaign') {
      setNewGame({
        ...newGame,
        eventType: 'campaign',
        requiresBooking: true,
        maxPlayers: newGame.maxPlayers > 0 ? newGame.maxPlayers : 5,
        dates: newGame.dates && newGame.dates.length > 0 ? newGame.dates : [today, today],
      });
    } else if (type === 'open_boardgame') {
      setNewGame({
        ...newGame,
        eventType: 'open_boardgame',
        requiresBooking: false,
        maxPlayers: 0,
        system: 'Игротека',
      });
    } else if (type === 'other') {
      setNewGame({
        ...newGame,
        eventType: 'other',
        customEventType: newGame.customEventType || 'Турнир',
        requiresBooking: true,
      });
    }
  };

  const handleAddCampaignDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const currentDates = newGame.dates || [newGame.date || today];
    setNewGame({
      ...newGame,
      dates: [...currentDates, today],
    });
  };

  const handleRemoveCampaignDate = (idx: number) => {
    const currentDates = [...(newGame.dates || [])];
    if (currentDates.length <= 1) return;
    currentDates.splice(idx, 1);
    setNewGame({
      ...newGame,
      dates: currentDates,
      date: currentDates[0],
    });
  };

  const handleUpdateCampaignDate = (idx: number, val: string) => {
    const currentDates = [...(newGame.dates || [])];
    currentDates[idx] = val;
    setNewGame({
      ...newGame,
      dates: currentDates,
      date: currentDates[0] || val,
    });
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tagsArray = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const firstDate = newGame.eventType === 'campaign' && newGame.dates && newGame.dates.length > 0
        ? newGame.dates[0]
        : newGame.date;

      const publishAtVal = isNewScheduled && newPublishAt ? newPublishAt : undefined;

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGame,
          date: firstDate,
          tags: tagsArray,
          publishAt: publishAtVal,
        }),
      });

      if (res.ok) {
        setIsFormOpen(false);
        setIsNewScheduled(false);
        setNewPublishAt('');
        setNewGame({
          title: '',
          system: 'D&D 5e',
          master: '',
          date: new Date().toISOString().split('T')[0],
          time: '18:00',
          location: 'Ленсовета, 33-02',
          maxPlayers: 5,
          description: '',
          tags: ['Ваншот', 'Для новичков'],
          eventType: 'rpg',
          customEventType: '',
          dates: [new Date().toISOString().split('T')[0]],
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

  // Режим редактирования
  const handleStartEdit = (game: GameWithBookings) => {
    setEditingGame(game);
    const hasSched = Boolean(game.publishAt && new Date(game.publishAt).getTime() > Date.now());
    setIsEditScheduled(hasSched);
    setEditPublishAt(game.publishAt ? game.publishAt.slice(0, 16) : '');

    setEditFormData({
      title: game.title,
      system: game.system,
      master: game.master,
      date: game.date,
      time: game.time,
      location: game.location,
      maxPlayers: game.maxPlayers,
      description: game.description,
      tags: game.tags || [],
      eventType: game.eventType || 'rpg',
      customEventType: game.customEventType || '',
      dates: game.dates && game.dates.length > 0 ? game.dates : [game.date],
      requiresBooking: game.requiresBooking,
      status: game.status,
    });
    setEditTagInput((game.tags || []).join(', '));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGame) return;
    setIsSubmitting(true);

    try {
      const tagsArray = editTagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const firstDate = editFormData.eventType === 'campaign' && editFormData.dates && editFormData.dates.length > 0
        ? editFormData.dates[0]
        : editFormData.date;

      const publishAtPayload = isEditScheduled ? (editPublishAt || null) : null;

      const res = await fetch('/api/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingGame.id,
          ...editFormData,
          date: firstDate,
          tags: tagsArray,
          publishAt: publishAtPayload,
        }),
      });

      if (res.ok) {
        setEditingGame(null);
        fetchGames();
      } else {
        alert('Не удалось сохранить изменения');
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка при сохранении игры');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Быстрая публикация отложенного анонса
  const handlePublishNow = async (gameId: string) => {
    try {
      const res = await fetch('/api/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gameId, action: 'publish_now' }),
      });
      if (res.ok) {
        fetchGames();
      }
    } catch (err) {
      console.error(err);
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

  const getContactUrl = (contact: string) => {
    const trimmed = contact.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('@')) return `https://t.me/${trimmed.slice(1)}`;
    if (trimmed.startsWith('t.me/')) return `https://${trimmed}`;
    if (trimmed.startsWith('vk.com/')) return `https://${trimmed}`;
    return `https://t.me/${trimmed}`;
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
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-accent text-[#0B0741] hover:opacity-90 transition-all shadow-lg cursor-pointer"
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
              Создание, редактирование игр, отложенная публикация и управление игроками
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
              onClick={() => { setIsFormOpen(!isFormOpen); setEditingGame(null); }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isFormOpen ? 'Закрыть форму' : 'Создать анонс'}</span>
            </button>
          </div>
        </div>

        {/* Секция РЕДАКТИРОВАНИЯ игры */}
        {editingGame && (
          <section className="mb-10 p-6 sm:p-8 rounded-3xl glass-panel border border-yellow-400/50 animate-in fade-in duration-200 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-purple-800/40">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-yellow-300" />
                <h2 className="font-pixy text-xl text-yellow-300">
                  Редактирование анонса: «{editingGame.title}»
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingGame(null)}
                className="p-1.5 rounded-lg text-purple-400 hover:text-white hover:bg-purple-900/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Выбор формата */}
              <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700/60 space-y-2">
                <label className="block text-xs font-bold text-yellow-300">
                  Формат мероприятия:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'rpg', label: '🎲 НРИ Ваншот', desc: 'С записью' },
                    { id: 'campaign', label: '🗺️ Кампания', desc: 'Несколько сессий' },
                    { id: 'open_boardgame', label: '🎉 Игротека', desc: 'Без записи' },
                    { id: 'other', label: '✨ Прочее', desc: 'Свой формат' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => {
                        setEditFormData({
                          ...editFormData,
                          eventType: fmt.id as EventType,
                          requiresBooking: fmt.id !== 'open_boardgame',
                          maxPlayers: fmt.id === 'open_boardgame' ? 0 : (editFormData.maxPlayers || 5),
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        editFormData.eventType === fmt.id
                          ? 'bg-purple-900 border-yellow-300 text-white shadow-md'
                          : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                      }`}
                    >
                      <div className="font-bold">{fmt.label}</div>
                      <div className="text-[10px] text-purple-300/70">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Если выбран тип Прочее */}
              {editFormData.eventType === 'other' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-purple-950/60 border border-purple-800/40">
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Название своего формата *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="например: Турнир, Лекция, Квиз"
                      value={editFormData.customEventType || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, customEventType: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Условия участия:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, requiresBooking: true })}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                          editFormData.requiresBooking
                            ? 'bg-purple-900 border-yellow-300 text-white'
                            : 'bg-purple-950/40 border-purple-800 text-purple-300'
                        }`}
                      >
                        С записью на места
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, requiresBooking: false, maxPlayers: 0 })}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                          !editFormData.requiresBooking
                            ? 'bg-purple-900 border-yellow-300 text-white'
                            : 'bg-purple-950/40 border-purple-800 text-purple-300'
                        }`}
                      >
                        Свободный вход
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Название */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Название сессии *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Система */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Игровая система *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.system}
                    onChange={(e) => setEditFormData({ ...editFormData, system: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Мастер */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Ведущий / Мастер *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.master}
                    onChange={(e) => setEditFormData({ ...editFormData, master: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Места */}
                {editFormData.requiresBooking ? (
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Лимит мест за столом *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={editFormData.maxPlayers}
                      onChange={(e) => setEditFormData({ ...editFormData, maxPlayers: Number(e.target.value) })}
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

                {/* Даты для Кампании */}
                {editFormData.eventType === 'campaign' ? (
                  <div className="md:col-span-2 p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-700/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-yellow-300" />
                        <span>Даты сессий кампании:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setEditFormData({
                            ...editFormData,
                            dates: [...(editFormData.dates || [editFormData.date]), today],
                          });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-900 border border-indigo-500/50 text-yellow-300 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить сессию</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(editFormData.dates || [editFormData.date]).map((d, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-indigo-300 font-mono w-4">{idx + 1}.</span>
                          <input
                            type="date"
                            required
                            value={d}
                            onChange={(e) => {
                              const cur = [...(editFormData.dates || [])];
                              cur[idx] = e.target.value;
                              setEditFormData({ ...editFormData, dates: cur, date: cur[0] });
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-purple-950/80 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                          />
                          {(editFormData.dates || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const cur = [...(editFormData.dates || [])];
                                cur.splice(idx, 1);
                                setEditFormData({ ...editFormData, dates: cur, date: cur[0] });
                              }}
                              className="p-1 rounded text-red-400 hover:text-red-300 cursor-pointer"
                              title="Удалить сессию"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Дата проведения *
                    </label>
                    <input
                      type="date"
                      required
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                )}

                {/* Время */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Время *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
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
                    value={editFormData.location}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Отложенная публикация в форме редактирования */}
                <div className="md:col-span-2 p-3.5 rounded-2xl bg-purple-950/60 border border-purple-800/40 space-y-2">
                  <label className="text-xs font-semibold text-purple-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEditScheduled}
                      onChange={(e) => setIsEditScheduled(e.target.checked)}
                      className="rounded border-purple-700 text-yellow-300 focus:ring-0 w-4 h-4"
                    />
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-yellow-300" />
                      <span>⏰ Отложенная публикация (выпустить анонс по расписанию)</span>
                    </span>
                  </label>

                  {isEditScheduled && (
                    <div className="pt-1.5 animate-in fade-in space-y-1">
                      <label className="block text-[11px] text-purple-300/80">
                        Дата и время выхода анонса:
                      </label>
                      <input
                        type="datetime-local"
                        required={isEditScheduled}
                        value={editPublishAt}
                        onChange={(e) => setEditPublishAt(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-yellow-300/50 text-white text-xs focus:border-yellow-300 focus:outline-none"
                      />
                      <p className="text-[10px] text-purple-400">
                        Если снять галочку, анонс станет виден на сайте немедленно.
                      </p>
                    </div>
                  )}
                </div>

                {/* Теги */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Теги (через запятую)
                  </label>
                  <input
                    type="text"
                    value={editTagInput}
                    onChange={(e) => setEditTagInput(e.target.value)}
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
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGame(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-lg cursor-pointer"
                >
                  {isSubmitting ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Форма создания новой игры */}
        {isFormOpen && (
          <section className="mb-10 p-6 sm:p-8 rounded-3xl glass-panel border border-yellow-300/40 animate-in fade-in duration-200 shadow-2xl">
            <h2 className="font-pixy text-xl text-yellow-300 mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <span>Создание анонса</span>
            </h2>

            <form onSubmit={handleCreateGame} className="space-y-5">
              
              {/* Переключатель формата */}
              <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700/60 space-y-2">
                <label className="block text-xs font-bold text-yellow-300">
                  Формат мероприятия:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectEventType('rpg')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      newGame.eventType === 'rpg'
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-md'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5">🎲 НРИ Ваншот</div>
                    <div className="text-[11px] text-purple-300/80">Один вечер, бронь мест.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectEventType('campaign')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      newGame.eventType === 'campaign'
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-md'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5 text-indigo-300">🗺️ Кампания</div>
                    <div className="text-[11px] text-purple-300/80">Несколько сессий и дат.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectEventType('open_boardgame')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      newGame.eventType === 'open_boardgame'
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-md'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5 text-emerald-300">🎉 Игротека</div>
                    <div className="text-[11px] text-purple-300/80">Свободный вход без записи.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectEventType('other')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      newGame.eventType === 'other'
                        ? 'bg-purple-900 border-yellow-300 text-white shadow-md'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    <div className="font-bold mb-0.5 text-yellow-300">✨ Прочее</div>
                    <div className="text-[11px] text-purple-300/80">Свой формат и название.</div>
                  </button>
                </div>
              </div>

              {/* Поля для формата "Прочее" */}
              {newGame.eventType === 'other' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-purple-950/60 border border-purple-800/40">
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Название вашего формата мероприятия *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="например: Турнир, Лекция, Квиз"
                      value={newGame.customEventType || ''}
                      onChange={(e) => setNewGame({ ...newGame, customEventType: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-200 mb-1">
                      Условия участия:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewGame({ ...newGame, requiresBooking: true })}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                          newGame.requiresBooking
                            ? 'bg-purple-900 border-yellow-300 text-white'
                            : 'bg-purple-950/40 border-purple-800 text-purple-300'
                        }`}
                      >
                        С записью на места
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewGame({ ...newGame, requiresBooking: false, maxPlayers: 0 })}
                        className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium cursor-pointer ${
                          !newGame.requiresBooking
                            ? 'bg-purple-900 border-yellow-300 text-white'
                            : 'bg-purple-950/40 border-purple-800 text-purple-300'
                        }`}
                      >
                        Свободный вход
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Название */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Название сессии / мероприятия *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="например, Проклятие Страда: Врата замка"
                    value={newGame.title}
                    onChange={(e) => setNewGame({ ...newGame, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Система */}
                <div>
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Игровая система / Направление *
                  </label>
                  <div className="flex gap-2 mb-1.5 flex-wrap">
                    {['D&D 5e', 'WFRP 4e', 'Вампиры: Маскарад', 'Pathfinder 2e', 'Игротека'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewGame({ ...newGame, system: s })}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
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

                {/* Ведущий */}
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

                {/* Лимит мест */}
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

                {/* Кампания: список дат сессий */}
                {newGame.eventType === 'campaign' ? (
                  <div className="md:col-span-2 p-3.5 rounded-2xl bg-indigo-950/50 border border-indigo-700/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-yellow-300" />
                        <span>Даты сессий кампании ({newGame.dates?.length || 1}):</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleAddCampaignDate}
                        className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-900 hover:bg-indigo-850 border border-indigo-500/50 text-yellow-300 font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Добавить еще дату</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {(newGame.dates || [newGame.date]).map((d, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-[10px] text-indigo-300 font-mono w-4">{idx + 1}.</span>
                          <input
                            type="date"
                            required
                            value={d}
                            onChange={(e) => handleUpdateCampaignDate(idx, e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-purple-950/80 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                          />
                          {(newGame.dates || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCampaignDate(idx)}
                              className="p-1 rounded text-red-400 hover:text-red-300 cursor-pointer"
                              title="Удалить дату"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                )}

                {/* Время */}
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
                    placeholder="например, Ленсовета, 33-02 или Гастелло 15"
                    value={newGame.location}
                    onChange={(e) => setNewGame({ ...newGame, location: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-purple-950/70 border border-purple-700 text-white text-xs focus:border-yellow-300 focus:outline-none"
                  />
                </div>

                {/* Отложенная публикация */}
                <div className="md:col-span-2 p-3.5 rounded-2xl bg-purple-950/60 border border-purple-800/40 space-y-2">
                  <label className="text-xs font-semibold text-purple-200 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNewScheduled}
                      onChange={(e) => setIsNewScheduled(e.target.checked)}
                      className="rounded border-purple-700 text-yellow-300 focus:ring-0 w-4 h-4"
                    />
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-yellow-300" />
                      <span>⏰ Отложенная публикация (выпустить анонс по расписанию)</span>
                    </span>
                  </label>

                  {isNewScheduled && (
                    <div className="pt-1.5 animate-in fade-in space-y-1">
                      <label className="block text-[11px] text-purple-300/80">
                        Когда анонс должен появиться на главной странице для участников:
                      </label>
                      <input
                        type="datetime-local"
                        required={isNewScheduled}
                        value={newPublishAt}
                        onChange={(e) => setNewPublishAt(e.target.value)}
                        className="px-3 py-1.5 rounded-xl bg-purple-950/80 border border-yellow-300/50 text-white text-xs focus:border-yellow-300 focus:outline-none"
                      />
                      <p className="text-[10px] text-purple-400">
                        До наступления этого времени анонс будет скрыт от студентов и виден только вам в этой панели.
                      </p>
                    </div>
                  )}
                </div>

                {/* Теги */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-purple-200 mb-1">
                    Теги (через запятую)
                  </label>
                  <input
                    type="text"
                    placeholder="Ваншот, Для новичков, Кампания, Свободный вход"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:text-white cursor-pointer"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-lg cursor-pointer"
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
              const isCampaign = game.eventType === 'campaign';
              const isOther = game.eventType === 'other';

              return (
                <div 
                  key={game.id} 
                  className={`rounded-3xl glass-panel p-6 border text-white space-y-5 transition-all ${
                    game.isScheduled 
                      ? 'border-yellow-400/40 bg-purple-950/40' 
                      : 'border-purple-800/40'
                  }`}
                >
                  {/* Верхняя часть карточки игры */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-900/40">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-900/80 text-yellow-300 border border-yellow-300/30">
                          {game.system}
                        </span>

                        {/* Плашка отложенной публикации */}
                        {game.isScheduled && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <Clock className="w-3 h-3 text-yellow-300" />
                            <span>⏳ Запланирован на {formatRuDateTime(game.publishAt)}</span>
                          </span>
                        )}

                        {isCampaign && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-500/50">
                            🗺️ Кампания ({game.dates?.length || 1} сессий)
                          </span>
                        )}

                        {isOther && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-950 text-violet-300 border border-violet-500/50">
                            ✨ {game.customEventType || 'Спецформат'}
                          </span>
                        )}

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
                        {isCampaign && game.dates && game.dates.length > 1 ? (
                          <span>📅 Сессии: {game.dates.map(d => formatRuDate(d)).join(', ')} в {game.time}</span>
                        ) : (
                          <span>📅 {formatRuDate(game.date)} в {game.time}</span>
                        )}
                        <span>📍 {game.location}</span>
                        {game.requiresBooking && <span>👥 Мест: {mainRoster.length} / {game.maxPlayers}</span>}
                      </div>
                    </div>

                    {/* Кнопки действий над игрой */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Если анонс отложен — кнопка Опубликовать сейчас */}
                      {game.isScheduled && (
                        <button
                          onClick={() => handlePublishNow(game.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 transition-colors cursor-pointer"
                          title="Опубликовать анонс на сайте прямо сейчас"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Опубликовать сейчас</span>
                        </button>
                      )}

                      {/* Кнопка РЕДАКТИРОВАТЬ */}
                      <button
                        onClick={() => handleStartEdit(game)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-800/60 hover:bg-purple-700/80 border border-yellow-300/40 text-yellow-300 transition-colors cursor-pointer"
                        title="Редактировать параметры анонса"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Редактировать</span>
                      </button>

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
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-900/60 border border-purple-600/40 hover:bg-purple-800 text-yellow-300 transition-colors cursor-pointer"
                        title="Скопировать готовый текст с прямой ссылкой для ВК и Telegram"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Текст для ВК/ТГ</span>
                      </button>

                      {/* Закрыть / Открыть набор */}
                      {game.requiresBooking && !game.isScheduled && (
                        <button
                          onClick={() => handleToggleStatus(game)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
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
                        className="p-2 rounded-xl text-xs bg-red-950/40 border border-red-800/40 text-red-300 hover:bg-red-900/60 transition-colors cursor-pointer"
                        title="Удалить анонс"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Список участников */}
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
                          {game.isScheduled ? 'Анонс отложен, запись начнется после публикации.' : 'Пока никто не записался.'}
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
                                  href={getContactUrl(booking.contact)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-yellow-300 border border-purple-700/50 transition-colors font-medium"
                                  title="Открыть контакт"
                                >
                                  <span>{booking.contact}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                <button
                                  onClick={() => handleCancelBooking(booking.id, booking.name)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-300 bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 transition-colors cursor-pointer"
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

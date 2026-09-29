/**
 * @file src/components/BookingModal.tsx
 * @description Интерактивное модальное окно для записи участников на игры клуба «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Предоставляет студентам удобный интерфейс для регистрации на игровые партии с валидацией контактов,
 * защитой от массовых накруток за друзей с одного устройства и прозрачным разделением на «Основной состав» и «Резерв».
 * 
 * Принцип работы:
 * 1. Проверяет наличие активной брони на эту игру в localStorage браузера (правило «одно устройство — одна запись»):
 *    - Если студент уже записался, выводится статус его записи и объяснение, почему нельзя записать всех друзей с одного телефона.
 *    - Предлагается кнопка «Скопировать ссылку для друга», чтобы друг записался со своего смартфона сам.
 *    - Предоставляется возможность отменить свою запись в один клик.
 * 2. Генерирует стабильный идентификатор устройства (x-device-id) и передает его в API для серверного rate limiting.
 * 3. Отправляет данные на /api/bookings. При успехе сохраняет факт записи в браузере и запускает анимацию конфетти.
 * 
 * Стандарты UI/UX (better-ui, better-writing, better-typography):
 * - Концентрические радиусы (modal: rounded-2xl, inputs/buttons: rounded-xl);
 * - Табличные цифры (tabular-nums);
 * - Человечный спокойный тон без ИИ-чирлидинга и восклицательных штампов;
 * - Действия на кнопках названы от глагола («Подтвердить запись», «Вернуться к расписанию»).
 */

'use client';

import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Link as LinkIcon, 
  MessageSquare, 
  Dices, 
  ShieldAlert, 
  Share2, 
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import { GameWithBookings } from '@/lib/types';

interface BookingModalProps {
  game: GameWithBookings | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface LocalBooking {
  bookingId: string;
  name: string;
  contact: string;
  createdAt: string;
}

const STORAGE_KEY = 'guap_geek_club_my_bookings';
const DEVICE_ID_KEY = 'guap_geek_club_device_id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let devId = localStorage.getItem(DEVICE_ID_KEY);
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    localStorage.setItem(DEVICE_ID_KEY, devId);
  }
  return devId;
}

function getLocalBookingForGame(gameId: string): LocalBooking | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return map[gameId] || null;
  } catch {
    return null;
  }
}

function saveLocalBooking(gameId: string, booking: LocalBooking) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[gameId] = booking;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

function removeLocalBooking(gameId: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw);
    delete map[gameId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.error(e);
  }
}

export function BookingModal({ game, isOpen, onClose, onSuccess }: BookingModalProps) {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [experience, setExperience] = useState('beginner');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isWaitlistResult, setIsWaitlistResult] = useState(false);

  // Состояние уже имеющейся записи с этого устройства
  const [existingBooking, setExistingBooking] = useState<LocalBooking | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen && game) {
      const saved = getLocalBookingForGame(game.id);
      setExistingBooking(saved);
      setIsSubmitted(false);
      setErrorMessage('');
    }
  }, [isOpen, game]);

  if (!isOpen || !game) return null;

  const isGuaranteedSeat = !game.isFull;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('Укажите ваше имя и фамилию');
      return;
    }

    if (!contact.trim()) {
      setErrorMessage('Укажите ссылку на страницу ВК или никнейм в Telegram');
      return;
    }

    setIsLoading(true);

    try {
      const expText = experience === 'beginner' 
        ? 'Новичок' 
        : experience === 'played_some' 
        ? 'Играл несколько раз' 
        : 'Опытный игрок';
      
      const fullComment = [
        `Опыт: ${expText}`,
        comment.trim() ? `Пожелания: ${comment.trim()}` : null
      ].filter(Boolean).join('. ');

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': getDeviceId(),
        },
        body: JSON.stringify({
          gameId: game.id,
          name: name.trim(),
          contact: contact.trim(),
          comment: fullComment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Не удалось оформить запись. Попробуйте еще раз.');
        setIsLoading(false);
        return;
      }

      // Сохраняем в localStorage устройства для защиты от повторных накруток
      if (data.booking?.id) {
        saveLocalBooking(game.id, {
          bookingId: data.booking.id,
          name: name.trim(),
          contact: contact.trim(),
          createdAt: new Date().toISOString(),
        });
      }

      setIsWaitlistResult(Boolean(data.isWaitlist));
      setIsSubmitted(true);
      setIsLoading(false);

      // Запуск конфетти
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#FFFC1C', '#BB10F3', '#7be7ff'],
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMessage('Ошибка соединения с сервером. Попробуйте еще раз.');
      setIsLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!existingBooking) return;
    if (!confirm('Отменить вашу запись на эту игру? Освободившееся место автоматически перейдет первому игроку из резерва.')) {
      return;
    }

    setIsCanceling(true);
    try {
      const res = await fetch(`/api/bookings?id=${existingBooking.bookingId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        removeLocalBooking(game.id);
        setExistingBooking(null);
        onSuccess();
      } else {
        alert('Не удалось отменить запись. Попробуйте обновить страницу.');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка сети при попытке отмены записи.');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleCopyGameLink = () => {
    const url = typeof window !== 'undefined' 
      ? `${window.location.origin}/games/${game.id}` 
      : `https://guap-geek-club.vercel.app/games/${game.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleModalClose = () => {
    setIsSubmitted(false);
    setName('');
    setContact('');
    setComment('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg rounded-2xl glass-panel p-6 sm:p-7 text-white border border-purple-500/25 shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Кнопка закрытия (минимальный размер 44x44px по better-accessibility) */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors"
          title="Закрыть окно"
          aria-label="Закрыть окно"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          /* Экран успешной записи */
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-gradient-accent flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8 text-[#0B0741]" />
            </div>

            <h3 className="font-pixy text-xl text-white tracking-wide">
              {isWaitlistResult ? 'ВЫ В ЛИСТЕ ОЖИДАНИЯ' : 'МЕСТО ЗА СТОЛОМ ПОДТВЕРЖДЕНО'}
            </h3>

            <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed max-w-md mx-auto">
              {isWaitlistResult ? (
                <>
                  Вы добавлены в <b>резерв</b> на партию <b>«{game.title}»</b>. Если кто-то из игроков отменит бронь, ведущий свяжется с вами в первую очередь.
                </>
              ) : (
                <>
                  Ваша заявка на игру <b>«{game.title}»</b> зафиксирована. Ведущий ({game.master}) свяжется с вами или добавит в чат партии перед игрой.
                </>
              )}
            </p>

            <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/40 text-left text-xs space-y-2 mt-4 text-purple-200">
              <div className="flex justify-between">
                <span className="text-purple-400">Дата и время:</span>
                <span className="font-medium text-white tabular-nums">{game.date} в {game.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">Место проведения:</span>
                <span className="font-medium text-white">{game.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">Ведущий:</span>
                <span className="font-medium text-yellow-300">{game.master}</span>
              </div>
            </div>

            <button
              onClick={handleModalClose}
              className="w-full mt-5 py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-accent text-[#0B0741] hover:opacity-95 shadow-sm transition-all"
            >
              Вернуться к расписанию
            </button>
          </div>
        ) : existingBooking ? (
          /* Экран: Пользователь уже записан с этого устройства */
          <div className="py-2 space-y-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-950/70 text-yellow-300 border border-purple-700/40">
                {game.system}
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-1.5">
                {game.title}
              </h2>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/50 border border-yellow-500/30 text-yellow-200/90 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-sm text-yellow-300">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Запись с этого устройства уже оформлена</span>
              </div>
              <p className="leading-relaxed">
                Вы записаны как: <strong className="text-white">{existingBooking.name}</strong> ({existingBooking.contact}).
              </p>
              <div className="pt-2 text-[11px] text-purple-300/80 border-t border-purple-800/30 leading-relaxed">
                В клубе действует правило: <strong>одно устройство — одно место</strong>, чтобы все студенты ГУАП имели равную возможность попасть на партию.
              </div>
            </div>

            {/* Блок отправки ссылки другу */}
            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-800/30 space-y-2.5 text-xs">
              <div className="font-medium text-purple-200 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-yellow-300" />
                <span>Хотите пойти вместе с другом?</span>
              </div>
              <p className="text-[11px] text-purple-300/80 leading-relaxed">
                Отправьте другу прямую ссылку на игру — он сможет записаться со своего смартфона за 15 секунд.
              </p>
              <button
                type="button"
                onClick={handleCopyGameLink}
                className="w-full py-2 px-3 rounded-lg text-xs font-medium bg-purple-900/60 hover:bg-purple-850 border border-purple-700/40 text-white flex items-center justify-center gap-2 transition-all"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Ссылка скопирована</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-yellow-300" />
                    <span>Скопировать ссылку для друга</span>
                  </>
                )}
              </button>
            </div>

            {/* Действия: Отмена записи или закрыть */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCanceling}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium text-red-300 hover:text-red-200 hover:bg-red-950/40 border border-red-800/30 flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isCanceling ? 'Отменяем запись...' : 'Отменить мою запись'}</span>
              </button>

              <button
                type="button"
                onClick={handleModalClose}
                className="w-full py-2 px-4 rounded-xl text-xs font-medium bg-purple-950/60 border border-purple-800/40 text-purple-300 hover:text-white transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : (
          /* Форма записи */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-purple-950/70 text-yellow-300 border border-purple-700/40">
                  {game.system}
                </span>
                <span className="text-xs text-purple-300">
                  Ведущий: <strong className="text-white font-medium">{game.master}</strong>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {game.title}
              </h2>
            </div>

            {/* Индикатор статуса мест */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isGuaranteedSeat 
                ? 'bg-purple-950/40 border-yellow-400/25 text-yellow-200' 
                : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-yellow-300" />
              <div className="text-xs leading-relaxed">
                {isGuaranteedSeat ? (
                  <>
                    <strong className="text-yellow-300">Основной состав:</strong> свободно{' '}
                    <b className="tabular-nums">{game.maxPlayers - game.playersCount}</b> из{' '}
                    <b className="tabular-nums">{game.maxPlayers}</b> мест. Бронь подтверждается мгновенно.
                  </>
                ) : (
                  <>
                    <strong className="text-amber-300">Лист ожидания:</strong> все {game.maxPlayers} мест заняты. Запись идет в резерв на случай отмены других игроков.
                  </>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Поле 1: Имя и Фамилия */}
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-yellow-300" />
                <span>Имя и фамилия *</span>
              </label>
              <input
                type="text"
                required
                placeholder="например, Александр Смирнов"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-700/40 text-white placeholder-purple-400/50 focus:outline-none focus:border-yellow-300 text-xs sm:text-sm transition-colors"
              />
            </div>

            {/* Поле 2: Контакт ВК / Telegram */}
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-yellow-300" />
                <span>Контакт для связи (ВК или Telegram) *</span>
              </label>
              <input
                type="text"
                required
                placeholder="https://vk.com/id... или @username"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-700/40 text-white placeholder-purple-400/50 focus:outline-none focus:border-yellow-300 text-xs sm:text-sm transition-colors"
              />
              <p className="text-[11px] text-purple-300/70 mt-1">
                Ведущий напишет вам перед игрой для подтверждения и добавления в чат стола.
              </p>
            </div>

            {/* Поле 3: Опыт в НРИ */}
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                <Dices className="w-3.5 h-3.5 text-yellow-300" />
                <span>Опыт в настольных ролевых играх</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'beginner', label: 'Новичок' },
                  { id: 'played_some', label: 'Играл пару раз' },
                  { id: 'experienced', label: 'Опытный игрок' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setExperience(item.id)}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      experience === item.id
                        ? 'bg-purple-800 text-yellow-300 border-yellow-300/60 shadow-sm'
                        : 'bg-purple-950/40 border-purple-800/40 text-purple-300 hover:border-purple-600'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Поле 4: Комментарий / пожелания */}
            <div>
              <label className="block text-xs font-medium text-purple-200 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-yellow-300" />
                <span>Комментарий или вопрос ведущему (необязательно)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Нужен ли готовый лист персонажа, есть ли свои кубики и т.д."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-700/40 text-white placeholder-purple-400/50 focus:outline-none focus:border-yellow-300 text-xs sm:text-sm transition-colors"
              />
            </div>

            {/* Кнопка отправки формы (глагол-ориентированная по better-writing) */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 ${
                isGuaranteedSeat
                  ? 'bg-gradient-accent text-[#0B0741] hover:opacity-95 cursor-pointer'
                  : 'bg-gradient-to-r from-amber-600 to-purple-800 text-white hover:opacity-95 cursor-pointer'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>
                  {isGuaranteedSeat ? 'Подтвердить запись за стол' : 'Встать в лист ожидания'}
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

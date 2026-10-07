/**
 * @file src/lib/types.ts
 * @description Расширенные типы данных для клуба «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Определяет структуры данных для:
 *  - Ролевых игр с обязательной записью (НРИ);
 *  - Открытых игротек по настолкам (свободный вход без записи);
 *  - Кампаний по НРИ (серии игр с несколькими датами);
 *  - Мероприятий свободного формата («Прочее» с произвольным названием);
 *  - Отложенной публикации анонсов (publishAt);
 *  - Записей и броней участников с прямыми контактами для ведущих (ДМов);
 *  - Календаря, архива и статусов партий.
 * 
 * Принцип работы:
 * Экспортирует интерфейсы для клиентских компонентов, API-обработчиков и сервисного слоя хранилища.
 */

export type EventType = 'rpg' | 'open_boardgame' | 'campaign' | 'other';

export interface Game {
  id: string;
  title: string;
  system: string; // e.g., 'D&D 5e', 'Зов Ктулху', 'Настольные игры', 'Игротека'
  master: string;
  date: string; // Основная дата (YYYY-MM-DD)
  time: string; // HH:MM
  location: string;
  maxPlayers: number; // Для игротек может быть 0 (без ограничений)
  description: string;
  tags: string[];
  status: 'open' | 'closed' | 'archived';
  eventType: EventType; // 'rpg' | 'open_boardgame' | 'campaign' | 'other'
  customEventType?: string; // Произвольное название для типа 'other' (например: 'Турнир', 'Лекция')
  dates?: string[]; // Список дат для кампаний (несколько сессий, e.g. ['2026-10-12', '2026-10-19'])
  requiresBooking: boolean; // true = нужна запись на места, false = свободный вход
  publishAt?: string; // ISO дата/время отложенной публикации (e.g. '2026-10-10T12:00')
  createdAt: string;
}

export interface Booking {
  id: string;
  gameId: string;
  name: string; // Имя и Фамилия
  contact: string; // Ссылка на ВК или ник @telegram
  comment?: string; // Опыт в НРИ или пожелания
  isWaitlist: boolean; // false = основа, true = резерв / лист ожидания
  createdAt: string;
}

export interface GameWithBookings extends Game {
  bookings: Booking[];
  playersCount: number;
  waitlistCount: number;
  isFull: boolean;
  isPast: boolean; // Прошла ли игра по дате
  isScheduled?: boolean; // true, если публикация отложена и еще не наступила
}

export interface CreateBookingInput {
  gameId: string;
  name: string;
  contact: string;
  comment?: string;
}

export interface CreateGameInput {
  title: string;
  system: string;
  master: string;
  date: string;
  time: string;
  location: string;
  maxPlayers: number;
  description: string;
  tags: string[];
  eventType?: EventType;
  customEventType?: string;
  dates?: string[];
  requiresBooking?: boolean;
  publishAt?: string | null;
}

export interface UpdateGameInput extends Partial<CreateGameInput> {
  status?: 'open' | 'closed' | 'archived';
  publishAt?: string | null;
}

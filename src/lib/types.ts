/**
 * @file src/lib/types.ts
 * @description Расширенные типы данных для клуба «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * Поддерживает:
 *  - Ролевые игры с обязательной записью (НРИ);
 *  - Открытые игротеки по настолкам (свободный вход без записи);
 *  - Архив и историю прошедших игр;
 *  - Прямые ссылки на конкретные сессии.
 */

export type EventType = 'rpg' | 'open_boardgame';

export interface Game {
  id: string;
  title: string;
  system: string; // e.g., 'D&D 5e', 'Зов Ктулху', 'Настольные игры', 'Игротека'
  master: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  maxPlayers: number; // Для игротек может быть 0 (без ограничений)
  description: string;
  tags: string[];
  status: 'open' | 'closed' | 'archived';
  eventType: EventType; // 'rpg' или 'open_boardgame'
  requiresBooking: boolean; // true = нужна запись на места, false = свободный вход
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
  requiresBooking?: boolean;
}

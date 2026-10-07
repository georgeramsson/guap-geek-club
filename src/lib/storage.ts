/**
 * @file src/lib/storage.ts
 * @description Сервисный слой для работы с играми и записями игроков.
 * Поддерживает:
 *  - НРИ с бронированием мест;
 *  - Открытые игротеки со свободным входом (без записи);
 *  - Историю прошедших игр и календарь;
 *  - Прямые ссылки на конкретные игры по ID;
 *  - Автопереключение между локальным файлом data/db.json и Supabase.
 */

import fs from 'fs';
import path from 'path';
import { Game, Booking, GameWithBookings, CreateGameInput, CreateBookingInput, UpdateGameInput } from './types';
import { sendTelegramNotification } from './telegram';
import { formatRuDate } from './dateUtils';
import { createClient } from '@supabase/supabase-js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const TMP_DB_FILE = path.join('/tmp', 'guap_db.json');

// In-memory cache fallback for serverless environments (Vercel)
let memoryDb: LocalDatabase | null = null;

/**
 * Очищает и нормализует URL проекта Supabase.
 * Автоматически отрезает /rest/v1, /rest, trailing slashes,
 * преобразует ссылки из личного кабинета и удаляет лишние пробелы.
 */
export function sanitizeSupabaseUrl(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  let url = rawUrl.trim();

  // Если вставили ссылку на дашборд Supabase вида https://supabase.com/dashboard/project/<ref>
  const dashMatch = url.match(/supabase\.com\/dashboard\/project\/([a-z0-9_-]+)/i);
  if (dashMatch) {
    return `https://${dashMatch[1]}.supabase.co`;
  }

  // Восстанавливаем https:// если не указан протокол
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Отрезаем /rest/v1, /rest, /v1 и завершающие слэши
  return url
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/rest\/?$/i, '')
    .replace(/\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
const isSupabaseEnabled = Boolean(supabaseUrl && supabaseKey);

const supabase = isSupabaseEnabled
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;

/// Начальные демо-данные клуба «СОЗВЕЗДИЕ»
const INITIAL_GAMES: Game[] = [
  {
    id: 'game-1',
    title: 'Пепел Богенхафена: Тени над ярмаркой',
    system: 'WFRP 4e',
    master: 'Алексей «GM» Смирнов',
    date: '2026-10-02',
    time: '18:30',
    location: 'Большая Морская 67, ауд. 13-04',
    maxPlayers: 5,
    description: 'Империя Сигмара, мрачные улицы Богенхафена в разгар весенней ярмарки Шаффенфест. Сыщикам и наемникам предстоит раскрыть темный заговор культа Хаоса под мостовыми города. Мрачное и опасное приключение в лучших традициях Warhammer Fantasy 4e.',
    tags: ['WFRP 4e', 'Ваншот', 'Детектив', 'Гримдарк'],
    status: 'open',
    eventType: 'rpg',
    requiresBooking: true,
    createdAt: '2026-09-28T17:16:07.167Z',
  },
  {
    id: 'game-2',
    title: 'Осада Врат Балдура: Тени Подземья',
    system: 'D&D 5e',
    master: 'Мария Ветрова',
    date: '2026-10-03',
    time: '17:00',
    location: 'Гастелло 15, Коворкинг ГУАП',
    maxPlayers: 4,
    description: 'Герои 3-го уровня прибывают по контракту Гильдии в Нижний город. Караваны торговцев пропадают в тумане у побережья, а городская стража хранит подозрительное молчание. Прегены предоставляются, можно со своим листом.',
    tags: ['D&D 5e', '3 уровень', 'Боевка + Социалка'],
    status: 'open',
    eventType: 'rpg',
    requiresBooking: true,
    createdAt: '2026-09-28T17:16:07.167Z',
  },
  {
    id: 'game-3',
    title: 'Кровавая Ночь в Петербурге: Осколки Маскарада',
    system: 'Вампиры: Маскарад',
    master: 'Константин Новиков',
    date: '2026-10-04',
    time: '18:00',
    location: 'Большая Морская 67, ауд. 13-04',
    maxPlayers: 4,
    description: 'Северная столица под покровом ночи. Князь созывает котерию неонатов для расследования дерзкого нарушения Первой Традиции на Васильевском острове. Политические интриги Камарильи, борьба со Зверем и личные драмы сородичей.',
    tags: ['VTM 5e', 'Вампиры', 'Интриги', 'Личные драмы'],
    status: 'open',
    eventType: 'rpg',
    requiresBooking: true,
    createdAt: '2026-09-28T17:16:07.167Z',
  },
  {
    id: 'game-4',
    title: 'Руины Чёрной Башни',
    system: 'Pathfinder 2e',
    master: 'Дмитрий Ковалев',
    date: '2026-10-05',
    time: '17:30',
    location: 'Гастелло 15, Коворкинг ГУАП',
    maxPlayers: 5,
    description: 'Тактическое приключение по системе Pathfinder 2e для героев 2 уровня. Исследуем забытую твердыню древнего мага в Голарионе, полную ловушек, артефактов и чудовищ. Прегены готовы, правила объясним.',
    tags: ['Pathfinder 2e', 'Тактика', 'Подземелья'],
    status: 'open',
    eventType: 'rpg',
    requiresBooking: true,
    createdAt: '2026-09-28T17:16:07.167Z',
  },
  {
    id: 'game-open-1',
    title: 'Большая открытая игротека ГУАП: 30+ настольных игр',
    system: 'Игротека',
    master: 'Дмитрий Ковалев & Волонтеры клуба',
    date: '2026-10-06',
    time: '16:00 - 21:00',
    location: 'Большая Морская 67, Студенческий коворкинг',
    maxPlayers: 0,
    description: 'Вход абсолютно свободный, без предварительной записи! Приходи один или с компанией в любое время с 16:00 до 21:00. У нас больше 30 настолок: Nemesis, Дюна: Империум, Codenames, Бункер, Каркассон, Эпичные схватки магов и многие другие. Волонтеры клуба встретят и объяснят правила за 5 минут. Чай и печеньки прилагаются.',
    tags: ['Свободный вход', 'Без записи', '30+ игр', 'Чай и печеньки'],
    status: 'open',
    eventType: 'open_boardgame',
    requiresBooking: false,
    createdAt: '2026-09-28T17:24:24.879Z',
  },
  {
    id: 'game-past-1',
    title: 'D&D 5e: Затерянные рудники Фанделвера (Финал)',
    system: 'D&D 5e',
    master: 'Алексей «GM» Смирнов',
    date: '2026-09-20',
    time: '18:00',
    location: 'Большая Морская 67, ауд. 13-04',
    maxPlayers: 5,
    description: 'Финальная битва за Кузню Заклинаний против Черного Паука. Герои 4-го уровня спасли Фандалин и навсегда вошли в летопись клуба «Созвездие».',
    tags: ['Кампания', 'Завершено', 'D&D 5e'],
    status: 'archived',
    eventType: 'rpg',
    requiresBooking: true,
    createdAt: '2026-09-18T17:24:24.879Z',
  },
  {
    id: 'game-past-2',
    title: 'Осенний чемпионат ГУАП по «Каркассону»',
    system: 'Игротека',
    master: 'Совет Клуба',
    date: '2026-09-15',
    time: '17:00',
    location: 'Гастелло 15, Актовый зал',
    maxPlayers: 16,
    description: 'Ежегодный турнир для новичков и опытных игроков. Разыграли 3 комплекта фирменных дайс-сетов клуба и мерч ГУАП Geek Club!',
    tags: ['Турнир', 'Каркассон', 'Мерч'],
    status: 'archived',
    eventType: 'open_boardgame',
    requiresBooking: false,
    createdAt: '2026-09-13T17:24:24.879Z',
  },
];

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b-1',
    gameId: 'game-1',
    name: 'Артем Васильев',
    contact: 'https://vk.com/artem_v',
    comment: 'Играл в D&D, хочу попробовать мрачный Warhammer',
    isWaitlist: false,
    createdAt: '2026-09-28T13:16:07.167Z',
  },
  {
    id: 'b-2',
    gameId: 'game-1',
    name: 'Екатерина Морозова',
    contact: 'https://vk.com/katya_m',
    comment: 'Новичок, нужен преген сыщика/охотника на ведьм',
    isWaitlist: false,
    createdAt: '2026-09-28T14:16:07.167Z',
  },
  {
    id: 'b-3',
    gameId: 'game-3',
    name: 'Илья Соколов',
    contact: '@ilya_geek',
    comment: 'Клан Тореадор, опыт есть',
    isWaitlist: false,
    createdAt: '2026-09-28T15:16:07.167Z',
  },
  {
    id: 'b-4',
    gameId: 'game-2',
    name: 'София Лебедева',
    contact: 'https://vk.com/sofia_leb',
    comment: 'Буду играть бардом',
    isWaitlist: false,
    createdAt: '2026-09-28T12:16:07.167Z',
  },
  {
    id: 'b-past-1',
    gameId: 'game-past-1',
    name: 'Михаил Решетников',
    contact: 'https://vk.com/misha_r',
    comment: 'Воин 4 ур.',
    isWaitlist: false,
    createdAt: new Date(Date.now() - 3600000 * 24 * 11).toISOString(),
  },
];

interface LocalDatabase {
  games: Game[];
  bookings: Booking[];
}

function initLocalDb(): LocalDatabase {
  if (memoryDb) {
    return memoryDb;
  }

  // 1. Проверяем /tmp (если на Vercel уже сохранялись данные)
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      const parsed: LocalDatabase = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.games)) {
        memoryDb = parsed;
        return parsed;
      }
    }
  } catch {}

  // 2. Проверяем data/db.json
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed: LocalDatabase = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.games)) {
        memoryDb = parsed;
        return parsed;
      }
    }
  } catch {}

  const fallback: LocalDatabase = { games: INITIAL_GAMES, bookings: INITIAL_BOOKINGS };
  memoryDb = fallback;
  return fallback;
}

function saveLocalDb(data: LocalDatabase): void {
  memoryDb = data;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // В serverless-окружении (Vercel) пишем в каталог /tmp
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {}
  }
}

function isGameInPast(dateStr: string, status: string, dates?: string[]): boolean {
  if (status === 'archived') return true;
  const today = new Date().toISOString().split('T')[0];
  if (dates && dates.length > 0) {
    return dates.every((d) => d < today);
  }
  return dateStr < today;
}

function getGameSortTime(g: Game): number {
  const today = new Date().toISOString().split('T')[0];
  let targetDate = g.date;
  if (g.dates && g.dates.length > 0) {
    const upcoming = g.dates.filter((d) => d >= today).sort();
    targetDate = upcoming.length > 0 ? upcoming[0] : g.dates[g.dates.length - 1];
  }
  const timeMatch = g.time?.match(/\d{1,2}:\d{2}/)?.[0] || '00:00';
  const timeStr = timeMatch.padStart(5, '0');
  return new Date(`${targetDate}T${timeStr}`).getTime() || 0;
}

function sortGamesWithBookings(list: GameWithBookings[]): GameWithBookings[] {
  const upcoming = list.filter((g) => !g.isPast);
  const past = list.filter((g) => g.isPast);

  // Предстоящие: первыми идут самые близкие по дате проекты (по возрастанию даты)
  upcoming.sort((a, b) => getGameSortTime(a) - getGameSortTime(b));

  // Архивные: самые недавние из прошедших первыми
  past.sort((a, b) => getGameSortTime(b) - getGameSortTime(a));

  return [...upcoming, ...past];
}

export function isGameScheduled(publishAt?: string): boolean {
  if (!publishAt) return false;
  return new Date(publishAt).getTime() > Date.now();
}

function getLocalGamesWithBookings(includeUnpublished = false): GameWithBookings[] {
  const db = initLocalDb();
  const mapped = db.games.map((game) => {
    const gameBookings = db.bookings.filter((b) => b.gameId === game.id);
    const players = gameBookings.filter((b) => !b.isWaitlist);
    const waitlist = gameBookings.filter((b) => b.isWaitlist);
    const requiresB = game.requiresBooking ?? (game.eventType !== 'open_boardgame');
    const datesArray = game.dates && game.dates.length > 0 ? game.dates : [game.date];
    const isScheduled = isGameScheduled(game.publishAt);

    return {
      ...game,
      eventType: game.eventType || 'rpg',
      customEventType: game.customEventType,
      dates: datesArray,
      requiresBooking: requiresB,
      publishAt: game.publishAt,
      isScheduled,
      bookings: gameBookings,
      playersCount: players.length,
      waitlistCount: waitlist.length,
      isFull: requiresB && game.maxPlayers > 0 && players.length >= game.maxPlayers,
      isPast: isGameInPast(game.date, game.status, datesArray),
    };
  });

  const filtered = includeUnpublished ? mapped : mapped.filter((g) => !g.isScheduled);
  return sortGamesWithBookings(filtered);
}

/**
 * Получить список всех игр с информацией о записях
 */
export async function getGamesWithBookings(includeUnpublished = false): Promise<GameWithBookings[]> {
  if (isSupabaseEnabled && supabase) {
    try {
      const { data: games, error: gamesErr } = await supabase
        .from('games')
        .select('*')
        .order('date', { ascending: true });

      if (gamesErr) {
        console.error('[Supabase getGames error, falling back to local]:', gamesErr);
        return getLocalGamesWithBookings(includeUnpublished);
      }

      let gamesData = games || [];

      // Если в базе Supabase таблица games пока пуста — автоматически наполняем её актуальными играми
      if (gamesData.length === 0) {
        try {
          console.log('[Supabase]: Таблица games пуста, выполняем автонаполнение актуальными играми...');
          const seedGamesPayload = INITIAL_GAMES.map((g) => ({
            id: g.id,
            title: g.title,
            system: g.system,
            master: g.master,
            date: g.date,
            time: g.time,
            location: g.location,
            max_players: g.maxPlayers,
            description: g.description,
            tags: g.tags || [],
            status: g.status,
            event_type: g.eventType || 'rpg',
            requires_booking: g.requiresBooking ?? (g.eventType !== 'open_boardgame'),
          }));

          const { error: seedErr } = await supabase
            .from('games')
            .upsert(seedGamesPayload);

          if (!seedErr) {
            const seedBookingsPayload = INITIAL_BOOKINGS.map((b) => ({
              id: b.id,
              game_id: b.gameId,
              name: b.name,
              contact: b.contact,
              comment: b.comment || null,
              is_waitlist: b.isWaitlist,
            }));
            await supabase.from('bookings').upsert(seedBookingsPayload);

            const { data: refetched } = await supabase
              .from('games')
              .select('*')
              .order('date', { ascending: true });

            if (refetched && refetched.length > 0) {
              gamesData = refetched;
            }
          }
        } catch (seedEx) {
          console.error('[Supabase seed exception]:', seedEx);
        }
      }

      const { data: bookings, error: bookErr } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: true });

      if (bookErr) {
        console.error('[Supabase getBookings error]:', bookErr);
      }

      const allBookings: Booking[] = (bookings || []).map((b) => ({
        id: b.id,
        gameId: b.game_id,
        name: b.name,
        contact: b.contact,
        comment: b.comment,
        isWaitlist: b.is_waitlist,
        createdAt: b.created_at,
      }));

      const mapped = gamesData.map((g) => {
        const gameBookings = allBookings.filter((b) => b.gameId === g.id);
        const players = gameBookings.filter((b) => !b.isWaitlist);
        const waitlist = gameBookings.filter((b) => b.isWaitlist);
        const maxP = g.max_players ?? 5;
        const requiresB = g.requires_booking ?? (g.event_type !== 'open_boardgame');
        const datesArray = Array.isArray(g.dates) && g.dates.length > 0 ? g.dates : [g.date];

        return {
          id: g.id,
          title: g.title,
          system: g.system,
          master: g.master,
          date: g.date,
          time: g.time,
          location: g.location,
          maxPlayers: maxP,
          description: g.description,
          tags: g.tags || [],
          status: g.status,
          eventType: g.event_type || 'rpg',
          customEventType: g.custom_event_type,
          dates: datesArray,
          requiresBooking: requiresB,
          publishAt: g.publish_at || g.publishAt,
          isScheduled: isGameScheduled(g.publish_at || g.publishAt),
          createdAt: g.created_at,
          bookings: gameBookings,
          playersCount: players.length,
          waitlistCount: waitlist.length,
          isFull: requiresB && maxP > 0 && players.length >= maxP,
          isPast: isGameInPast(g.date, g.status, datesArray),
        };
      });

      const filtered = includeUnpublished ? mapped : mapped.filter((g) => !g.isScheduled);
      return sortGamesWithBookings(filtered);
    } catch (sbErr) {
      console.error('[Supabase getGames exception, falling back to local]:', sbErr);
      return getLocalGamesWithBookings(includeUnpublished);
    }
  }

  // Локальный режим
  return getLocalGamesWithBookings(includeUnpublished);
}

/**
 * Получить конкретную игру по ID (для страницы /games/[id])
 */
export async function getGameById(id: string, includeUnpublished = true): Promise<GameWithBookings | null> {
  const games = await getGamesWithBookings(includeUnpublished);
  return games.find((g) => g.id === id) || null;
}

/**
 * Создать запись игрока на игру
 */
export async function createBooking(input: CreateBookingInput): Promise<{
  success: boolean;
  booking?: Booking;
  isWaitlist: boolean;
  error?: string;
}> {
  const cleanName = input.name.trim();
  const cleanContact = input.contact.trim();

  if (!cleanName || !cleanContact) {
    return { success: false, isWaitlist: false, error: 'Заполните имя и контакт' };
  }

  if (isSupabaseEnabled && supabase) {
    try {
      const { data: game, error: gErr } = await supabase
        .from('games')
        .select('*')
        .eq('id', input.gameId)
        .maybeSingle();

      if (gErr) {
        console.error('[Supabase getGame error]:', gErr);
        return { success: false, isWaitlist: false, error: `Ошибка базы Supabase: ${gErr.message}` };
      }

      if (!game) {
        return { success: false, isWaitlist: false, error: 'Игра не найдена в базе данных Supabase. Убедитесь, что вы запустили SQL-скрипт в Supabase SQL Editor.' };
      }

      if (game.status !== 'open') {
        return { success: false, isWaitlist: false, error: 'Запись на эту игру закрыта' };
      }

      if (game.requires_booking === false) {
        return { success: false, isWaitlist: false, error: 'На это мероприятие вход свободный, запись не требуется!' };
      }

      // Проверяем дубликат
      const { data: existing, error: existErr } = await supabase
        .from('bookings')
        .select('id')
        .eq('game_id', input.gameId)
        .eq('contact', cleanContact);

      if (existErr) {
        console.error('[Supabase check existing booking error]:', existErr);
      }

      if (existing && existing.length > 0) {
        return { success: false, isWaitlist: false, error: 'Вы уже записаны на эту игру!' };
      }

      const { count: currentPlayersCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('game_id', input.gameId)
        .eq('is_waitlist', false);

      const isWaitlist = (currentPlayersCount || 0) >= game.max_players;

      const newBooking = {
        game_id: input.gameId,
        name: cleanName,
        contact: cleanContact,
        comment: input.comment?.trim() || null,
        is_waitlist: isWaitlist,
      };

      const { data: inserted, error: insErr } = await supabase
        .from('bookings')
        .insert(newBooking)
        .select()
        .single();

      if (insErr) {
        console.error('[Supabase insertBooking error]:', insErr);
        return { success: false, isWaitlist: false, error: `Не удалось сохранить запись в Supabase: ${insErr.message}` };
      }

      const formattedBooking: Booking = {
        id: inserted.id,
        gameId: inserted.game_id,
        name: inserted.name,
        contact: inserted.contact,
        comment: inserted.comment,
        isWaitlist: inserted.is_waitlist,
        createdAt: inserted.created_at,
      };

      try {
        const gameDates = Array.isArray(game.dates) && game.dates.length > 0 ? game.dates : [game.date];
        const dateText = gameDates.length > 1
          ? gameDates.map((d: string) => formatRuDate(d)).join(', ')
          : formatRuDate(game.date);

        await sendTelegramNotification({
          gameTitle: game.title,
          system: game.system,
          master: game.master,
          dateTime: `${dateText} в ${game.time}`,
          location: game.location,
          playerName: cleanName,
          playerContact: cleanContact,
          comment: input.comment,
          isWaitlist,
          currentPlayers: (currentPlayersCount || 0) + (isWaitlist ? 0 : 1),
          maxPlayers: game.max_players,
        });
      } catch (tgErr) {
        console.warn('[Telegram notification error]:', tgErr);
      }

      return { success: true, booking: formattedBooking, isWaitlist };
    } catch (sbException: any) {
      console.error('[Supabase createBooking exception]:', sbException);
      return { success: false, isWaitlist: false, error: `Ошибка обращения к Supabase: ${sbException?.message || sbException}` };
    }
  }

  // Локальный режим
  const db = initLocalDb();
  const game = db.games.find((g) => g.id === input.gameId);

  if (!game) {
    return { success: false, isWaitlist: false, error: 'Игра не найдена' };
  }

  if (game.status !== 'open') {
    return { success: false, isWaitlist: false, error: 'Запись на эту игру закрыта' };
  }

  if (game.requiresBooking === false) {
    return { success: false, isWaitlist: false, error: 'На это событие свободный вход, запись не требуется!' };
  }

  const alreadyBooked = db.bookings.some(
    (b) => b.gameId === input.gameId && b.contact.toLowerCase() === cleanContact.toLowerCase()
  );

  if (alreadyBooked) {
    return { success: false, isWaitlist: false, error: 'Вы уже записаны на эту игру!' };
  }

  const currentPlayers = db.bookings.filter((b) => b.gameId === input.gameId && !b.isWaitlist);
  const isWaitlist = currentPlayers.length >= game.maxPlayers;

  const newBooking: Booking = {
    id: `b-${Date.now()}`,
    gameId: input.gameId,
    name: cleanName,
    contact: cleanContact,
    comment: input.comment?.trim(),
    isWaitlist,
    createdAt: new Date().toISOString(),
  };

  db.bookings.push(newBooking);
  saveLocalDb(db);

  const localGameDates = game.dates && game.dates.length > 0 ? game.dates : [game.date];
  const localDateText = localGameDates.length > 1
    ? localGameDates.map((d) => formatRuDate(d)).join(', ')
    : formatRuDate(game.date);

  await sendTelegramNotification({
    gameTitle: game.title,
    system: game.system,
    master: game.master,
    dateTime: `${localDateText} в ${game.time}`,
    location: game.location,
    playerName: cleanName,
    playerContact: cleanContact,
    comment: input.comment,
    isWaitlist,
    currentPlayers: currentPlayers.length + (isWaitlist ? 0 : 1),
    maxPlayers: game.maxPlayers,
  });

  return { success: true, booking: newBooking, isWaitlist };
}

/**
 * Отмена/удаление записи
 */
export async function cancelBooking(bookingId: string): Promise<boolean> {
  if (isSupabaseEnabled && supabase) {
    const { data: target } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!target) return false;

    await supabase.from('bookings').delete().eq('id', bookingId);

    if (!target.is_waitlist) {
      const { data: firstWaitlist } = await supabase
        .from('bookings')
        .select('*')
        .eq('game_id', target.game_id)
        .eq('is_waitlist', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstWaitlist) {
        await supabase
          .from('bookings')
          .update({ is_waitlist: false })
          .eq('id', firstWaitlist.id);
      }
    }

    return true;
  }

  const db = initLocalDb();
  const index = db.bookings.findIndex((b) => b.id === bookingId);
  if (index === -1) return false;

  const [removed] = db.bookings.splice(index, 1);

  if (!removed.isWaitlist) {
    const nextInReserve = db.bookings
      .filter((b) => b.gameId === removed.gameId && b.isWaitlist)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];

    if (nextInReserve) {
      nextInReserve.isWaitlist = false;
    }
  }

  saveLocalDb(db);
  return true;
}

/**
 * Создание новой игры / игротеки
 */
/**
 * Создание новой игры / игротеки
 */
export async function createGame(input: CreateGameInput): Promise<Game> {
  const eventType = input.eventType || (input.requiresBooking === false ? 'open_boardgame' : 'rpg');
  const requiresBooking = input.requiresBooking !== undefined ? input.requiresBooking : (eventType !== 'open_boardgame');
  const dates = input.dates && input.dates.length > 0 ? input.dates : [input.date];

  const newGame: Game = {
    id: `game-${Date.now()}`,
    title: input.title.trim(),
    system: input.system.trim(),
    master: input.master.trim(),
    date: input.date,
    time: input.time,
    location: input.location.trim(),
    maxPlayers: Number(input.maxPlayers) || (requiresBooking ? 5 : 0),
    description: input.description.trim(),
    tags: input.tags,
    status: 'open',
    eventType,
    customEventType: input.customEventType?.trim() || undefined,
    dates,
    requiresBooking,
    publishAt: input.publishAt?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseEnabled && supabase) {
    try {
      const payload: any = {
        title: newGame.title,
        system: newGame.system,
        master: newGame.master,
        date: newGame.date,
        time: newGame.time,
        location: newGame.location,
        max_players: newGame.maxPlayers,
        description: newGame.description,
        tags: newGame.tags,
        status: newGame.status,
        event_type: newGame.eventType,
        requires_booking: newGame.requiresBooking,
        dates: newGame.dates,
        custom_event_type: newGame.customEventType,
        publish_at: newGame.publishAt || null,
      };

      const { data, error } = await supabase
        .from('games')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[Supabase createGame error, trying fallback without extra columns or saving locally]:', error);
        const { data: fbData, error: fbErr } = await supabase
          .from('games')
          .insert({
            title: newGame.title,
            system: newGame.system,
            master: newGame.master,
            date: newGame.date,
            time: newGame.time,
            location: newGame.location,
            max_players: newGame.maxPlayers,
            description: newGame.description,
            tags: newGame.tags,
            status: newGame.status,
            event_type: newGame.eventType === 'campaign' || newGame.eventType === 'other' ? 'rpg' : newGame.eventType,
            requires_booking: newGame.requiresBooking,
          })
          .select()
          .single();

        if (fbErr) {
          const db = initLocalDb();
          db.games.unshift(newGame);
          saveLocalDb(db);
          return newGame;
        }

        return {
          ...newGame,
          id: fbData.id,
          createdAt: fbData.created_at,
        };
      }

      return {
        id: data.id,
        title: data.title,
        system: data.system,
        master: data.master,
        date: data.date,
        time: data.time,
        location: data.location,
        maxPlayers: data.max_players,
        description: data.description,
        tags: data.tags,
        status: data.status,
        eventType: (data.event_type as any) || newGame.eventType,
        customEventType: data.custom_event_type || newGame.customEventType,
        dates: Array.isArray(data.dates) && data.dates.length > 0 ? data.dates : newGame.dates,
        requiresBooking: data.requires_booking,
        createdAt: data.created_at,
      };
    } catch (err) {
      console.error('[Supabase createGame exception, saving to local fallback]:', err);
      const db = initLocalDb();
      db.games.unshift(newGame);
      saveLocalDb(db);
      return newGame;
    }
  }

  const db = initLocalDb();
  db.games.unshift(newGame);
  saveLocalDb(db);
  return newGame;
}

/**
 * Редактирование существующей игры / игротеки
 */
export async function updateGame(
  gameId: string,
  input: UpdateGameInput
): Promise<GameWithBookings | null> {
  const db = initLocalDb();
  const localIndex = db.games.findIndex((g) => g.id === gameId);

  if (localIndex !== -1) {
    const existing = db.games[localIndex];
    db.games[localIndex] = {
      ...existing,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.system !== undefined && { system: input.system.trim() }),
      ...(input.master !== undefined && { master: input.master.trim() }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.time !== undefined && { time: input.time }),
      ...(input.location !== undefined && { location: input.location.trim() }),
      ...(input.maxPlayers !== undefined && { maxPlayers: Number(input.maxPlayers) }),
      ...(input.description !== undefined && { description: input.description.trim() }),
      ...(input.tags !== undefined && { tags: input.tags }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.eventType !== undefined && { eventType: input.eventType }),
      ...(input.customEventType !== undefined && { customEventType: input.customEventType.trim() }),
      ...(input.dates !== undefined && { dates: input.dates }),
      ...(input.requiresBooking !== undefined && { requiresBooking: input.requiresBooking }),
      ...(input.publishAt !== undefined && { publishAt: input.publishAt ? input.publishAt.trim() : undefined }),
    };
    saveLocalDb(db);
  }

  if (isSupabaseEnabled && supabase) {
    try {
      const payload: any = {};
      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.system !== undefined) payload.system = input.system.trim();
      if (input.master !== undefined) payload.master = input.master.trim();
      if (input.date !== undefined) payload.date = input.date;
      if (input.time !== undefined) payload.time = input.time;
      if (input.location !== undefined) payload.location = input.location.trim();
      if (input.maxPlayers !== undefined) payload.max_players = Number(input.maxPlayers);
      if (input.description !== undefined) payload.description = input.description.trim();
      if (input.tags !== undefined) payload.tags = input.tags;
      if (input.status !== undefined) payload.status = input.status;
      if (input.eventType !== undefined) payload.event_type = input.eventType;
      if (input.customEventType !== undefined) payload.custom_event_type = input.customEventType.trim();
      if (input.dates !== undefined) payload.dates = input.dates;
      if (input.requiresBooking !== undefined) payload.requires_booking = input.requiresBooking;
      if (input.publishAt !== undefined) payload.publish_at = input.publishAt ? input.publishAt.trim() : null;

      const { error } = await supabase
        .from('games')
        .update(payload)
        .eq('id', gameId);

      if (error) {
        console.error('[Supabase updateGame error, trying fallback]:', error);
        delete payload.custom_event_type;
        delete payload.dates;
        delete payload.publish_at;
        if (payload.event_type && !['rpg', 'open_boardgame'].includes(payload.event_type)) {
          delete payload.event_type;
        }
        await supabase.from('games').update(payload).eq('id', gameId);
      }
    } catch (sbErr) {
      console.error('[Supabase updateGame exception]:', sbErr);
    }
  }

  return getGameById(gameId, true);
}

/**
 * Опубликовать отложенный анонс немедленно
 */
export async function publishGameNow(gameId: string): Promise<GameWithBookings | null> {
  return updateGame(gameId, { publishAt: null });
}

export async function updateGameStatus(
  gameId: string,
  status: 'open' | 'closed' | 'archived'
): Promise<boolean> {
  if (isSupabaseEnabled && supabase) {
    const { error } = await supabase
      .from('games')
      .update({ status })
      .eq('id', gameId);
    return !error;
  }

  const db = initLocalDb();
  const game = db.games.find((g) => g.id === gameId);
  if (!game) return false;
  game.status = status;
  saveLocalDb(db);
  return true;
}

export async function deleteGame(gameId: string): Promise<boolean> {
  if (isSupabaseEnabled && supabase) {
    await supabase.from('bookings').delete().eq('game_id', gameId);
    const { error } = await supabase.from('games').delete().eq('id', gameId);
    return !error;
  }

  const db = initLocalDb();
  db.games = db.games.filter((g) => g.id !== gameId);
  db.bookings = db.bookings.filter((b) => b.gameId !== gameId);
  saveLocalDb(db);
  return true;
}

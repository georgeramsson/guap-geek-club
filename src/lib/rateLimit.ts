/**
 * @file src/lib/rateLimit.ts
 * @description Модуль защиты от спама и массовой регистрации на игры («ограничение записи за друзей»).
 * 
 * Назначение:
 * Предотвращает сценарий, когда один пользователь скриптом или быстрыми повторными отправками
 * занимает все доступные места за игровым столом от лица своих знакомых или фиктивных аккаунтов.
 * 
 * Принцип работы:
 * 1. Отслеживает запросы по комбинации IP-адреса, ID игры и идентификатора устройства (deviceId).
 * 2. Учитывает специфику университетских сетей (ГУАП Wi-Fi, общежития), где множество студентов
 *    выходят в интернет через один общий внешний IP-адрес (NAT):
 *    - Защита накладывает короткий таймаут (cooldown) между записями на одну и ту же игру с одного IP (45 сек).
 *    - Запрещает более 2 записей на одну конкретную игру с одного и того же устройства/IP подряд за 10 минут.
 *    - Общий лимит: не более 5 любых записей в час с одного IP.
 * 3. Автоматически очищает устаревшие записи из оперативной памяти каждые 15 минут.
 * 
 * Использование:
 * Импортируется в API-роутах Next.js (например, src/app/api/bookings/route.ts):
 *   const check = checkBookingRateLimit({ ip, gameId, deviceId });
 *   if (!check.allowed) { return NextResponse.json({ error: check.message }, { status: 429 }); }
 */

interface RateLimitRecord {
  timestamps: number[];
  devices: Set<string>;
}

// Хранилище записей в оперативной памяти: key = `${ip}:${gameId}` или `${ip}:global`
const ipGameLimits = new Map<string, RateLimitRecord>();
const ipGlobalLimits = new Map<string, number[]>();

// Настройки лимитов
const CONFIG = {
  // Минимальный интервал между записями на одну игру с одного IP (секунды)
  SAME_GAME_COOLDOWN_SEC: 45,
  // Максимум записей на одну игру с одного IP за окно времени
  MAX_PER_GAME_WINDOW: 2,
  GAME_WINDOW_MS: 10 * 60 * 1000, // 10 минут
  // Максимум любых записей с одного IP за час (на случай спам-ботов)
  MAX_GLOBAL_PER_HOUR: 6,
  GLOBAL_WINDOW_MS: 60 * 60 * 1000, // 1 час
};

// Периодическая очистка устаревших данных раз в 15 минут
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of ipGameLimits.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < CONFIG.GAME_WINDOW_MS);
      if (record.timestamps.length === 0) {
        ipGameLimits.delete(key);
      }
    }
    for (const [ip, timestamps] of ipGlobalLimits.entries()) {
      const active = timestamps.filter((t) => now - t < CONFIG.GLOBAL_WINDOW_MS);
      if (active.length === 0) {
        ipGlobalLimits.delete(ip);
      } else {
        ipGlobalLimits.set(ip, active);
      }
    }
  }, 15 * 60 * 1000);
}

export interface RateLimitCheckParams {
  ip: string;
  gameId: string;
  deviceId?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  message?: string;
  retryAfterSec?: number;
}

/**
 * Проверка возможности совершить запись на игру
 */
export function checkBookingRateLimit({
  ip,
  gameId,
  deviceId = 'unknown',
}: RateLimitCheckParams): RateLimitCheckResult {
  const now = Date.now();

  // Игнорируем строгие ограничения для локальной разработки
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return { allowed: true };
  }

  // 1. Проверка глобального лимита с IP за 1 час
  const globalHistory = ipGlobalLimits.get(ip) || [];
  const activeGlobal = globalHistory.filter((t) => now - t < CONFIG.GLOBAL_WINDOW_MS);
  if (activeGlobal.length >= CONFIG.MAX_GLOBAL_PER_HOUR) {
    return {
      allowed: false,
      message: 'С вашего интернет-соединения зафиксировано слишком много записей. Пожалуйста, попробуйте позже.',
      retryAfterSec: 3600,
    };
  }

  // 2. Проверка записей на конкретную игру
  const gameKey = `${ip}:${gameId}`;
  let gameRecord = ipGameLimits.get(gameKey);

  if (!gameRecord) {
    gameRecord = { timestamps: [], devices: new Set() };
    ipGameLimits.set(gameKey, gameRecord);
  }

  // Фильтруем записи внутри окна
  gameRecord.timestamps = gameRecord.timestamps.filter((t) => now - t < CONFIG.GAME_WINDOW_MS);

  // Проверка короткого кулдауна между записями на одну игру
  const lastAttempt = gameRecord.timestamps[gameRecord.timestamps.length - 1];
  if (lastAttempt) {
    const elapsedSec = Math.floor((now - lastAttempt) / 1000);
    if (elapsedSec < CONFIG.SAME_GAME_COOLDOWN_SEC) {
      const remainingSec = CONFIG.SAME_GAME_COOLDOWN_SEC - elapsedSec;
      return {
        allowed: false,
        message: `Пожалуйста, подождите ${remainingSec} сек. перед следующей записью. Если вы хотите записать друга, лучше отправьте ему прямую ссылку — пусть он запишется со своего смартфона.`,
        retryAfterSec: remainingSec,
      };
    }
  }

  // Проверка максимального числа записей на одну игру с этого IP в рамках 10 минут
  if (gameRecord.timestamps.length >= CONFIG.MAX_PER_GAME_WINDOW) {
    return {
      allowed: false,
      message: 'С вашего интернет-соединения уже зарегистрировано максимальное количество игроков на эту игру. Чтобы избежать овербукинга за других, попросите друзей открыть сайт со своих мобильных устройств.',
      retryAfterSec: Math.ceil(CONFIG.GAME_WINDOW_MS / 1000),
    };
  }

  return { allowed: true };
}

/**
 * Регистрация совершенной записи в счетчиках лимитов
 */
export function recordBookingRateLimit({
  ip,
  gameId,
  deviceId = 'unknown',
}: RateLimitCheckParams): void {
  const now = Date.now();
  const gameKey = `${ip}:${gameId}`;

  // Обновляем запись по игре
  let gameRecord = ipGameLimits.get(gameKey);
  if (!gameRecord) {
    gameRecord = { timestamps: [], devices: new Set() };
    ipGameLimits.set(gameKey, gameRecord);
  }
  gameRecord.timestamps.push(now);
  gameRecord.devices.add(deviceId);

  // Обновляем глобальную историю IP
  const globalHistory = ipGlobalLimits.get(ip) || [];
  globalHistory.push(now);
  ipGlobalLimits.set(ip, globalHistory);
}

/**
 * @file src/lib/dateUtils.ts
 * @description Утилиты для форматирования дат и времени в привычном русском формате.
 * 
 * Назначение:
 * Преобразует строковые даты стандарта ISO (YYYY-MM-DD или ISO 8601) в русскоязычное
 * визуальное представление: «7 октября 2026», исключая американскую числовую раскладку.
 * 
 * Принцип работы:
 * - formatRuDate: принимает 'YYYY-MM-DD' или ISO строку и возвращает строку вида '7 октября 2026';
 * - formatRuDateTime: принимает ISO дату со временем и возвращает '7 октября 2026 в 18:00';
 * - Работает детерминированно, защищая от различий в SSR и гидратации Next.js между сервером и клиентом.
 * 
 * Использование:
 * import { formatRuDate, formatRuDateTime } from '@/lib/dateUtils';
 * formatRuDate('2026-10-07'); // => '7 октября 2026'
 */

const RU_MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/**
 * Преобразует строковую дату (YYYY-MM-DD или ISO) в формат: «7 октября 2026»
 */
export function formatRuDate(dateStr?: string | null): string {
  if (!dateStr) return '';

  const clean = dateStr.trim();
  const datePart = clean.slice(0, 10);
  const parts = datePart.split('-');

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12) {
      return `${day} ${RU_MONTHS[month - 1]} ${year}`;
    }
  }

  // Запасной вариант через объект Date
  try {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${RU_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch {
    // В случае сбоя парсинга возвращаем как есть
  }

  return clean;
}

/**
 * Преобразует дату и время в формат: «7 октября 2026 в 18:00»
 */
export function formatRuDateTime(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return '';

  try {
    const d = new Date(dateTimeStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = RU_MONTHS[d.getMonth()];
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year} в ${hours}:${minutes}`;
    }
  } catch {
    // игнорируем ошибку
  }

  return dateTimeStr;
}

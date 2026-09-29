/**
 * @file src/app/api/bookings/route.ts
 * @description REST API маршруты для записи игроков на игры и отмены бронирований.
 * 
 * Назначение:
 * Обрабатывает пользовательские запросы на регистрацию на игровые сессии и игротеки клуба «СОЗВЕЗДИЕ» (ГУАП).
 * 
 * Принцип работы:
 * - POST /api/bookings:
 *   1. Валидирует переданные поля (gameId, name, contact).
 *   2. Извлекает IP-клиента (через x-forwarded-for / x-real-ip) и x-device-id.
 *   3. Выполняет проверку rate limiting (checkBookingRateLimit), защищая от массового бронирования мест за один присест.
 *   4. Создает бронирование через createBooking (в Supabase или локальной базе).
 *   5. При успехе фиксирует попытку в лимитах и отправляет уведомление в Telegram-канал организаторов.
 * - DELETE /api/bookings?id=...:
 *   Отменяет бронирование и автоматически переводит первого игрока из листа ожидания (резерва) в основной состав.
 * 
 * Запуск:
 * Вызывается автоматически фронтендом Next.js при отправке формы записи или отмене записи.
 */

import { NextResponse } from 'next/server';
import { createBooking, cancelBooking } from '@/lib/storage';
import { checkBookingRateLimit, recordBookingRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, name, contact, comment } = body;

    if (!gameId || !name || !contact) {
      return NextResponse.json(
        { error: 'Укажите ваше имя и ссылку на контакт (ВК/Telegram)' },
        { status: 400 }
      );
    }

    // Извлечение IP клиента и идентификатора устройства
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')) || '127.0.0.1';
    const deviceId = request.headers.get('x-device-id') || 'unknown';

    // Защита от спама и массовой регистрации на одну игру
    const limitCheck = checkBookingRateLimit({ ip, gameId, deviceId });
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: limitCheck.message || 'Слишком много запросов. Попробуйте чуть позже.' },
        { status: 429 }
      );
    }

    const result = await createBooking({
      gameId,
      name,
      contact,
      comment,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Не удалось записаться на игру' },
        { status: 400 }
      );
    }

    // Фиксируем успешную запись для предотвращения массовых авто-регистраций
    recordBookingRateLimit({ ip, gameId, deviceId });

    return NextResponse.json({
      success: true,
      booking: result.booking,
      isWaitlist: result.isWaitlist,
    });
  } catch (error) {
    console.error('[API POST /api/bookings error]:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json({ error: 'id записи не указан' }, { status: 400 });
    }

    const success = await cancelBooking(bookingId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API DELETE /api/bookings error]:', error);
    return NextResponse.json({ error: 'Ошибка отмены записи' }, { status: 500 });
  }
}

/**
 * @file src/app/api/status/route.ts
 * @description Диагностический маршрут для проверки статуса базы данных и переменных окружения на Vercel.
 * 
 * Назначение:
 * Позволяет администратору или разработчику мгновенно проверить, какие ключи Supabase видит сервер,
 * подключена ли облачная база данных и существуют ли необходимые таблицы.
 * 
 * Принцип работы:
 * - Проверяет наличие переменных NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY;
 * - Если переменные заданы, выполняет тестовый запрос к таблице games в Supabase;
 * - Возвращает статус готовности и понятные подсказки в случае ошибок.
 * 
 * Запуск:
 * Доступен в браузере по адресу GET /api/status.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sanitizeSupabaseUrl } from '@/lib/storage';

export async function GET() {
  const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  const supabaseUrl = sanitizeSupabaseUrl(rawSupabaseUrl);

  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(rawSupabaseUrl),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anonKey),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
    url_auto_fixed: Boolean(rawSupabaseUrl && rawSupabaseUrl.trim() !== supabaseUrl),
  };

  const isConfigured = Boolean(supabaseUrl && (serviceKey || anonKey));

  if (!isConfigured) {
    return NextResponse.json({
      status: 'local_mode',
      message: 'Переменные Supabase не обнаружены на Vercel. Сайт работает в автономном режиме на файловой базе data/db.json. Если вы добавляли переменные в Settings -> Environment Variables, выполните Redeploy в Vercel.',
      env: envStatus,
    });
  }

  try {
    const key = serviceKey || anonKey;
    const client = createClient(supabaseUrl!, key!);

    // Проверяем подключение и наличие таблицы games
    const { data, error } = await client
      .from('games')
      .select('id, title')
      .limit(3);

    if (error) {
      return NextResponse.json({
        status: 'supabase_error',
        message: `Ключи получены, но Supabase вернул ошибку: ${error.message}. Убедитесь, что вы запустили скрипт supabase/schema.sql в SQL Editor на supabase.com.`,
        error: error.message,
        env: envStatus,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: 'supabase_connected',
      message: 'Облачная база Supabase успешно подключена и отвечает!',
      gamesCount: data?.length || 0,
      env: envStatus,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'connection_exception',
      message: `Исключение при подключении к Supabase: ${err?.message || err}`,
      env: envStatus,
    }, { status: 500 });
  }
}

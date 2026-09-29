/**
 * @file supabase/schema.sql
 * @description SQL-схема базы данных для проекта «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Инструкция по установке в Supabase:
 * 1. Зайдите в проект на https://supabase.com
 * 2. Откройте вкладку "SQL Editor" в левом меню
 * 3. Вставьте данный скрипт целиком и нажмите "Run"
 * 4. Таблицы games и bookings, а также правила RLS создадутся автоматически.
 */

-- 1. Таблица игр и игротек (games)
CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  system TEXT NOT NULL,
  master TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 5,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  event_type TEXT NOT NULL DEFAULT 'rpg' CHECK (event_type IN ('rpg', 'open_boardgame')),
  requires_booking BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Таблица записей игроков (bookings)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  comment TEXT,
  is_waitlist BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для быстрой выборки
CREATE INDEX IF NOT EXISTS idx_bookings_game_id ON public.bookings(game_id);
CREATE INDEX IF NOT EXISTS idx_games_date ON public.games(date);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);

-- 3. Настройка безопасности (Row Level Security)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Любой пользователь может читать игры
CREATE POLICY "Public games read access"
  ON public.games FOR SELECT
  USING (true);

-- Любой пользователь может читать список записей
CREATE POLICY "Public bookings read access"
  ON public.bookings FOR SELECT
  USING (true);

-- Любой пользователь может создать запись на игру (INSERT)
CREATE POLICY "Public booking insert access"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

-- Полный доступ для сервисного ключа
CREATE POLICY "Service role full access on games"
  ON public.games FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on bookings"
  ON public.bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

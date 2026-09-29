/**
 * @file supabase/schema.sql
 * @description SQL-схема базы данных для проекта «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Создает таблицы games и bookings в PostgreSQL (Supabase) с поддержкой UUID и строковых ID,
 * настраивает политики безопасности (Row Level Security) и наполняет базу актуальными играми клуба.
 * 
 * Инструкция по установке в Supabase:
 * 1. Зайдите в проект на https://supabase.com
 * 2. Откройте вкладку "SQL Editor" в левом меню
 * 3. Вставьте данный скрипт целиком и нажмите "Run"
 * 4. Таблицы games и bookings, а также правила RLS и стартовые партии создадутся автоматически.
 */

-- 1. Таблица игр и игротек (games)
CREATE TABLE IF NOT EXISTS public.games (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  game_id TEXT NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
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
DROP POLICY IF EXISTS "Public games read access" ON public.games;
CREATE POLICY "Public games read access"
  ON public.games FOR SELECT
  USING (true);

-- Любой пользователь может читать список записей
DROP POLICY IF EXISTS "Public bookings read access" ON public.bookings;
CREATE POLICY "Public bookings read access"
  ON public.bookings FOR SELECT
  USING (true);

-- Любой пользователь может создать запись на игру (INSERT)
DROP POLICY IF EXISTS "Public booking insert access" ON public.bookings;
CREATE POLICY "Public booking insert access"
  ON public.bookings FOR INSERT
  WITH CHECK (true);

-- Любой пользователь может отменить запись
DROP POLICY IF EXISTS "Public booking delete access" ON public.bookings;
CREATE POLICY "Public booking delete access"
  ON public.bookings FOR DELETE
  USING (true);

-- Полный доступ для сервисного ключа
DROP POLICY IF EXISTS "Service role full access on games" ON public.games;
CREATE POLICY "Service role full access on games"
  ON public.games FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on bookings" ON public.bookings;
CREATE POLICY "Service role full access on bookings"
  ON public.bookings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Стартовые актуальные игры клуба ГУАП
INSERT INTO public.games (id, title, system, master, date, time, location, max_players, description, tags, status, event_type, requires_booking)
VALUES 
  (
    'game-1',
    'Пепел Богенхафена: Тени над ярмаркой',
    'WFRP 4e',
    'Алексей «GM» Смирнов',
    '2026-10-02',
    '18:30',
    'Большая Морская 67, ауд. 13-04',
    5,
    'Империя Сигмара, мрачные улицы Богенхафена в разгар весенней ярмарки Шаффенфест. Сыщикам и наемникам предстоит раскрыть темный заговор культа Хаоса под мостовыми города. Мрачное и опасное приключение в лучших традициях Warhammer Fantasy 4e.',
    ARRAY['WFRP 4e', 'Ваншот', 'Детектив', 'Гримдарк'],
    'open',
    'rpg',
    true
  ),
  (
    'game-2',
    'Осада Врат Балдура: Тени Подземья',
    'D&D 5e',
    'Мария Ветрова',
    '2026-10-03',
    '17:00',
    'Гастелло 15, Коворкинг ГУАП',
    4,
    'Герои 3-го уровня прибывают по контракту Гильдии в Нижний город. Караваны торговцев пропадают в тумане у побережья, а городская стража хранит подозрительное молчание. Прегены предоставляются, можно со своим листом.',
    ARRAY['D&D 5e', '3 уровень', 'Боевка + Социалка'],
    'open',
    'rpg',
    true
  ),
  (
    'game-3',
    'Кровавая Ночь в Петербурге: Осколки Маскарада',
    'Вампиры: Маскарад',
    'Константин Новиков',
    '2026-10-04',
    '18:00',
    'Большая Морская 67, ауд. 13-04',
    4,
    'Северная столица под покровом ночи. Князь созывает котерию неонатов для расследования дерзкого нарушения Первой Традиции на Васильевском острове. Политические интриги Камарильи, борьба со Зверем и личные драмы сородичей.',
    ARRAY['VTM 5e', 'Вампиры', 'Интриги', 'Личные драмы'],
    'open',
    'rpg',
    true
  ),
  (
    'game-4',
    'Руины Чёрной Башни',
    'Pathfinder 2e',
    'Дмитрий Ковалев',
    '2026-10-05',
    '17:30',
    'Гастелло 15, Коворкинг ГУАП',
    5,
    'Тактическое приключение по системе Pathfinder 2e для героев 2 уровня. Исследуем забытую твердыню древнего мага в Голарионе, полную ловушек, артефактов и чудовищ. Прегены готовы, правила объясним.',
    ARRAY['Pathfinder 2e', 'Тактика', 'Подземелья'],
    'open',
    'rpg',
    true
  ),
  (
    'game-open-1',
    'Большая открытая игротека ГУАП: 30+ настольных игр',
    'Игротека',
    'Дмитрий Ковалев & Волонтеры клуба',
    '2026-10-06',
    '16:00 - 21:00',
    'Большая Морская 67, Студенческий коворкинг',
    0,
    'Вход абсолютно свободный, без предварительной записи! Приходи один или с компанией в любое время с 16:00 до 21:00. У нас больше 30 настолок: Nemesis, Дюна: Империум, Codenames, Бункер, Каркассон, Эпичные схватки магов и многие другие. Волонтеры клуба встретят и объяснят правила за 5 минут. Чай и печеньки прилагаются.',
    ARRAY['Свободный вход', 'Без записи', '30+ игр', 'Чай и печеньки'],
    'open',
    'open_boardgame',
    false
  )
ON CONFLICT (id) DO NOTHING;

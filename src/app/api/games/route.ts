/**
 * @file src/app/api/games/route.ts
 * @description REST API маршруты для работы с играми и мероприятиями клуба «СОЗВЕЗДИЕ».
 * 
 * Назначение:
 * Предоставляет эндпоинты для:
 *  - GET: получение списка опубликованных игр (для обычных пользователей) или всех игр, включая отложенные (all=true, для админки);
 *  - POST: создание нового анонса (поддерживает publishAt для отложенной публикации);
 *  - PUT: полное редактирование существующего анонса или немедленная публикация (action: 'publish_now');
 *  - PATCH: быстрое переключение статуса (open/closed/archived);
 *  - DELETE: удаление анонса и связанных записей.
 * 
 * Принцип работы:
 * Делегирует операции сервисному слою src/lib/storage.ts с автоматической поддержкой
 * Supabase и локального хранилища data/db.json.
 */

import { NextResponse } from 'next/server';
import { 
  getGamesWithBookings, 
  getGameById, 
  createGame, 
  updateGame, 
  publishGameNow,
  updateGameStatus, 
  deleteGame 
} from '@/lib/storage';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('id');
    const includeAll = searchParams.get('all') === 'true';

    if (gameId) {
      const game = await getGameById(gameId, includeAll);
      if (!game) {
        return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });
      }
      return NextResponse.json({ game });
    }

    const games = await getGamesWithBookings(includeAll);
    return NextResponse.json({ games });
  } catch (error) {
    console.error('[API GET /api/games error]:', error);
    return NextResponse.json({ error: 'Не удалось загрузить данные' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.title || !body.system || !body.master || !body.date || !body.time || !body.location) {
      return NextResponse.json(
        { error: 'Пожалуйста, заполните все обязательные поля игры' },
        { status: 400 }
      );
    }

    const requiresBooking = body.requiresBooking !== undefined ? Boolean(body.requiresBooking) : true;
    const eventType = body.eventType || (requiresBooking ? 'rpg' : 'open_boardgame');

    const newGame = await createGame({
      title: body.title,
      system: body.system,
      master: body.master,
      date: body.date,
      time: body.time,
      location: body.location,
      maxPlayers: Number(body.maxPlayers) || (requiresBooking ? 5 : 0),
      description: body.description || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
      eventType,
      customEventType: body.customEventType,
      dates: Array.isArray(body.dates) ? body.dates : (body.date ? [body.date] : []),
      requiresBooking,
      publishAt: body.publishAt,
    });

    return NextResponse.json({ game: newGame }, { status: 201 });
  } catch (error) {
    console.error('[API POST /api/games error]:', error);
    return NextResponse.json({ error: 'Ошибка при создании игры' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const gameId = body.id || body.gameId;

    if (!gameId) {
      return NextResponse.json({ error: 'id игры не передан' }, { status: 400 });
    }

    // Быстрая публикация отложенного анонса
    if (body.action === 'publish_now') {
      const published = await publishGameNow(gameId);
      return NextResponse.json({ game: published });
    }

    const updatedGame = await updateGame(gameId, {
      title: body.title,
      system: body.system,
      master: body.master,
      date: body.date,
      time: body.time,
      location: body.location,
      maxPlayers: body.maxPlayers !== undefined ? Number(body.maxPlayers) : undefined,
      description: body.description,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      status: body.status,
      eventType: body.eventType,
      customEventType: body.customEventType,
      dates: Array.isArray(body.dates) ? body.dates : undefined,
      requiresBooking: body.requiresBooking !== undefined ? Boolean(body.requiresBooking) : undefined,
      publishAt: body.publishAt,
    });

    if (!updatedGame) {
      return NextResponse.json({ error: 'Игра не найдена' }, { status: 404 });
    }

    return NextResponse.json({ game: updatedGame });
  } catch (error) {
    console.error('[API PUT /api/games error]:', error);
    return NextResponse.json({ error: 'Ошибка при обновлении игры' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { gameId, status } = body;

    if (!gameId || !['open', 'closed', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'Неверные параметры запроса' }, { status: 400 });
    }

    const success = await updateGameStatus(gameId, status);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API PATCH /api/games error]:', error);
    return NextResponse.json({ error: 'Ошибка обновления статуса' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('id');

    if (!gameId) {
      return NextResponse.json({ error: 'id игры не передан' }, { status: 400 });
    }

    const success = await deleteGame(gameId);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('[API DELETE /api/games error]:', error);
    return NextResponse.json({ error: 'Ошибка удаления игры' }, { status: 500 });
  }
}

/**
 * @file src/components/Header.tsx
 * @description Шапка сайта клуба настольных и ролевых игр «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * 
 * Назначение:
 * Обеспечивает сквозную навигацию, брендинг клуба, доступ к сообществам ВКонтакте/Telegram
 * и быстрый вход в панель управления для мастеров (/admin).
 * 
 * Принцип работы:
 * - Зафиксирована вверху страницы (sticky) с размытием фона (backdrop-blur);
 * - Содержит официальный логотип клуба с адаптивным масштабированием;
 * - Предоставляет доступные ссылки и кнопки с оптимизированными областями нажатия (hit targets) для мобильных устройств.
 * 
 * Запуск:
 * Рендерится на главной странице (src/app/page.tsx) и странице админки (src/app/admin/page.tsx).
 */

'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Shield, Send } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-purple-900/40 bg-[#070422]/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20">
          
          {/* Логотип и брендинг клуба */}
          <Link href="/" className="flex items-center gap-3 group py-1" aria-label="На главную">
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Image
                src="/logo-stars.png"
                alt="Логотип Созвездие ГУАП"
                fill
                sizes="44px"
                className="object-contain drop-shadow-[0_0_10px_rgba(187,16,243,0.5)]"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-pixy text-xl sm:text-2xl tracking-wider text-gradient-accent">
                  СОЗВЕЗДИЕ
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md bg-purple-950/80 text-yellow-300 border border-yellow-300/30">
                  ГУАП Geek Club
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 hidden sm:block">
                Клуб настольных и ролевых игр
              </p>
            </div>
          </Link>

          {/* Социальные ссылки и админка */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* ВК группа */}
            <a
              href="https://vk.ru/guap_geek_club"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 transition-all hover:text-white"
              title="Сообщество ВКонтакте"
              aria-label="Группа ВКонтакте"
            >
              <span className="font-bold text-[#5181b8]">VK</span>
              <span className="hidden md:inline">guap_geek_club</span>
            </a>

            {/* Telegram канал */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-purple-200 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/40 transition-all hover:text-white"
              title="Telegram канал клуба"
              aria-label="Telegram канал"
            >
              <Send className="w-3.5 h-3.5 text-[#2AABEE]" />
              <span className="hidden md:inline">Telegram</span>
            </a>

            {/* Вход для мастеров */}
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-yellow-300 bg-purple-950/80 hover:bg-purple-900/80 border border-yellow-300/30 hover:border-yellow-300/60 shadow-sm transition-all"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Панель мастера</span>
            </Link>
          </div>

        </div>
      </div>
    </header>
  );
}

/**
 * @file src/app/layout.tsx
 * @description Корневой макет сайта клуба настольных и ролевых игр «СОЗВЕЗДИЕ» (ГУАП Geek Club).
 * Настраивает метаданные, фавикон, заголовок и глобальные стили.
 */

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "СОЗВЕЗДИЕ | Запись на игры ГУАП Geek Club",
  description: "Официальная онлайн-запись на настольные и ролевые игры клуба ГУАП. Выбирай партию по D&D, Зову Ктулху или настолкам и занимай слот за столом!",
  icons: {
    icon: "/logo-stars.png",
    apple: "/logo-stars.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="h-full">
      <body className="min-h-full flex flex-col bg-[#070422] text-[#f3f0ff] antialiased selection:bg-[#BB10F3] selection:text-white">
        {children}
      </body>
    </html>
  );
}

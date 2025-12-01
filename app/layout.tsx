import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Comm Time - タイマー & ポモドーロ",
    template: "%s | Comm Time",
  },
  description:
    "ミーティングタイマーとポモドーロタイマーを備えた時間管理アプリ。TODO管理、アラーム機能、ダークモード対応。",
  keywords: [
    "タイマー",
    "ポモドーロ",
    "ミーティング",
    "時間管理",
    "TODO",
    "生産性",
    "Pomodoro",
    "Timer",
  ],
  authors: [{ name: "Comm Time" }],
  creator: "Comm Time",
  publisher: "Comm Time",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    title: "Comm Time - タイマー & ポモドーロ",
    description:
      "ミーティングタイマーとポモドーロタイマーを備えた時間管理アプリ。TODO管理、アラーム機能、ダークモード対応。",
    siteName: "Comm Time",
  },
  twitter: {
    card: "summary_large_image",
    title: "Comm Time - タイマー & ポモドーロ",
    description:
      "ミーティングタイマーとポモドーロタイマーを備えた時間管理アプリ。TODO管理、アラーム機能、ダークモード対応。",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Comm Time",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

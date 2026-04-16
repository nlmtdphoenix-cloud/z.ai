import type { Metadata } from "next";
import { DM_Sans, DM_Mono, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const notoSerifJP = Noto_Serif_JP({
  variable: "--font-noto-serif-jp",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "勤務時間報告システム",
  description: "月次勤務時間報告システム。従業員の月間労働時間を記録・管理・承認します。",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${dmMono.variable} ${notoSerifJP.variable} antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GigNow — 내가 원할 때, 내 근처에서, 바로 일하기",
    template: "%s | GigNow",
  },
  description:
    "시간제 초단기 아르바이트를 실시간 매칭. 빈 시간을 등록하면 AI가 맞춤 일자리를 찾아드려요.",
  keywords: ["알바", "단기알바", "초단기", "아르바이트", "N잡", "긱워크", "매칭"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#EA580C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <script
          id="service-worker-registrar"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch((error) => {
                  console.warn('[sw] registration failed:', error);
                });
              }
            `,
          }}
        />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

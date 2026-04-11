import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistrar } from "@/components/providers/service-worker-registrar";
import {
  getMissingRuntimeEnvKeys,
  hasRequiredRuntimeEnv,
} from "@/lib/env";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "샐러리잡 — 퇴근 후에도, 은퇴 후에도, 산뜻한 샐러리",
    template: "%s | 샐러리잡",
  },
  description:
    "샐러리잡(SalaryJob)은 셀러리처럼 산뜻한 또 하나의 샐러리를 연결하는 로컬 잡 플랫폼입니다. 퇴근 후 빈 시간, 주말 오전, 은퇴 후 여유 — 내게 맞는 일만 골라 이력서 없이 바로 지원하고 근무 후 즉시 정산받으세요.",
  keywords: [
    "샐러리잡",
    "SalaryJob",
    "셀러리",
    "추가 수입",
    "은퇴 후 일자리",
    "퇴근 후 부업",
    "투잡",
    "내 주변 알바",
    "단기 알바",
    "당일 알바",
    "즉시 정산",
    "이력서 없는 알바",
  ],
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
  const envReady = hasRequiredRuntimeEnv();
  const missingKeys = getMissingRuntimeEnvKeys();

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
        {envReady ? (
          <>
            <ServiceWorkerRegistrar />
            {children}
            <Toaster position="top-center" />
          </>
        ) : (
          <main className="flex min-h-screen items-center justify-center bg-[#f5fbf6] px-6 py-16 text-slate-900">
            <section className="w-full max-w-3xl rounded-[28px] border border-[#dceadf] bg-white p-8 sm:p-10">
              <div className="inline-flex rounded-full border border-[#dceadf] bg-[#eaf8ee] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1e6f3d]">
                Lovable setup required
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                Supabase and database variables are not configured yet.
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
                This repo now contains the full Next.js app, but Lovable cannot
                boot it until the required environment variables are added to
                the project settings.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Add these variables in Lovable
                  </h2>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {missingKeys.map((key) => (
                      <li
                        key={key}
                        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 font-mono text-[13px]"
                      >
                        {key}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-[#dceadf] bg-[#eaf8ee] p-5">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Where to get them
                  </h2>
                  <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                    <li>
                      1. Open Supabase Dashboard → Project Settings → API.
                    </li>
                    <li>
                      2. Copy the project URL and publishable key.
                    </li>
                    <li>
                      3. Copy the service role key and database connection
                      string.
                    </li>
                    <li>
                      4. Paste them into Lovable environment variables, then
                      reload the app.
                    </li>
                  </ol>
                  <a
                    href="https://supabase.com/dashboard/project/_/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex rounded-full bg-[#41b66e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2f9e59]"
                  >
                    Open Supabase API Settings
                  </a>
                </div>
              </div>
              <p className="mt-6 text-xs leading-5 text-slate-500">
                Reference values and variable names are documented in
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
                  .env.example
                </code>
                at the repo root.
              </p>
            </section>
          </main>
        )}
      </body>
    </html>
  );
}

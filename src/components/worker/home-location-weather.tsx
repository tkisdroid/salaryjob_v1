"use client";

import { useEffect, useState } from "react";

// WMO weather codes (https://open-meteo.com/en/docs) mapped to a single
// readable emoji per condition family. Unknown codes fall back to the
// server-provided time-of-day emoji.
const WEATHER_EMOJI: Record<number, string> = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌦️",
  56: "🌧️",
  57: "🌧️",
  61: "🌧️",
  63: "🌧️",
  65: "🌧️",
  66: "🌧️",
  67: "🌧️",
  71: "❄️",
  73: "❄️",
  75: "❄️",
  77: "❄️",
  80: "🌦️",
  81: "🌧️",
  82: "🌧️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

interface Props {
  fallbackEmoji: string;
}

interface AdminEntry {
  adminLevel?: number;
  name?: string;
}

interface ReverseGeocode {
  locality?: string;
  city?: string;
  localityInfo?: { administrative?: AdminEntry[] };
}

async function fetchWeatherEmoji(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=weather_code&timezone=auto`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: { current?: { weather_code?: unknown } } = await res.json();
    const code = data?.current?.weather_code;
    return typeof code === "number" ? (WEATHER_EMOJI[code] ?? null) : null;
  } catch {
    return null;
  }
}

async function fetchDistrict(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ko`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data: ReverseGeocode = await res.json();
    // BigDataCloud's adminLevel numbering varies by country (Korea tends to
    // return 5 for 구 and 8 for 동, not 3/4), so match by Korean suffix
    // instead: "~구|~군" for the municipal tier and "~동|~읍|~면" for the
    // neighborhood tier. `locality` often carries the 동 name directly.
    // `locality` first — BigDataCloud's best guess at the user's nearest
    // neighborhood, closer to what they'd actually say aloud than the
    // first-listed 행정동 in the admin array.
    const candidates: string[] = [
      ...(data?.locality ? [data.locality] : []),
      ...(data?.localityInfo?.administrative ?? [])
        .map((a) => a.name)
        .filter((n): n is string => Boolean(n)),
      ...(data?.city ? [data.city] : []),
    ];

    const gu = candidates.find((n) => /^[가-힣]+[구군]$/.test(n));
    const dong = candidates.find((n) => /^[가-힣\d]+[동읍면]$/.test(n));

    const parts = [gu, dong].filter((p): p is string => Boolean(p));
    if (parts.length > 0) return parts.join(" ");
    // Last resort: trust `locality` if it looks like a Korean place name,
    // even if the suffix pattern didn't match (e.g. 세종, 제주 special cases).
    if (data?.locality && /[가-힣]/.test(data.locality)) return data.locality;
    return null;
  } catch {
    return null;
  }
}

export function HomeLocationWeather({ fallbackEmoji }: Props) {
  const [emoji, setEmoji] = useState(fallbackEmoji);
  const [district, setDistrict] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const [weather, dist] = await Promise.all([
          fetchWeatherEmoji(latitude, longitude),
          fetchDistrict(latitude, longitude),
        ]);
        if (cancelled) return;
        if (weather) setEmoji(weather);
        if (dist) setDistrict(dist);
      },
      () => {
        // Permission denied or unavailable — keep fallback emoji, no district.
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 600_000 },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[20px] leading-none" aria-hidden>
        {emoji}
      </span>
      {district && (
        <span className="text-[11.5px] font-medium text-muted-foreground">
          {district}
        </span>
      )}
    </span>
  );
}

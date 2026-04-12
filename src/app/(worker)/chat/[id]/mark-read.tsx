"use client";

import { useEffect } from "react";

const STORAGE_KEY = "gignow.chat.readRooms";

export function MarkChatRead({ roomId }: { roomId: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const set: string[] = raw ? JSON.parse(raw) : [];
      if (!set.includes(roomId)) {
        set.push(roomId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(set));
      }
    } catch {
      // localStorage unavailable
    }
  }, [roomId]);

  return null;
}

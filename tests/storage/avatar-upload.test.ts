import { describe, it } from "vitest";

describe.skip("Phase 3 — Supabase Storage avatar upload (D-01)", () => {
  describe("bucket setup", () => {
    it.todo("storage.buckets has a row with id='public' and public=true");
    it.todo("storage.objects has 4 RLS policies for the avatars/ path");
  });

  describe("uploadAvatar Server Action", () => {
    it.todo("rejects files over 5MB");
    it.todo("rejects MIME types outside jpeg/png/webp");
    it.todo("uploads to avatars/{userId}/avatar.{ext} with upsert: true");
    it.todo("returns the public URL and writes it to WorkerProfile.avatar");
  });
});

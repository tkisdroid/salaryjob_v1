import { describe, it, expect } from "vitest";
import { AVATAR_BUCKET, uploadAvatarFile } from "@/lib/supabase/storage";

// Helper: make an in-memory File from bytes
function makeFile(content: Uint8Array, name: string, type: string): File {
  // node File polyfill — Vitest 3 runs in node env; File is global in Node 20+
  return new File([content], name, { type });
}

describe("Phase 3 — Supabase Storage avatar upload (D-01)", () => {
  describe("bucket configuration", () => {
    it("AVATAR_BUCKET constant equals 'public'", () => {
      expect(AVATAR_BUCKET).toBe("public");
    });
  });

  describe("server-side validation — size cap", () => {
    it("rejects a 6MB file with size error", async () => {
      const sixMB = new Uint8Array(6 * 1024 * 1024);
      const file = makeFile(sixMB, "big.jpg", "image/jpeg");
      const result = await uploadAvatarFile("test-user-id", file);
      expect(result).toHaveProperty("error");
      if ("error" in result) {
        expect(result.error).toContain("5MB");
      }
    });

    it("rejects an empty file", async () => {
      const empty = new Uint8Array(0);
      const file = makeFile(empty, "empty.jpg", "image/jpeg");
      const result = await uploadAvatarFile("test-user-id", file);
      expect(result).toHaveProperty("error");
      if ("error" in result) {
        expect(result.error).toContain("파일을 선택");
      }
    });
  });

  describe("server-side validation — MIME", () => {
    it("rejects text/plain", async () => {
      const bytes = new TextEncoder().encode("not an image");
      const file = makeFile(bytes, "fake.txt", "text/plain");
      const result = await uploadAvatarFile("test-user-id", file);
      expect(result).toHaveProperty("error");
      if ("error" in result) {
        expect(result.error).toMatch(/JPEG|PNG|WebP/);
      }
    });

    it("rejects application/pdf", async () => {
      const bytes = new TextEncoder().encode("%PDF-1.4 fake");
      const file = makeFile(bytes, "fake.pdf", "application/pdf");
      const result = await uploadAvatarFile("test-user-id", file);
      expect(result).toHaveProperty("error");
    });
  });

  describe("path convention", () => {
    it("source file constructs avatars/{userId}/avatar.{ext} path for jpeg", async () => {
      // Static check: the source file must build the avatars/{userId}/avatar.jpg path.
      // A live Storage call would require a valid auth cookie, which is E2E territory.
      const fs = await import("node:fs/promises");
      const src = await fs.readFile("src/lib/supabase/storage.ts", "utf8");
      expect(src).toMatch(/avatars\/\$\{userId\}\/avatar/);
      expect(src).toContain("upsert: true");
    });

    it("source file whitelists exactly jpeg, png, webp", async () => {
      const fs = await import("node:fs/promises");
      const src = await fs.readFile("src/lib/supabase/storage.ts", "utf8");
      expect(src).toContain("image/jpeg");
      expect(src).toContain("image/png");
      expect(src).toContain("image/webp");
      // And NOT: gif, bmp, svg (common MIME types we intentionally exclude)
      expect(src).not.toContain("image/gif");
      expect(src).not.toContain("image/svg");
    });
  });

  // Real upload requires authenticated cookies → Playwright E2E
  it.todo(
    "E2E: authenticated worker uploads 1MB PNG and sees public URL in workerProfile.avatar",
  );
});

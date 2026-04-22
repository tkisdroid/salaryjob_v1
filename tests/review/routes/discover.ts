/**
 * tests/review/routes/discover.ts
 *
 * Phase 07.1 route enumeration (D-10).
 * Globs `src/app/**\/page.tsx` via fast-glob, drops route groups `(worker)` / `(biz)` / `(auth)`,
 * rewrites dynamic segments `[id]` -> `:id` and catch-alls `[...slug]` -> `*`.
 *
 * Invoked by:
 *   - tests/review/routes/manifest.ts (self-check ensures manifest covers every discovered route)
 *   - Can be run directly: `npx tsx tests/review/routes/discover.ts` prints the sorted list
 */

import fg from "fast-glob";

export async function discoverRoutes(): Promise<string[]> {
  const files = await fg("src/app/**/page.tsx", { cwd: process.cwd() });
  const routes = files.map((f) => {
    // normalize path separators (Windows -> POSIX)
    let route = f
      .replace(/\\/g, "/")
      .replace(/^src\/app/, "")
      .replace(/\/page\.tsx$/, "")
      // drop route groups like (worker), (biz), (auth)
      .replace(/\/\([^)]+\)/g, "");
    // catch-all: [...slug] or [[...slug]] -> *
    route = route.replace(/\/\[\[?\.\.\..*?\]\]?/g, "/*");
    // dynamic: [id] -> :id
    route = route.replace(/\[([^\]]+)\]/g, ":$1");
    // trim trailing slash; root stays "/"
    route = route.replace(/\/$/, "") || "/";
    return route;
  });
  return routes.sort();
}

// Run directly for manifest self-check / enumeration.
if (
  process.argv[1] &&
  (process.argv[1].endsWith("discover.ts") ||
    process.argv[1].endsWith("discover.js"))
) {
  void (async () => {
    const routes = await discoverRoutes();
    console.log(JSON.stringify(routes, null, 2));
    console.log(`\n[discover] ${routes.length} routes found.`);
  })();
}

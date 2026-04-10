import { test } from "@playwright/test";

test.describe.skip("POST-04 — public landing page job list", () => {
  test.skip("anonymous visitor sees job cards on /", async () => {
    // TODO 03-06: implement after landing page extension
  });

  test.skip("clicking Load More appends next 10 jobs", async () => {
    // TODO 03-06
  });

  test.skip("clicking a job card navigates to /posts/{id} without login", async () => {
    // TODO 03-06
  });
});

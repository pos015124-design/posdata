import { describe, it, expect, beforeAll } from "vitest";

const BASE_URL = process.env.DROIDBOT_TEST_URL || "http://localhost:3000";

describe("GET /", () => {
  it("returns 200 and renders Bhaby page", async () => {
    const res = await fetch(`${BASE_URL}/`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Bhaby");
    expect(html).toContain("nav-bar");
  });
});

describe("GET /api/download-count", () => {
  it("returns 200 with { count: number }", async () => {
    const res = await fetch(`${BASE_URL}/api/download-count`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data.count).toBe("number");
    expect(data.count).toBeGreaterThanOrEqual(0);
  });
});

describe("POST /api/track-download", () => {
  it("happy path: increments count with valid platform", async () => {
    const before = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "android" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(before.count + 1);
  });

  it("happy path: works with desktop platform", async () => {
    const before = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "desktop" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(before.count + 1);
  });

  it("happy path: works without platform (defaults to unknown)", async () => {
    const before = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(before.count + 1);
  });

  it("validation: invalid platform returns 400 with error", async () => {
    const before = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "windows" }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();

    // Count should NOT have changed
    const after = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    expect(after.count).toBe(before.count);
  });

  it("validation: invalid JSON body returns 400 with error", async () => {
    const before = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json {{{",
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();

    // Count should NOT have changed
    const after = await fetch(`${BASE_URL}/api/download-count`).then((r) => r.json());
    expect(after.count).toBe(before.count);
  });

  it("returns 405 for GET method", async () => {
    const res = await fetch(`${BASE_URL}/api/track-download`);
    expect(res.status).toBe(405);
  });

  it("returns 405 for PUT method", async () => {
    const res = await fetch(`${BASE_URL}/api/track-download`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "android" }),
    });
    expect(res.status).toBe(405);
  });
});

describe("GET /bhaby-eshop.apk", () => {
  it("serves the APK file", async () => {
    const res = await fetch(`${BASE_URL}/bhaby-eshop.apk`);
    expect(res.status).toBe(200);
  });
});

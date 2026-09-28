/**
 * End-to-end API smoke test.
 * Starts the production server, exercises the full user + moderation flow,
 * then shuts down. Run: node scripts/smoke-test.mjs
 */
import { spawn } from "node:child_process";

const BASE = "http://localhost:3000";
const results = [];
let server;

function check(name, condition, detail = "") {
  results.push({ name, pass: condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fetch(`${BASE}/api/kudos`);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
}

function makeClient() {
  let cookie = null;
  return {
    async call(path, { method = "GET", body } = {}) {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) cookie = setCookie.split(";")[0];
      let data = null;
      try {
        data = await res.json();
      } catch {}
      return { status: res.status, data };
    },
  };
}

async function main() {
  console.log("Starting production server...");
  server = spawn("npx", ["next", "start"], {
    cwd: process.cwd(),
    shell: true,
    stdio: "ignore",
  });

  if (!(await waitForServer())) {
    console.error("Server did not start in time.");
    process.exitCode = 1;
    return;
  }
  console.log("Server ready.\n");

  // --- Employee flow (Alice) ---
  const alice = makeClient();

  let r = await alice.call("/api/auth/login", {
    method: "POST",
    body: { email: "alice@datacom.test", password: "password123" },
  });
  check("employee login (200)", r.status === 200, `status=${r.status}`);

  r = await alice.call("/api/auth/login", {
    method: "POST",
    body: { email: "alice@datacom.test", password: "wrong" },
  });
  check("bad password rejected (401)", r.status === 401, `status=${r.status}`);

  r = await alice.call("/api/users");
  const users = r.data?.users ?? [];
  check("colleague list (200, excludes self)", r.status === 200 && users.length === 5, `count=${users.length}`);
  const bob = users.find((u) => u.email === "bob@datacom.test");
  const aliceSelf = users.find((u) => u.email === "alice@datacom.test");
  check("self excluded from colleague list", !aliceSelf);

  r = await alice.call("/api/kudos", {
    method: "POST",
    body: { recipientId: bob.id, message: "Smoke test kudos — great work!" },
  });
  check("create kudos (201)", r.status === 201, `status=${r.status}`);
  const kudosId = r.data?.kudos?.id;

  r = await alice.call("/api/kudos", {
    method: "POST",
    body: { recipientId: bob.id, message: "Smoke test kudos — great work!" },
  });
  check("duplicate rejected (409)", r.status === 409, `status=${r.status}`);

  r = await alice.call("/api/kudos", {
    method: "POST",
    body: { recipientId: aliceSelf ? aliceSelf.id : "00000000-0000-0000-0000-000000000000", message: "self send" },
  });
  // Alice is excluded from her own list, so use her known id from login instead
  r = await alice.call("/api/kudos", {
    method: "POST",
    body: { recipientId: "4aed4303-9c39-40fd-b550-5bd1f5f4b2cf", message: "self send attempt" },
  });
  check("self-send rejected (400)", r.status === 400, `status=${r.status}`);

  r = await alice.call("/api/kudos", {
    method: "POST",
    body: { recipientId: bob.id, message: "   " },
  });
  check("empty message rejected (400)", r.status === 400, `status=${r.status}`);

  r = await alice.call("/api/kudos");
  const feed = r.data?.items ?? [];
  check(
    "feed shows new kudos (200)",
    r.status === 200 && feed.some((k) => k.id === kudosId),
    `items=${feed.length}`
  );

  // --- Employee cannot moderate ---
  r = await alice.call(`/api/kudos/${kudosId}/moderate`, {
    method: "PATCH",
    body: { action: "hide", reason: "should not work" },
  });
  check("employee moderation forbidden (403)", r.status === 403, `status=${r.status}`);

  r = await alice.call(`/api/kudos/${kudosId}`, {
    method: "DELETE",
    body: { reason: "should not work" },
  });
  check("employee delete forbidden (403)", r.status === 403, `status=${r.status}`);

  r = await alice.call("/api/kudos?includeHidden=true");
  check("employee includeHidden forbidden (403)", r.status === 403, `status=${r.status}`);

  // --- Admin flow (Ada) ---
  const admin = makeClient();

  r = await admin.call("/api/auth/login", {
    method: "POST",
    body: { email: "admin@datacom.test", password: "password123" },
  });
  check("admin login (200)", r.status === 200, `status=${r.status}`);

  r = await admin.call(`/api/kudos/${kudosId}/moderate`, {
    method: "PATCH",
    body: { action: "hide", reason: "Inappropriate content in smoke test" },
  });
  check("admin hide kudos (200)", r.status === 200 && r.data?.kudos?.isVisible === false, `status=${r.status}`);

  r = await admin.call("/api/kudos?includeHidden=true");
  const adminFeed = r.data?.items ?? [];
  const hidden = adminFeed.find((k) => k.id === kudosId);
  check(
    "admin sees hidden kudos with reason",
    r.status === 200 && hidden && hidden.isVisible === false && hidden.reasonForModeration,
    `reason="${hidden?.reasonForModeration}"`
  );

  r = await alice.call("/api/kudos");
  check(
    "hidden kudos gone from employee feed",
    !(r.data?.items ?? []).some((k) => k.id === kudosId)
  );

  r = await admin.call(`/api/kudos/${kudosId}/moderate`, {
    method: "PATCH",
    body: { action: "unhide", reason: "Restored after review" },
  });
  check("admin unhide kudos (200)", r.status === 200 && r.data?.kudos?.isVisible === true, `status=${r.status}`);

  r = await alice.call("/api/kudos");
  check(
    "unhidden kudos back in employee feed",
    (r.data?.items ?? []).some((k) => k.id === kudosId)
  );

  r = await admin.call(`/api/kudos/${kudosId}`, {
    method: "DELETE",
    body: { reason: "Smoke test cleanup" },
  });
  check("admin delete kudos (204)", r.status === 204, `status=${r.status}`);

  r = await admin.call("/api/kudos?includeHidden=true");
  check(
    "deleted kudos gone for admin too",
    !(r.data?.items ?? []).some((k) => k.id === kudosId)
  );

  // --- Unauthenticated access ---
  const anon = makeClient();
  r = await anon.call("/api/kudos");
  check("unauthenticated feed rejected (401)", r.status === 401, `status=${r.status}`);

  // --- Summary ---
  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill();
  });

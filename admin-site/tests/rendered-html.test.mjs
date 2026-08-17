import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the loan admin shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Anole Loan — In-house Collections<\/title>/i);
  assert.match(html, /<iframe[^>]+src=["']\/admin\.html["']/i);
  assert.match(html, /title=["']Anole Loan Admin Platform["']/i);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("ships the database-aligned admin prototype", async () => {
  const admin = await readFile(new URL("../public/admin.html", import.meta.url), "utf8");
  assert.match(admin, /LOAN APPLICATIONS \(loan_apply_order\)/);
  assert.match(admin, /Daily Records \(loan_overdue_info\)/);
  assert.match(admin, /id="pi-code"/);
  assert.match(admin, /id="pi-related-code"/);
  assert.match(admin, /productId:loan\.productId/);
  assert.match(admin, /roundingRule:'DOWN'/);
  assert.doesNotMatch(admin, /id="lp-max-total-days"|id="lp-default-installments"|id="lp-max-overdue-days"|id="lp-overdue-cap"/);
});

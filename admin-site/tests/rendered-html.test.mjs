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

test("server-renders the protected login screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Anole Loan — In-house Collections<\/title>/i);
  assert.match(html, /登录运营工作台/i);
  assert.match(html, /仅限授权人员/i);
  assert.doesNotMatch(html, /<iframe[^>]+src=["']\/admin\.html["']/i);
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
  assert.match(admin, /status:Number\(p\.state\)/);
  assert.match(admin, /id="lp-allocation-rule"/);
  assert.match(admin, /JSON\.stringify\(p\.repay_allocation_rule\|\|\{\}\)/);
  assert.doesNotMatch(admin, /p\.state===10\?1:0/);
  assert.match(admin, /id:Number\(r\.id\), productId:Number\(r\.product_id\)/);
  assert.match(admin, /Number\(x\.id\)===Number\(id\)/);
  assert.match(admin, /saveConfigToDatabase\('paymentInstitution'/);
  assert.match(admin, /saveConfigToDatabase\('loanProduct'/);
  assert.match(admin, /saveConfigToDatabase\('termRule'/);
  assert.doesNotMatch(admin, /!productId \|\| !min \|\| !max \|\| !terms \|\| !def/);
  assert.doesNotMatch(admin, /id="lp-max-total-days"|id="lp-default-installments"|id="lp-max-overdue-days"|id="lp-overdue-cap"/);
});

test("configuration mutations are authenticated and database-backed", async () => {
  const route = await readFile(new URL("../app/api/config/route.ts", import.meta.url), "utf8");
  assert.match(route, /isAuthenticated\(request\.cookies\.get\(SESSION_COOKIE\)/);
  assert.match(route, /UPDATE loan_payment_institution/);
  assert.match(route, /UPDATE loan_product SET/);
  assert.match(route, /UPDATE loan_product_term_rule SET/);
  assert.match(route, /is_del=UNIX_TIMESTAMP\(\)/);
  assert.doesNotMatch(route, /request[^\n]*sql|body\.sql/i);
});

import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.RESPONSIVE_BASE_URL ?? "http://localhost:3000";
const outputDir = "responsive-check-output";
const viewports = [375, 390, 414, 428, 768];
const portalToken = process.env.RESPONSIVE_PORTAL_TOKEN;
const portalClientId = process.env.RESPONSIVE_PORTAL_CLIENT_ID;
let testEmail = process.env.RESPONSIVE_TEST_EMAIL;
let testPassword = process.env.RESPONSIVE_TEST_PASSWORD;
let authSetupError = "";
let devServer;

const staticRoutes = [
  { name: "landing", path: "/", auth: false },
  { name: "login", path: "/login", auth: false },
  { name: "register", path: "/register", auth: false },
  { name: "forgot-password", path: "/forgot-password", auth: false },
  { name: "terms", path: "/terms", auth: false },
  { name: "privacy", path: "/privacy", auth: false },
  { name: "dashboard", path: "/dashboard", auth: true },
  { name: "clients", path: "/clients", auth: true },
  { name: "new-client", path: "/clients/new", auth: true },
  { name: "documents", path: "/documents", auth: true },
  { name: "notices", path: "/notices", auth: true },
  { name: "new-notice", path: "/notices/new", auth: true },
  { name: "gst", path: "/gst", auth: true },
  { name: "gst-reconcile", path: "/gst/reconcile", auth: true },
  { name: "calendar", path: "/calendar", auth: true },
  { name: "billing", path: "/billing", auth: true },
  { name: "invoices", path: "/billing/invoices", auth: true },
  { name: "analytics", path: "/analytics", auth: true },
  { name: "settings", path: "/settings", auth: true },
];

function pageName(path) {
  return path === "/" ? "landing" : path.replace(/^\//, "").replaceAll("/", "-");
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok || response.status < 500) return;
    } catch {
      // Keep polling while Next starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Dev server did not become available at ${baseUrl}`);
}

function startDevServer() {
  if (process.env.START_DEV_SERVER !== "1") return;
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/c", "npm.cmd run dev -- -H 127.0.0.1 -p 3000"]
    : ["run", "dev", "--", "-H", "127.0.0.1", "-p", "3000"];
  devServer = spawn(command, args, {
    stdio: "pipe",
    shell: false,
  });
}

async function login(page) {
  if (!testEmail || !testPassword) return false;
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email address").fill(testEmail);
  await page.getByLabel("Password").fill(testPassword);
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  return true;
}

async function discoverDynamicRoutes(page, authenticated) {
  if (!authenticated) return [];
  const [clientId, noticeId, gstId, invoiceId] = await page.evaluate(async () => {
    const readFirstId = async (url) => {
      const response = await fetch(url);
      const body = await response.json();
      return body.data?.data?.[0]?.id ?? null;
    };
    return Promise.all([
      readFirstId("/api/clients?pageSize=1"),
      readFirstId("/api/notices?pageSize=1"),
      readFirstId("/api/gst/reconcile?pageSize=1"),
      readFirstId("/api/billing/invoices?pageSize=1"),
    ]);
  });

  return [
    ["client-detail", "/clients/", clientId],
    ["notice-detail", "/notices/", noticeId],
    ["gst-detail", "/gst/", gstId],
    ["invoice-detail", "/billing/", invoiceId],
  ]
    .filter(([, , id]) => id)
    .map(([name, prefix, id]) => ({ name, path: `${prefix}${id}`, auth: true }));
}

async function checkRoute(browser, route, authenticated, storageState) {
  const results = [];
  const context = await browser.newContext(storageState ? { storageState } : undefined);
  const page = await context.newPage();
  const loggedIn = route.auth ? authenticated : true;

  for (const width of viewports) {
    const messages = [];
    const onConsole = (message) => {
      if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
    };
    const onPageError = (error) => messages.push(`pageerror: ${error.message}`);
    page.on("console", onConsole);
    page.on("pageerror", onPageError);
    await page.setViewportSize({ width, height: 800 });

    let navigationError = "";
    try {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForTimeout(500);
    } catch (error) {
      navigationError = error.message;
      await page.waitForTimeout(1_000);
    }

    const metrics = await page.evaluate(() => ({
      htmlOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      actualPath: location.pathname,
    }));
    const directory = `${outputDir}/${pageName(route.name)}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/${width}.png`, fullPage: true });
    results.push({
      page: route.name,
      route: route.path,
      width,
      loggedIn,
      actualPath: metrics.actualPath,
      overflow: Math.max(0, metrics.htmlOverflow, metrics.bodyOverflow),
      consoleErrors: [...new Set(navigationError ? [...messages, `navigation: ${navigationError}`] : messages)],
    });
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
  return results;
}

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  startDevServer();
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const authContext = await browser.newContext();
  const authPage = await authContext.newPage();
  let authenticated = false;
  try {
    authenticated = await login(authPage);
  } catch (error) {
    authSetupError = error.message;
  }
  const dynamicRoutes = await discoverDynamicRoutes(authPage, authenticated);
  const storageState = authenticated ? await authContext.storageState() : undefined;
  await authPage.close();
  await authContext.close();

  const portalRoutes = [
    ...(portalToken ? [{ name: "portal-invite", path: `/portal/join/${portalToken}`, auth: false }] : []),
    ...(portalClientId ? [
      { name: "portal-dashboard", path: `/portal/dashboard/${portalClientId}`, auth: false },
      { name: "portal-upload", path: `/portal/upload/${portalClientId}`, auth: false },
    ] : []),
  ];
  const skipped = [
    ...(!portalToken ? [{ name: "portal-invite", route: "/portal/join/[token]", reason: "Set RESPONSIVE_PORTAL_TOKEN to test a real invite." }] : []),
    ...(!portalClientId ? [
      { name: "portal-dashboard", route: "/portal/dashboard/[clientId]", reason: "Set RESPONSIVE_PORTAL_CLIENT_ID to test portal data." },
      { name: "portal-upload", route: "/portal/upload/[clinetId]", reason: "Set RESPONSIVE_PORTAL_CLIENT_ID to test portal data." },
    ] : []),
    ...(!authenticated ? [{ name: "authenticated-routes", route: "dashboard and detail routes", reason: `Authentication unavailable: ${authSetupError || "set RESPONSIVE_TEST_EMAIL and RESPONSIVE_TEST_PASSWORD."}` }] : []),
  ];

  const allResults = [];
  const routesToCheck = [
    ...staticRoutes.filter((route) => !route.auth || authenticated),
    ...dynamicRoutes,
    ...portalRoutes,
  ];
  for (const route of routesToCheck) {
    console.log(`Checking ${route.name}...`);
    allResults.push(...(await checkRoute(browser, route, authenticated, storageState)));
  }
  await writeFile(`${outputDir}/summary.json`, JSON.stringify({ results: allResults, skipped }, null, 2));

  console.log("page | width | overflow | console errors");
  for (const result of allResults) {
    console.log(`${result.page} | ${result.width} | ${result.overflow ? `${result.overflow}px` : "no"} | ${result.consoleErrors.length ? "yes" : "no"}`);
  }
  if (skipped.length) {
    console.log("\nSkipped routes:");
    for (const item of skipped) console.log(`- ${item.name} (${item.route}): ${item.reason}`);
  }
  await browser.close();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => devServer?.kill());

// Captures a screenshot of every app module for the marketing site.
// Usage: node scripts/capture-screenshots.mjs   (serve apps/web/out on :3737 first)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:3737';
const OUT = 'website/screenshots';

// Admin session injected into the Zustand persist key — the store merges this
// over seed data, so all collections (products, sales, staff…) stay populated.
const SESSION = {
  state: {
    currentUser: {
      id: 'u-admin',
      email: 'admin@ashletrato.com',
      firstName: 'Simone',
      lastName: 'Reyes',
      role: 'super_admin',
      branchId: 'br-greenhills',
      canAuthorizeVoids: true,
      pin: '',
    },
    locked: false,
    viewBranchId: 'all',
  },
  version: 3,
};

const SHOTS = [
  ['pos', '/pos/', 'Point of Sale'],
  ['dashboard', '/dashboard/', 'Dashboard'],
  ['sales', '/sales/', 'Transactions'],
  ['products', '/products/', 'Products'],
  ['services', '/services/', 'Services'],
  ['production', '/production/', 'Production'],
  ['inventory', '/inventory/', 'Inventory'],
  ['customers', '/customers/', 'Customers'],
  ['promotions', '/promotions/', 'Promotions'],
  ['reports', '/reports/', 'Reports'],
  ['users', '/users/', 'Staff & Roles'],
  ['hr', '/hr/', 'HR & Payroll'],
  ['branches', '/branches/', 'Branches'],
  ['settings', '/settings/', 'Settings'],
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

// Inject the session before any app code runs.
await page.addInitScript(
  ([key, value]) => localStorage.setItem(key, JSON.stringify(value)),
  ['simmy-pos', SESSION],
);

for (const [name, route, label] of SHOTS) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900); // let charts/fonts settle
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`✓ ${label.padEnd(14)} ${name}.png`);
}

await browser.close();
console.log(`\nDone — ${SHOTS.length} screenshots in ${OUT}/`);

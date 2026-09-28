import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createAvatar } from "@dicebear/core";
import * as lorelei from "@dicebear/lorelei";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Illustrated avatars (DiceBear "Lorelei", CC0), written to /public so they can be
// swapped for real photos. These are COMMITTED, not gitignored: the deployed
// build serves them as static assets and never runs this seed.
// npm scripts run from the project root, so cwd is the project root.
const AVATAR_DIR = path.join(process.cwd(), "public", "avatars");

/** Writes a deterministic avatar for `name` and returns its public URL. */
function writeAvatar(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const svg = createAvatar(lorelei, {
    seed: name,
    backgroundColor: ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
  }).toString();
  writeFileSync(path.join(AVATAR_DIR, `${slug}.svg`), svg);
  return `/avatars/${slug}.svg`;
}

// ---------------------------------------------------------------------------
// Deterministic randomness: same shape of data on every run. All dates are
// relative to the day you run the seed, so "active in the last 35 days" holds.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260921);
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)];

const NOW = new Date();

/** Noon UTC on `day` of the month that is `n` months before the current one. */
function monthsAgo(n: number, day = 1): Date {
  return new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - n, day, 12));
}

// ---------------------------------------------------------------------------
// Vendor catalog. `prices` is the vendor's list-price history: [effective
// monthsAgo, cents], oldest first (null = since forever). Subscriptions that
// started after a change simply start at the new price.
// ---------------------------------------------------------------------------
interface VendorSpec {
  category: string;
  prices: Array<[number | null, number]>;
}

const VENDORS: Record<string, VendorSpec> = {
  Claude: { category: "AI Tools", prices: [[null, 2000], [8, 2500]] },
  GPT: { category: "AI Tools", prices: [[null, 2000], [11, 2500]] },
  Cursor: { category: "Developer Tools", prices: [[null, 2000]] },
  GitHub: { category: "Developer Tools", prices: [[null, 1000], [9, 1900]] },
  Linear: { category: "Project Management", prices: [[null, 800], [7, 1000]] },
  Datadog: { category: "Infrastructure", prices: [[null, 1500], [12, 2300]] },
  Vercel: { category: "Infrastructure", prices: [[null, 2000]] },
  Figma: { category: "Design", prices: [[null, 1200], [14, 1500], [5, 2000]] },
  Canva: { category: "Design", prices: [[null, 1299], [10, 1500]] },
  Notion: { category: "Productivity", prices: [[null, 800], [12, 1000]] },
  Slack: { category: "Communication", prices: [[null, 725], [18, 875], [6, 1000]] },
  Zoom: { category: "Communication", prices: [[null, 1599]] },
  Loom: { category: "Productivity", prices: [[null, 1250]] },
  Grammarly: { category: "Productivity", prices: [[null, 1200], [9, 1500]] },
  HubSpot: { category: "Sales & Marketing", prices: [[null, 5000], [13, 9000]] },
  Mailchimp: { category: "Sales & Marketing", prices: [[null, 1300], [9, 2000]] },
  Semrush: { category: "Sales & Marketing", prices: [[null, 12995]] },
  "Apollo.io": { category: "Sales & Marketing", prices: [[null, 4900], [7, 5900]] },
  "LinkedIn Sales Navigator": { category: "Sales & Marketing", prices: [[null, 9999], [8, 10999]] },
  Salesforce: { category: "CRM", prices: [[null, 7500], [10, 8000]] },
  Amplitude: { category: "Analytics", prices: [[null, 4900], [6, 6100]] },
  Miro: { category: "Product", prices: [[null, 800], [11, 1600]] },
};

// ---------------------------------------------------------------------------
// One-off (non-subscription) spend pools by team: [vendor, category, min, max cents]
// ---------------------------------------------------------------------------
type OneOff = [string, string, number, number];
const TRAVEL: OneOff[] = [
  ["United Airlines", "Travel", 28000, 68000],
  ["Delta Air Lines", "Travel", 24000, 72000],
  ["Marriott", "Travel", 18000, 54000],
  ["Hilton", "Travel", 16000, 48000],
  ["Airbnb", "Travel", 22000, 60000],
  ["Uber", "Travel", 1800, 7500],
  ["Lyft", "Travel", 1500, 6500],
];
const ONE_OFF_POOLS: Record<string, OneOff[]> = {
  Engineering: [
    ["Amazon Business", "Office & Equipment", 2500, 42000],
    ["Amazon Business", "Office & Equipment", 2500, 42000],
    ["Apple", "Hardware", 12900, 249900],
    ["Eventbrite", "Events", 29900, 149900],
    ["DoorDash", "Meals & Entertainment", 2400, 9800],
    ...TRAVEL,
  ],
  Marketing: [
    ["Eventbrite", "Events", 9900, 59900],
    ["Google Ads", "Advertising", 50000, 400000],
    ["Google Ads", "Advertising", 50000, 400000],
    ["Upwork", "Contractors", 45000, 320000],
    ["Fiverr", "Contractors", 8000, 60000],
    ["Printful", "Marketing Materials", 4500, 38000],
    ["DoorDash", "Meals & Entertainment", 2400, 9800],
    ...TRAVEL,
  ],
  Sales: [
    ["DoorDash", "Meals & Entertainment", 3800, 22000],
    ["Amazon Business", "Office & Equipment", 1800, 12000],
    ...TRAVEL,
    ...TRAVEL,
    ...TRAVEL,
  ],
  Product: [
    ["UserTesting", "Research", 40000, 180000],
    ["Eventbrite", "Events", 9900, 59900],
    ["Amazon Business", "Office & Equipment", 2500, 30000],
    ["Upwork", "Contractors", 45000, 260000],
    ["DoorDash", "Meals & Entertainment", 2400, 9800],
    ...TRAVEL,
  ],
};

// ---------------------------------------------------------------------------
// People. startAgo / endAgo / departedAgo are whole months before today.
// A sub without endAgo is still being charged; if its owner has departed, it
// is an orphan. `card` indexes into the person's cards (default 0).
// ---------------------------------------------------------------------------
type CardKind = "team" | "company1" | "company2" | "person";

interface SubSpec {
  vendor: string;
  startAgo: number;
  endAgo?: number;
  card?: number;
  upgrade?: { monthsAgo: number; cents: number };
}

interface PersonSpec {
  name: string;
  role: string;
  team: string;
  startAgo: number;
  departedAgo?: number;
  cards: CardKind[];
  oneOffs: number;
  subs: SubSpec[];
}

const PEOPLE: PersonSpec[] = [
  // ---- Engineering ----
  {
    name: "Priya Raman", role: "Engineering Manager", team: "Engineering", startAgo: 30,
    cards: ["team", "company1"], oneOffs: 5,
    subs: [
      { vendor: "Claude", startAgo: 18 },
      { vendor: "GitHub", startAgo: 23 },
      { vendor: "Linear", startAgo: 20, card: 1 },
      { vendor: "Slack", startAgo: 23 },
      { vendor: "Zoom", startAgo: 14, endAgo: 6 },
    ],
  },
  {
    name: "Marcus Chen", role: "Senior Software Engineer", team: "Engineering", startAgo: 28,
    cards: ["team"], oneOffs: 4,
    subs: [
      { vendor: "Cursor", startAgo: 14 },
      { vendor: "GitHub", startAgo: 21 },
      { vendor: "Claude", startAgo: 17, upgrade: { monthsAgo: 4, cents: 10000 } },
      { vendor: "GPT", startAgo: 12, endAgo: 3 },
    ],
  },
  {
    name: "Elena Voss", role: "Staff Engineer", team: "Engineering", startAgo: 40,
    cards: ["team", "person"], oneOffs: 6,
    subs: [
      { vendor: "Claude", startAgo: 19 },
      { vendor: "Cursor", startAgo: 11 },
      { vendor: "GitHub", startAgo: 23 },
      { vendor: "Linear", startAgo: 15, card: 1 },
      { vendor: "Datadog", startAgo: 9 },
    ],
  },
  {
    name: "Diego Alvarez", role: "Software Engineer", team: "Engineering", startAgo: 14,
    cards: ["team"], oneOffs: 3,
    subs: [
      { vendor: "GitHub", startAgo: 13 },
      { vendor: "Cursor", startAgo: 9 },
      { vendor: "GPT", startAgo: 10 },
      { vendor: "Notion", startAgo: 8, endAgo: 2 },
    ],
  },
  {
    // Departed, orphaned: three subs still charging, one he cancelled himself.
    name: "Tom Fischer", role: "Software Engineer", team: "Engineering", startAgo: 26, departedAgo: 3,
    cards: ["team", "company2"], oneOffs: 4,
    subs: [
      { vendor: "GitHub", startAgo: 22 },
      { vendor: "Claude", startAgo: 16, card: 1 },
      { vendor: "Cursor", startAgo: 10 },
      { vendor: "Notion", startAgo: 20, endAgo: 8 },
    ],
  },
  {
    // Departed, orphaned: four subs still charging, including infrastructure.
    name: "Aisha Bello", role: "DevOps Engineer", team: "Engineering", startAgo: 20, departedAgo: 5,
    cards: ["team", "company1"], oneOffs: 3,
    subs: [
      { vendor: "Datadog", startAgo: 19 },
      { vendor: "Vercel", startAgo: 15, card: 1 },
      { vendor: "GitHub", startAgo: 18 },
      { vendor: "Claude", startAgo: 12 },
    ],
  },

  // ---- Marketing ----
  {
    name: "Sofia Marino", role: "Head of Marketing", team: "Marketing", startAgo: 34,
    cards: ["team", "company1"], oneOffs: 8,
    subs: [
      { vendor: "HubSpot", startAgo: 22 },
      { vendor: "Semrush", startAgo: 18, card: 1 },
      { vendor: "Canva", startAgo: 16 },
      { vendor: "Notion", startAgo: 20 },
      { vendor: "Mailchimp", startAgo: 14, endAgo: 5 },
    ],
  },
  {
    name: "Jake Thompson", role: "Content Lead", team: "Marketing", startAgo: 22,
    cards: ["team"], oneOffs: 4,
    subs: [
      { vendor: "Grammarly", startAgo: 21 },
      { vendor: "Notion", startAgo: 20 },
      { vendor: "GPT", startAgo: 12 },
      { vendor: "Claude", startAgo: 9 },
    ],
  },
  {
    name: "Hannah Park", role: "Growth Marketer", team: "Marketing", startAgo: 16,
    cards: ["team"], oneOffs: 4,
    subs: [
      { vendor: "Amplitude", startAgo: 15 },
      { vendor: "Semrush", startAgo: 12 },
      { vendor: "Mailchimp", startAgo: 14 },
      { vendor: "GPT", startAgo: 10 },
      { vendor: "Loom", startAgo: 9, endAgo: 3 },
    ],
  },
  {
    // Departed, orphaned: design tools still billing.
    name: "Liam O'Connor", role: "Designer", team: "Marketing", startAgo: 12, departedAgo: 2,
    cards: ["team", "person"], oneOffs: 3,
    subs: [
      { vendor: "Figma", startAgo: 11 },
      { vendor: "Canva", startAgo: 10, card: 1 },
      { vendor: "GPT", startAgo: 8 },
    ],
  },
  {
    name: "Nadia Petrova", role: "Marketing Operations", team: "Marketing", startAgo: 10,
    cards: ["team"], oneOffs: 2,
    subs: [
      { vendor: "HubSpot", startAgo: 9 },
      { vendor: "Notion", startAgo: 9 },
      { vendor: "Zoom", startAgo: 8 },
      { vendor: "Claude", startAgo: 7 },
    ],
  },

  // ---- Sales ----
  {
    name: "Ben Carter", role: "VP of Sales", team: "Sales", startAgo: 36,
    cards: ["team", "company2"], oneOffs: 10,
    subs: [
      { vendor: "Salesforce", startAgo: 23, upgrade: { monthsAgo: 5, cents: 16500 } },
      { vendor: "LinkedIn Sales Navigator", startAgo: 20 },
      { vendor: "Zoom", startAgo: 18 },
      { vendor: "Slack", startAgo: 23, card: 1 },
      { vendor: "Apollo.io", startAgo: 12, endAgo: 4 },
    ],
  },
  {
    name: "Olivia Grant", role: "Account Executive", team: "Sales", startAgo: 24,
    cards: ["team"], oneOffs: 7,
    subs: [
      { vendor: "Salesforce", startAgo: 21 },
      { vendor: "LinkedIn Sales Navigator", startAgo: 17 },
      { vendor: "Apollo.io", startAgo: 13 },
      { vendor: "Loom", startAgo: 11 },
    ],
  },
  {
    name: "Raj Patel", role: "Account Executive", team: "Sales", startAgo: 18,
    cards: ["team"], oneOffs: 6,
    subs: [
      { vendor: "Salesforce", startAgo: 17 },
      { vendor: "LinkedIn Sales Navigator", startAgo: 14 },
      { vendor: "Zoom", startAgo: 10 },
      { vendor: "GPT", startAgo: 8, endAgo: 2 },
    ],
  },
  {
    // Departed cleanly: every subscription was cancelled before she left.
    name: "Chloe Dubois", role: "Sales Development Rep", team: "Sales", startAgo: 14, departedAgo: 4,
    cards: ["team"], oneOffs: 3,
    subs: [
      { vendor: "Apollo.io", startAgo: 13, endAgo: 5 },
      { vendor: "LinkedIn Sales Navigator", startAgo: 11, endAgo: 5 },
      { vendor: "Salesforce", startAgo: 13, endAgo: 5 },
    ],
  },
  {
    name: "Sam Whitaker", role: "Sales Operations", team: "Sales", startAgo: 15,
    cards: ["team"], oneOffs: 3,
    subs: [
      { vendor: "Salesforce", startAgo: 14 },
      { vendor: "HubSpot", startAgo: 12 },
      { vendor: "Notion", startAgo: 10 },
      { vendor: "Loom", startAgo: 8 },
    ],
  },

  // ---- Product ----
  {
    name: "Maya Krishnan", role: "Head of Product", team: "Product", startAgo: 32,
    cards: ["team", "company1"], oneOffs: 6,
    subs: [
      { vendor: "Amplitude", startAgo: 20 },
      { vendor: "Miro", startAgo: 22 },
      { vendor: "Notion", startAgo: 23 },
      { vendor: "Figma", startAgo: 18, card: 1 },
      { vendor: "Claude", startAgo: 10 },
      { vendor: "Linear", startAgo: 16 },
    ],
  },
  {
    name: "Noah Kim", role: "Product Manager", team: "Product", startAgo: 19,
    cards: ["team"], oneOffs: 4,
    subs: [
      { vendor: "Linear", startAgo: 18 },
      { vendor: "Miro", startAgo: 16 },
      { vendor: "Notion", startAgo: 17 },
      { vendor: "GPT", startAgo: 12, endAgo: 3 },
      { vendor: "Claude", startAgo: 10 },
    ],
  },
  {
    name: "Grace Liu", role: "Product Designer", team: "Product", startAgo: 13,
    cards: ["team"], oneOffs: 3,
    subs: [
      { vendor: "Figma", startAgo: 12 },
      { vendor: "Miro", startAgo: 10 },
      { vendor: "Loom", startAgo: 8 },
      { vendor: "Claude", startAgo: 7 },
    ],
  },
  {
    name: "Omar Haddad", role: "Product Analyst", team: "Product", startAgo: 8,
    cards: ["team"], oneOffs: 2,
    subs: [
      { vendor: "Amplitude", startAgo: 7 },
      { vendor: "Notion", startAgo: 7 },
      { vendor: "GPT", startAgo: 6 },
    ],
  },
];

// ---------------------------------------------------------------------------

function priceAt(vendor: string, date: Date, upgrade?: SubSpec["upgrade"]): number {
  if (upgrade && date >= monthsAgo(upgrade.monthsAgo, 1)) return upgrade.cents;
  let cents = VENDORS[vendor].prices[0][1];
  for (const [ago, price] of VENDORS[vendor].prices) {
    if (ago === null || date >= monthsAgo(ago, 1)) cents = price;
  }
  return cents;
}

interface ChargeInput {
  subscriptionId: number | null;
  personId: number | null;
  teamId: number | null;
  cardId: number;
  vendor: string;
  category: string;
  amountCents: number;
  date: Date;
}

/**
 * Recurring spend that lands on a team's shared card, where the statement says
 * only the vendor. Nobody is named on it, so it starts life unassigned.
 * `months` is how far back the billing runs.
 */
const SHARED_SPEND: Record<string, Array<{ vendor: string; cents: number; months: number }>> = {
  Engineering: [
    { vendor: "Notion", cents: 1000, months: 12 },
    { vendor: "Datadog", cents: 4500, months: 9 },
    { vendor: "Vercel", cents: 2000, months: 14 },
  ],
  Marketing: [
    { vendor: "Canva", cents: 1500, months: 11 },
    { vendor: "Figma", cents: 4500, months: 8 },
  ],
  Sales: [
    { vendor: "Zoom", cents: 1599, months: 13 },
    { vendor: "Notion", cents: 1000, months: 10 },
    { vendor: "Apollo.io", cents: 5900, months: 7 },
  ],
  Product: [
    { vendor: "Miro", cents: 1600, months: 12 },
    { vendor: "Amplitude", cents: 6100, months: 6 },
  ],
};

/** One-off spend on a shared card: no subscription, no obvious owner. */
const SHARED_ONE_OFFS: Record<string, Array<[string, string, number]>> = {
  Engineering: [["Apple", "Hardware", 189900], ["Amazon Business", "Office & Equipment", 24500]],
  Marketing: [["Eventbrite", "Events", 89900], ["Printful", "Marketing Materials", 32000]],
  Sales: [["Marriott", "Travel", 41200], ["DoorDash", "Meals & Entertainment", 18700]],
  Product: [["UserTesting", "Research", 120000]],
};

async function main() {
  mkdirSync(AVATAR_DIR, { recursive: true });

  // One statement empties every table, ignores foreign-key order via CASCADE,
  // and restarts the identity sequences so ids begin at 1 again — which is why
  // a URL like /people/6 still points at the same person after a reseed.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AssignmentRule", "Charge", "Subscription", "Card", "Account", "Person", "Team" RESTART IDENTITY CASCADE`,
  );

  const teamNames = ["Engineering", "Marketing", "Sales", "Product"];
  const teams = new Map<string, { id: number; accountId: number }>();
  for (const name of teamNames) {
    const team = await prisma.team.create({ data: { name } });
    const account = await prisma.account.create({
      data: { name: `${name} Team Budget`, type: "team", teamId: team.id },
    });
    teams.set(name, { id: team.id, accountId: account.id });
  }
  const company1 = await prisma.account.create({ data: { name: "Brex Corporate", type: "company" } });
  const company2 = await prisma.account.create({ data: { name: "Amex Business Platinum", type: "company" } });

  const usedLast4 = new Set<string>();
  const newLast4 = () => {
    let s: string;
    do s = String(randInt(1000, 9999));
    while (usedLast4.has(s));
    usedLast4.add(s);
    return s;
  };
  // Derived from the last 4 rather than a fresh random draw, so adding networks
  // doesn't shift the seeded sequence and rewrite every amount in the database.
  const networkFor = (last4: string) => (Number(last4) % 2 === 0 ? "mastercard" : "visa");

  // Card products, also derived from the last 4 for the same reason. Teams carry
  // the corporate card; people get one of the consumer products.
  const PERSON_PRODUCTS = ["cash", "unlimited", "travel", "standard"] as const;
  const productFor = (last4: string, isTeamCard: boolean) =>
    isTeamCard ? "platinum" : PERSON_PRODUCTS[Number(last4) % PERSON_PRODUCTS.length];

  // One shared card per team, held by the team rather than a person.
  const teamCardIds = new Map<string, number>();
  for (const name of teamNames) {
    const team = teams.get(name)!;
    const last4 = newLast4();
    const card = await prisma.card.create({
      data: {
        personId: null,
        accountId: team.accountId,
        last4,
        network: networkFor(last4),
        product: productFor(last4, true),
      },
    });
    teamCardIds.set(name, card.id);
  }

  const charges: ChargeInput[] = [];
  let subscriptionCount = 0;
  const orphanReport: string[] = [];

  for (const spec of PEOPLE) {
    const team = teams.get(spec.team)!;
    const startDate = monthsAgo(spec.startAgo, randInt(1, 28));
    const departureDate = spec.departedAgo !== undefined ? monthsAgo(spec.departedAgo, randInt(5, 24)) : null;

    const person = await prisma.person.create({
      data: {
        name: spec.name,
        role: spec.role,
        teamId: team.id,
        startDate,
        departureDate,
        photoUrl: writeAvatar(spec.name),
      },
    });

    // Cards (+ a personal reimbursement account when the person has one)
    const cardIds: number[] = [];
    for (const kind of spec.cards) {
      let accountId: number;
      if (kind === "team") accountId = team.accountId;
      else if (kind === "company1") accountId = company1.id;
      else if (kind === "company2") accountId = company2.id;
      else {
        const acct = await prisma.account.create({
          data: { name: `${spec.name} (personal reimbursement)`, type: "person", personId: person.id },
        });
        accountId = acct.id;
      }
      const last4 = newLast4();
      const card = await prisma.card.create({
        data: {
          personId: person.id,
          accountId,
          last4,
          network: networkFor(last4),
          product: productFor(last4, false),
        },
      });
      cardIds.push(card.id);
    }

    // Subscriptions + their monthly charges
    let orphans = 0;
    for (const s of spec.subs) {
      const vendor = VENDORS[s.vendor];
      if (!vendor) throw new Error(`Unknown vendor ${s.vendor}`);
      const cardId = cardIds[s.card ?? 0];
      const sub = await prisma.subscription.create({
        data: { personId: person.id, vendor: s.vendor, cardId, category: vendor.category },
      });
      subscriptionCount++;

      const billingDay = randInt(1, 28);
      const rows: ChargeInput[] = [];
      for (let ago = s.startAgo; ago >= (s.endAgo ?? 0); ago--) {
        const date = monthsAgo(ago, billingDay);
        if (date > NOW) continue; // this month's bill hasn't landed yet
        rows.push({
          subscriptionId: sub.id,
          personId: person.id,
          teamId: null,
          cardId,
          vendor: s.vendor,
          category: vendor.category,
          amountCents: priceAt(s.vendor, date, s.upgrade),
          date,
        });
      }

      // Guard rails: fail loudly if the spec produces data that breaks the brief.
      if (rows.length < 6 || rows.length > 24)
        throw new Error(`${spec.name}/${s.vendor}: ${rows.length} charges (want 6-24)`);
      if (rows[0].date < startDate) throw new Error(`${spec.name}/${s.vendor}: charge before start date`);
      if (departureDate && s.endAgo !== undefined && rows[rows.length - 1].date > departureDate)
        throw new Error(`${spec.name}/${s.vendor}: cancelled sub charged after departure`);
      if (departureDate && s.endAgo === undefined) orphans++;

      charges.push(...rows);
    }
    if (orphans > 0) orphanReport.push(`${spec.name} (${orphans})`);

    // One-off, non-subscription spend within the person's tenure
    const from = Math.max(startDate.getTime(), monthsAgo(24, 1).getTime());
    const to = Math.min((departureDate ?? NOW).getTime(), NOW.getTime());
    for (let i = 0; i < spec.oneOffs; i++) {
      const [vendor, category, min, max] = pick(ONE_OFF_POOLS[spec.team]);
      const day = new Date(from + rand() * (to - from));
      charges.push({
        subscriptionId: null,
        personId: person.id,
        teamId: null,
        cardId: rand() < 0.7 ? cardIds[0] : pick(cardIds),
        vendor,
        category,
        amountCents: randInt(min, max),
        date: new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12)),
      });
    }
  }

  // Shared-card spend: real money, no owner. This is what Review exists to sort.
  let unassignedCount = 0;
  for (const name of teamNames) {
    const cardId = teamCardIds.get(name)!;

    for (const { vendor, cents, months } of SHARED_SPEND[name]) {
      const spec = VENDORS[vendor];
      if (!spec) throw new Error(`Unknown shared vendor ${vendor}`);
      const billingDay = randInt(1, 28);
      for (let ago = months; ago >= 0; ago--) {
        const date = monthsAgo(ago, billingDay);
        if (date > NOW) continue;
        charges.push({
          subscriptionId: null,
          personId: null,
          teamId: null,
          cardId,
          vendor,
          category: spec.category,
          amountCents: cents,
          date,
        });
        unassignedCount++;
      }
    }

    for (const [vendor, category, cents] of SHARED_ONE_OFFS[name]) {
      const day = monthsAgo(randInt(0, 10), randInt(1, 28));
      if (day > NOW) continue;
      charges.push({
        subscriptionId: null,
        personId: null,
        teamId: null,
        cardId,
        vendor,
        category,
        amountCents: cents,
        date: day,
      });
      unassignedCount++;
    }
  }

  for (let i = 0; i < charges.length; i += 500) {
    await prisma.charge.createMany({ data: charges.slice(i, i + 500) });
  }

  const departed = PEOPLE.filter((p) => p.departedAgo !== undefined).length;
  console.log(
    `Seeded ${teamNames.length} teams, ${PEOPLE.length} people (${departed} departed), ` +
      `${subscriptionCount} subscriptions, ${charges.length} charges ` +
      `(${unassignedCount} unassigned, awaiting review).`,
  );
  console.log(`Departed people with still-active subscriptions: ${orphanReport.join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

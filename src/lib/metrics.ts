import type { Account, Card, Charge, Person, Subscription, Team } from "@prisma/client";
import { plural } from "./format";
import { prisma } from "./db";

/** A subscription counts as still running if it was charged within this many days. */
export const ACTIVE_WINDOW_DAYS = 35;
const DAY_MS = 86_400_000;

export type SubscriptionStatus = "Active" | "Cancelled" | "Orphaned";
export type CardWithAccount = Card & { account: Account };

// ---------------------------------------------------------------------------
// Loading. The dataset is small, so we read the ledger once and derive every
// number from the Charge rows in memory. Nothing here is stored or hardcoded.
// ---------------------------------------------------------------------------

export interface Ledger {
  now: Date;
  teams: Team[];
  people: Person[];
  cards: CardWithAccount[];
  subscriptions: Subscription[];
  charges: Charge[];
}

export async function loadLedger(): Promise<Ledger> {
  const [teams, people, cards, subscriptions, charges] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.card.findMany({ include: { account: true }, orderBy: { id: "asc" } }),
    prisma.subscription.findMany(),
    prisma.charge.findMany(),
  ]);
  return { now: new Date(), teams, people, cards, subscriptions, charges };
}

/** A charge nobody owns yet. */
const isUnassigned = (c: Charge) => c.personId === null && c.teamId === null;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sumCents = (charges: Pick<Charge, "amountCents">[]) =>
  charges.reduce((total, c) => total + c.amountCents, 0);

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = groups.get(k);
    if (bucket) bucket.push(item);
    else groups.set(k, [item]);
  }
  return groups;
}

const startOfMonthUTC = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

/** Whole calendar months elapsed between two dates. */
export function monthsBetween(from: Date, to: Date): number {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

// ---------------------------------------------------------------------------
// Subscriptions (per person), computed from their charges
// ---------------------------------------------------------------------------

export interface SubscriptionRow {
  id: number;
  vendor: string;
  category: string;
  cardId: number;
  cardLast4: string | null;
  status: SubscriptionStatus;
  currentCents: number;
  startingCents: number;
  changeCents: number;
  changePct: number;
  started: Date;
  lastCharge: Date;
  durationMonths: number;
  totalCents: number;
  chargeCount: number;
  /** Charges dated after the owner's departure (only non-zero for orphaned subscriptions). */
  postDepartureCents: number;
}

function buildSubscriptionRows(
  person: Person,
  subs: Subscription[],
  chargesBySub: Map<number, Charge[]>,
  cardsById: Map<number, Card>,
  now: Date,
): SubscriptionRow[] {
  const cutoff = now.getTime() - ACTIVE_WINDOW_DAYS * DAY_MS;
  const rows: SubscriptionRow[] = [];

  for (const sub of subs) {
    const charges = chargesBySub.get(sub.id);
    if (!charges || charges.length === 0) continue;

    const sorted = [...charges].sort((a, b) => a.date.getTime() - b.date.getTime() || a.id - b.id);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const charging = last.date.getTime() >= cutoff;
    const status: SubscriptionStatus = !charging
      ? "Cancelled"
      : person.departureDate
        ? "Orphaned"
        : "Active";

    const changeCents = last.amountCents - first.amountCents;
    const departure = person.departureDate;

    rows.push({
      id: sub.id,
      vendor: sub.vendor,
      category: sub.category,
      cardId: sub.cardId,
      cardLast4: cardsById.get(sub.cardId)?.last4 ?? null,
      status,
      currentCents: last.amountCents,
      startingCents: first.amountCents,
      changeCents,
      changePct: first.amountCents > 0 ? (changeCents / first.amountCents) * 100 : 0,
      started: first.date,
      lastCharge: last.date,
      durationMonths: monthsBetween(first.date, charging ? now : last.date),
      totalCents: sumCents(sorted),
      chargeCount: sorted.length,
      postDepartureCents:
        status === "Orphaned" && departure
          ? sumCents(sorted.filter((c) => c.date.getTime() > departure.getTime()))
          : 0,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface PersonMetrics {
  person: Person;
  departed: boolean;
  cards: CardWithAccount[];
  charges: Charge[];
  subscriptions: SubscriptionRow[];
  spendThisMonthCents: number;
  spendAllTimeCents: number;
  /** Subscriptions still being charged (Active + Orphaned). */
  liveSubscriptions: number;
  orphanedSubscriptions: number;
  orphanedSpendCents: number;
  /** Sum of current prices of orphaned subscriptions. */
  orphanedMonthlyCents: number;
}

export function computePeople(ledger: Ledger): PersonMetrics[] {
  const { now } = ledger;
  const monthStart = startOfMonthUTC(now).getTime();
  const cardsByPerson = groupBy(ledger.cards, (c) => c.personId);
  const subsByPerson = groupBy(ledger.subscriptions, (s) => s.personId);
  // Unassigned charges have a null key here, so they fall out of every person.
  const chargesByPerson = groupBy(ledger.charges, (c) => c.personId);
  const cardsById = new Map(ledger.cards.map((c) => [c.id, c]));

  return ledger.people.map((person) => {
    const charges = chargesByPerson.get(person.id) ?? [];
    const subCharges = charges.filter((c) => c.subscriptionId !== null);
    const chargesBySub = groupBy(subCharges, (c) => c.subscriptionId as number);
    const subscriptions = buildSubscriptionRows(
      person,
      subsByPerson.get(person.id) ?? [],
      chargesBySub,
      cardsById,
      now,
    );
    const orphaned = subscriptions.filter((s) => s.status === "Orphaned");

    return {
      person,
      departed: person.departureDate !== null,
      cards: cardsByPerson.get(person.id) ?? [],
      charges,
      subscriptions,
      spendThisMonthCents: sumCents(charges.filter((c) => c.date.getTime() >= monthStart)),
      spendAllTimeCents: sumCents(charges),
      liveSubscriptions: subscriptions.filter((s) => s.status !== "Cancelled").length,
      orphanedSubscriptions: orphaned.length,
      orphanedSpendCents: orphaned.reduce((t, s) => t + s.postDepartureCents, 0),
      orphanedMonthlyCents: orphaned.reduce((t, s) => t + s.currentCents, 0),
    };
  });
}

// ---------------------------------------------------------------------------
// Page data
// ---------------------------------------------------------------------------

/**
 * Someone who left the company but whose subscriptions are still being charged.
 * This is the thing the dashboard exists to surface.
 */
export interface DormantPerson {
  person: Person;
  team: Team;
  departureDate: Date;
  daysSinceDeparture: number;
  orphanedSubscriptions: number;
  /** Current price of everything still charging, per month. */
  monthlyCents: number;
  /** Actually charged since the departure date, subscriptions and one-offs together. */
  chargedSinceCents: number;
  /** Non-subscription spend assigned to them after they left, e.g. via Review. */
  otherPostDepartureCents: number;
  vendors: string[];
}

export interface DormantRoster {
  people: DormantPerson[];
  monthlyCents: number;
  chargedSinceCents: number;
  /** Departed people whose subscriptions were all stopped. */
  cleanlyOffboarded: number;
}

function buildDormantRoster(
  metrics: PersonMetrics[],
  teams: Team[],
  now: Date,
): DormantRoster {
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const departed = metrics.filter((m) => m.departed && m.person.departureDate);

  const people = departed
    .map((m) => {
      const departureDate = m.person.departureDate!;
      // One-off spend booked to them after they left. Orphaned subscription
      // charges are excluded here because they are already counted above.
      const otherPostDepartureCents = sumCents(
        m.charges.filter((c) => c.subscriptionId === null && c.date > departureDate),
      );
      return { m, departureDate, otherPostDepartureCents };
    })
    .filter(({ m, otherPostDepartureCents }) => m.orphanedSubscriptions > 0 || otherPostDepartureCents > 0)
    .map(({ m, departureDate, otherPostDepartureCents }): DormantPerson => {
      const orphans = m.subscriptions.filter((s) => s.status === "Orphaned");
      const extras = [
        ...new Set(
          m.charges
            .filter((c) => c.subscriptionId === null && c.date > departureDate)
            .map((c) => c.vendor),
        ),
      ];
      return {
        person: m.person,
        team: teamsById.get(m.person.teamId)!,
        departureDate,
        daysSinceDeparture: Math.max(
          0,
          Math.floor((now.getTime() - departureDate.getTime()) / DAY_MS),
        ),
        orphanedSubscriptions: m.orphanedSubscriptions,
        monthlyCents: m.orphanedMonthlyCents,
        chargedSinceCents: m.orphanedSpendCents + otherPostDepartureCents,
        otherPostDepartureCents,
        vendors: [...orphans.map((s) => s.vendor), ...extras].sort((a, b) => a.localeCompare(b)),
      };
    })
    // Worst bleed first.
    .sort((a, b) => b.monthlyCents - a.monthlyCents || b.chargedSinceCents - a.chargedSinceCents);

  return {
    people,
    monthlyCents: people.reduce((t, p) => t + p.monthlyCents, 0),
    chargedSinceCents: people.reduce((t, p) => t + p.chargedSinceCents, 0),
    cleanlyOffboarded: departed.length - people.length,
  };
}

export interface TeamRow {
  team: Team;
  /** Last 4 of the team's own shared card. */
  cardLast4: string | null;
  cardNetwork: string | null;
  spendThisMonthCents: number;
  spendAllTimeCents: number;
  activeHeadcount: number;
  departedHeadcount: number;
  activeSubscriptions: number;
  orphanedSubscriptions: number;
  orphanedSpendCents: number;
  /** This team's share of company spend this month, 0–1. */
  monthShare: number;
}

/** The one card that belongs to a team rather than a person. */
function teamCardFor(ledger: Ledger, teamId: number): CardWithAccount | undefined {
  return ledger.cards.find((c) => c.personId === null && c.account.teamId === teamId);
}

export async function getOverview(): Promise<{
  now: Date;
  rows: TeamRow[];
  companyCategories: CategorySlice[];
  companyAllTimeCents: number;
  chargeCount: number;
  dormant: DormantRoster;
  /** Spend that belongs to no team yet, so the table still reconciles. */
  unassigned: { thisMonthCents: number; allTimeCents: number; chargeCount: number; groupCount: number };
}> {
  const ledger = await loadLedger();
  const allMetrics = computePeople(ledger);
  const people = groupBy(allMetrics, (m) => m.person.teamId);

  const monthStart = startOfMonthUTC(ledger.now).getTime();
  // Charges assigned to the team itself rather than to one of its people.
  const teamOwned = groupBy(
    ledger.charges.filter((c) => c.teamId !== null),
    (c) => c.teamId as number,
  );

  const base = ledger.teams.map((team) => {
    const members = people.get(team.id) ?? [];
    const sum = (pick: (m: PersonMetrics) => number) => members.reduce((t, m) => t + pick(m), 0);
    const card = teamCardFor(ledger, team.id);
    const direct = teamOwned.get(team.id) ?? [];
    return {
      team,
      cardLast4: card?.last4 ?? null,
      cardNetwork: card?.network ?? null,
      spendThisMonthCents:
        sum((m) => m.spendThisMonthCents) +
        sumCents(direct.filter((c) => c.date.getTime() >= monthStart)),
      spendAllTimeCents: sum((m) => m.spendAllTimeCents) + sumCents(direct),
      activeHeadcount: members.filter((m) => !m.departed).length,
      departedHeadcount: members.filter((m) => m.departed).length,
      activeSubscriptions: sum((m) => m.liveSubscriptions),
      orphanedSubscriptions: sum((m) => m.orphanedSubscriptions),
      orphanedSpendCents: sum((m) => m.orphanedSpendCents),
    };
  });

  const companyMonth = base.reduce((t, r) => t + r.spendThisMonthCents, 0);
  const rows: TeamRow[] = base.map((r) => ({
    ...r,
    monthShare: companyMonth > 0 ? r.spendThisMonthCents / companyMonth : 0,
  }));
  return {
    now: ledger.now,
    rows,
    companyCategories: categoryBreakdown(ledger.charges),
    companyAllTimeCents: sumCents(ledger.charges),
    chargeCount: ledger.charges.length,
    dormant: buildDormantRoster(allMetrics, ledger.teams, ledger.now),
    unassigned: (() => {
      // How much of each category's company-wide spend already sits with each team.
  // Used as a soft signal when nothing stronger identifies an owner.
  const peopleForShare = new Map(ledger.people.map((p) => [p.id, p]));
  const categoryTotals = new Map<string, number>();
  const teamCategoryTotals = new Map<string, number>();
  for (const c of ledger.charges) {
    const team = c.personId !== null ? peopleForShare.get(c.personId)?.teamId : c.teamId;
    categoryTotals.set(c.category, (categoryTotals.get(c.category) ?? 0) + c.amountCents);
    if (team != null) {
      const k = `${team}:${c.category}`;
      teamCategoryTotals.set(k, (teamCategoryTotals.get(k) ?? 0) + c.amountCents);
    }
  }
  const categoryShareByTeam = new Map<string, number>();
  for (const [k, cents] of teamCategoryTotals) {
    const category = k.slice(k.indexOf(":") + 1);
    const total = categoryTotals.get(category) ?? 0;
    if (total > 0) categoryShareByTeam.set(k, cents / total);
  }

  const pending = ledger.charges.filter(isUnassigned);
      return {
        thisMonthCents: sumCents(pending.filter((c) => c.date.getTime() >= monthStart)),
        allTimeCents: sumCents(pending),
        chargeCount: pending.length,
        groupCount: new Set(pending.map((c) => `${c.vendor}__${c.cardId}`)).size,
      };
    })(),
  };
}

export interface CategorySlice {
  category: string;
  cents: number;
  /** Share of the total, 0–1. */
  share: number;
}

/** URL-safe form of a category name. "Sales & Marketing" -> "sales-and-marketing". */
export function categorySlug(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** The aggregate bucket in a breakdown, which is not a real category. */
export const OTHER_BUCKET = "Other";

/** Spend by category, biggest first, with the tail folded into "Other". */
export function categoryBreakdown(charges: Charge[], keep = 5): CategorySlice[] {
  const totals = new Map<string, number>();
  for (const c of charges) totals.set(c.category, (totals.get(c.category) ?? 0) + c.amountCents);
  const total = sumCents(charges);
  if (total === 0) return [];

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const head = sorted.slice(0, keep);
  const tail = sorted.slice(keep).reduce((t, [, cents]) => t + cents, 0);
  const slices = head.map(([category, cents]) => ({ category, cents, share: cents / total }));
  if (tail > 0) slices.push({ category: "Other", cents: tail, share: tail / total });
  return slices;
}

export async function getTeamPage(teamId: number) {
  const ledger = await loadLedger();
  const team = ledger.teams.find((t) => t.id === teamId);
  if (!team) return null;
  const members = computePeople(ledger).filter((m) => m.person.teamId === teamId);
  const memberIds = new Set(members.map((m) => m.person.id));
  const teamCharges = ledger.charges.filter(
    (c) => (c.personId !== null && memberIds.has(c.personId)) || c.teamId === teamId,
  );
  const card = teamCardFor(ledger, team.id);
  return {
    now: ledger.now,
    team,
    members,
    cardLast4: card?.last4 ?? null,
    cardNetwork: card?.network ?? null,
    categories: categoryBreakdown(teamCharges),
    dormant: buildDormantRoster(members, ledger.teams, ledger.now),
  };
}

// ---------------------------------------------------------------------------
// Review queue: charges on shared cards that nobody owns yet
// ---------------------------------------------------------------------------

export interface OwnerOption {
  kind: "person" | "team";
  id: number;
  name: string;
  /** Team name for a person, so two "Chris"es are tellable apart. */
  detail?: string;
  departureDate: Date | null;
}

/** How much weight the evidence carries, which drives how loudly it is shown. */
export type GuessStrength = "rule" | "strong" | "likely" | "weak";

export interface BestGuess {
  owner: OwnerOption;
  /** Why we think so, in plain words. */
  reason: string;
  strength: GuessStrength;
}

export interface ReviewGroup {
  /** Stable key for the form: vendor + card. */
  key: string;
  vendor: string;
  category: string;
  cardId: number;
  cardLast4: string;
  cardNetwork: string | null;
  accountName: string;
  teamId: number | null;
  chargeCount: number;
  totalCents: number;
  thisMonthCents: number;
  firstDate: Date;
  lastDate: Date;
  /** True when the charges repeat monthly at a steady price. */
  recurring: boolean;
  guess: BestGuess | null;
}

export interface ReviewQueue {
  now: Date;
  groups: ReviewGroup[];
  chargeCount: number;
  totalCents: number;
  thisMonthCents: number;
  owners: OwnerOption[];
}

/**
 * Best guess for who owns a shared-card charge, in descending confidence:
 * a saved rule, then someone on the card's team who already pays this vendor,
 * then the team that owns the card. No guess is better than a wrong guess, so
 * anything weaker than that returns null.
 */
interface GuessContext {
  vendor: string;
  category: string;
  cardId: number;
  cardTeamId: number | null;
  recurring: boolean;
  chargeCount: number;
  firstDate: Date;
  ledger: Ledger;
  rules: AssignmentRuleRow[];
  ownerByKey: Map<string, OwnerOption>;
  /** Share of company spend in this category that already sits with each team. */
  categoryShareByTeam: Map<string, number>;
}

/**
 * Who most likely owns a shared-card charge. The checks run strongest evidence
 * first and each one explains itself differently, so a reviewer scanning the
 * queue learns something from every row instead of reading the same sentence
 * fifteen times. Anything weaker than "it is that team's card" returns null,
 * because no guess beats a wrong one.
 */
function guessOwner(ctx: GuessContext): BestGuess | null {
  const { vendor, cardTeamId, ledger, rules, cardId, ownerByKey } = ctx;

  const rule = rules.find((r) => r.vendor === vendor && r.cardId === cardId);
  if (rule) {
    const owner =
      rule.personId !== null
        ? ownerByKey.get(`person:${rule.personId}`)
        : rule.teamId !== null
          ? ownerByKey.get(`team:${rule.teamId}`)
          : undefined;
    if (owner) return { owner, reason: "You set a rule for this card", strength: "rule" };
  }

  if (cardTeamId === null) return null;
  const team = ownerByKey.get(`team:${cardTeamId}`);
  const teamName = team?.name ?? "this team";
  const peopleById = new Map(ledger.people.map((p) => [p.id, p]));

  // Who on this team already pays for the same vendor out of their own budget?
  const subscribers = ledger.subscriptions.filter(
    (sub) => sub.vendor === vendor && peopleById.get(sub.personId)?.teamId === cardTeamId,
  );
  const subscriberIds = [...new Set(subscribers.map((sub) => sub.personId))];
  const present = subscriberIds.filter((id) => !peopleById.get(id)?.departureDate);
  const departed = subscriberIds.filter((id) => peopleById.get(id)?.departureDate);

  if (present.length === 1 && departed.length === 0) {
    const owner = ownerByKey.get(`person:${present[0]}`);
    if (owner) {
      return {
        owner,
        reason: `${owner.name} is the only person on ${teamName} already paying for ${vendor}`,
        strength: "strong",
      };
    }
  }

  if (departed.length > 0 && present.length === 0 && team) {
    const who = peopleById.get(departed[0]);
    return {
      owner: team,
      reason: `${who?.name ?? "Someone"} ran ${vendor} here until they left, so it likely became a team tool`,
      strength: "likely",
    };
  }

  if (present.length > 1 && team) {
    return {
      owner: team,
      reason: `${present.length} people on ${teamName} already expense ${vendor}, so this looks like the shared seat`,
      strength: "likely",
    };
  }

  if (team && !ctx.recurring && ctx.chargeCount === 1) {
    return {
      owner: team,
      reason: `A one-off ${ctx.category.toLowerCase()} purchase, and no one person is named on it`,
      strength: "likely",
    };
  }

  if (team && ctx.recurring && subscriberIds.length === 0) {
    const since = ctx.firstDate.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
    return {
      owner: team,
      reason: `Billed every month since ${since}, and nobody on ${teamName} expenses ${vendor} personally`,
      strength: "likely",
    };
  }

  const share = ctx.categoryShareByTeam.get(`${cardTeamId}:${ctx.category}`) ?? 0;
  if (team && share >= 0.4) {
    return {
      owner: team,
      reason: `${teamName} already carries ${Math.round(share * 100)}% of company ${ctx.category.toLowerCase()} spend`,
      strength: "likely",
    };
  }

  if (team) {
    return { owner: team, reason: `It is the ${teamName} card, and nothing points to one person`, strength: "weak" };
  }
  return null;
}

type AssignmentRuleRow = { vendor: string; cardId: number; personId: number | null; teamId: number | null };

export async function getReviewQueue(): Promise<ReviewQueue> {
  const [ledger, rules] = await Promise.all([loadLedger(), prisma.assignmentRule.findMany()]);
  const monthStart = startOfMonthUTC(ledger.now).getTime();

  const owners: OwnerOption[] = [
    ...ledger.teams.map((t): OwnerOption => ({
      kind: "team",
      id: t.id,
      name: t.name,
      departureDate: null,
    })),
    ...ledger.people.map((p): OwnerOption => ({
      kind: "person",
      id: p.id,
      name: p.name,
      detail: ledger.teams.find((t) => t.id === p.teamId)?.name,
      departureDate: p.departureDate,
    })),
  ];
  const ownerByKey = new Map(owners.map((o) => [`${o.kind}:${o.id}`, o]));

  // How much of each category's company-wide spend already sits with each team.
  // Used as a soft signal when nothing stronger identifies an owner.
  const peopleForShare = new Map(ledger.people.map((p) => [p.id, p]));
  const categoryTotals = new Map<string, number>();
  const teamCategoryTotals = new Map<string, number>();
  for (const c of ledger.charges) {
    const team = c.personId !== null ? peopleForShare.get(c.personId)?.teamId : c.teamId;
    categoryTotals.set(c.category, (categoryTotals.get(c.category) ?? 0) + c.amountCents);
    if (team != null) {
      const k = `${team}:${c.category}`;
      teamCategoryTotals.set(k, (teamCategoryTotals.get(k) ?? 0) + c.amountCents);
    }
  }
  const categoryShareByTeam = new Map<string, number>();
  for (const [k, cents] of teamCategoryTotals) {
    const category = k.slice(k.indexOf(":") + 1);
    const total = categoryTotals.get(category) ?? 0;
    if (total > 0) categoryShareByTeam.set(k, cents / total);
  }

  const pending = ledger.charges.filter(isUnassigned);
  const cardsById = new Map(ledger.cards.map((c) => [c.id, c]));

  // One row per vendor per card, so twelve months of Notion is a single decision.
  const buckets = groupBy(pending, (c) => `${c.vendor}__${c.cardId}`);

  const groups: ReviewGroup[] = [...buckets.entries()]
    .map(([key, rows]) => {
      const sorted = [...rows].sort((a, b) => a.date.getTime() - b.date.getTime());
      const card = cardsById.get(sorted[0].cardId);
      const amounts = new Set(sorted.map((r) => r.amountCents));
      return {
        key,
        vendor: sorted[0].vendor,
        category: sorted[0].category,
        cardId: sorted[0].cardId,
        cardLast4: card?.last4 ?? "????",
        cardNetwork: card?.network ?? null,
        accountName: card?.account.name ?? "Unknown account",
        teamId: card?.account.teamId ?? null,
        chargeCount: sorted.length,
        totalCents: sumCents(sorted),
        thisMonthCents: sumCents(sorted.filter((r) => r.date.getTime() >= monthStart)),
        firstDate: sorted[0].date,
        lastDate: sorted[sorted.length - 1].date,
        recurring: sorted.length > 2 && amounts.size === 1,
        guess: guessOwner({
          vendor: sorted[0].vendor,
          category: sorted[0].category,
          cardId: sorted[0].cardId,
          cardTeamId: card?.account.teamId ?? null,
          recurring: sorted.length > 2 && amounts.size === 1,
          chargeCount: sorted.length,
          firstDate: sorted[0].date,
          ledger,
          rules,
          ownerByKey,
          categoryShareByTeam,
        }),
      };
    })
    // Biggest money first: that is where review time is best spent.
    .sort((a, b) => b.totalCents - a.totalCents || a.vendor.localeCompare(b.vendor));

  return {
    now: ledger.now,
    groups,
    chargeCount: pending.length,
    totalCents: sumCents(pending),
    thisMonthCents: sumCents(pending.filter((c) => c.date.getTime() >= monthStart)),
    owners,
  };
}

/** Cheap count for the nav badge. */
export async function getUnassignedSummary(): Promise<{
  chargeCount: number;
  groupCount: number;
  totalCents: number;
  thisMonthCents: number;
}> {
  const charges = await prisma.charge.findMany({
    where: { personId: null, teamId: null },
    select: { vendor: true, cardId: true, amountCents: true, date: true },
  });
  const monthStart = startOfMonthUTC(new Date()).getTime();
  return {
    chargeCount: charges.length,
    groupCount: new Set(charges.map((c) => `${c.vendor}__${c.cardId}`)).size,
    totalCents: charges.reduce((t, c) => t + c.amountCents, 0),
    thisMonthCents: charges
      .filter((c) => c.date.getTime() >= monthStart)
      .reduce((t, c) => t + c.amountCents, 0),
  };
}

// ---------------------------------------------------------------------------
// Time series for the Data tab
// ---------------------------------------------------------------------------

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export interface MonthPoint {
  key: string;
  /** "Sep" — the year is carried by the axis, not repeated on every tick. */
  label: string;
  year: number;
  recurringCents: number;
  oneOffCents: number;
  totalCents: number;
  /** Keyed by team id. */
  byTeam: Record<number, number>;
  /** Charged to people after they left. */
  orphanedCents: number;
}

export interface PriceDrift {
  vendor: string;
  who: string;
  personId: number;
  startingCents: number;
  currentCents: number;
  changeCents: number;
  changePct: number;
}

export async function getDataPage(months = 24) {
  const ledger = await loadLedger();
  const metrics = computePeople(ledger);
  const peopleById = new Map(ledger.people.map((p) => [p.id, p]));

  // Build the month axis back from the current month.
  const keys: Array<{ key: string; label: string; year: number }> = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ledger.now.getUTCFullYear(), ledger.now.getUTCMonth() - i, 1));
    keys.push({
      key: monthKey(d),
      label: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      year: d.getUTCFullYear(),
    });
  }

  const blank = (): MonthPoint["byTeam"] =>
    Object.fromEntries(ledger.teams.map((t) => [t.id, 0]));
  const points = new Map<string, MonthPoint>(
    keys.map((k) => [
      k.key,
      {
        ...k,
        recurringCents: 0,
        oneOffCents: 0,
        totalCents: 0,
        byTeam: blank(),
        orphanedCents: 0,
      },
    ]),
  );

  const teamOf = (c: Charge) =>
    c.personId !== null ? (peopleById.get(c.personId)?.teamId ?? null) : c.teamId;

  for (const c of ledger.charges) {
    const point = points.get(monthKey(c.date));
    if (!point) continue;
    if (c.subscriptionId !== null) point.recurringCents += c.amountCents;
    else point.oneOffCents += c.amountCents;
    point.totalCents += c.amountCents;
    const team = teamOf(c);
    if (team !== null && point.byTeam[team] !== undefined) point.byTeam[team] += c.amountCents;
  }

  // Orphaned spend by month: charges on still-billing subscriptions, dated after
  // their owner left.
  const orphanedSubIds = new Set<number>();
  for (const m of metrics) {
    if (!m.departed) continue;
    for (const s of m.subscriptions) if (s.status === "Orphaned") orphanedSubIds.add(s.id);
  }
  for (const c of ledger.charges) {
    if (c.subscriptionId === null || !orphanedSubIds.has(c.subscriptionId)) continue;
    const owner = c.personId === null ? null : peopleById.get(c.personId);
    if (!owner?.departureDate || c.date <= owner.departureDate) continue;
    const point = points.get(monthKey(c.date));
    if (point) point.orphanedCents += c.amountCents;
  }

  const series = [...points.values()];

  // Vendors, biggest first. Nominal categories, so one colour in the chart.
  const vendorTotals = new Map<string, number>();
  for (const c of ledger.charges)
    vendorTotals.set(c.vendor, (vendorTotals.get(c.vendor) ?? 0) + c.amountCents);
  const allVendors = sumCents(ledger.charges);
  const topVendors: SpendSlice[] = [...vendorTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([label, cents]) => ({ label, cents, share: allVendors > 0 ? cents / allVendors : 0 }));

  // Subscriptions whose price moved, biggest rise first.
  const priceDrift: PriceDrift[] = metrics
    .flatMap((m) =>
      m.subscriptions
        .filter((s) => s.changeCents !== 0)
        .map((s) => ({
          vendor: s.vendor,
          who: m.person.name,
          personId: m.person.id,
          startingCents: s.startingCents,
          currentCents: s.currentCents,
          changeCents: s.changeCents,
          changePct: s.changePct,
        })),
    )
    .sort((a, b) => b.changeCents - a.changeCents)
    .slice(0, 8);

  const monthlyRunRateCents = metrics.reduce(
    (t, m) =>
      t + m.subscriptions.filter((s) => s.status !== "Cancelled").reduce((st, s) => st + s.currentCents, 0),
    0,
  );

  return {
    now: ledger.now,
    teams: ledger.teams,
    series,
    topVendors,
    priceDrift,
    monthlyRunRateCents,
    totalCents: allVendors,
  };
}

export interface SpendSlice {
  label: string;
  href?: string;
  cents: number;
  share: number;
  detail?: string;
  /** Marks a row that involves someone who has left. */
  flagged?: boolean;
}

/**
 * Everything behind one slice of the donut: who spent it, on what, and how much
 * of it belongs to people who have already left.
 */
export async function getCategoryPage(slug: string, teamId?: number) {
  const ledger = await loadLedger();
  const allMetrics = computePeople(ledger);

  const category = [...new Set(ledger.charges.map((c) => c.category))].find(
    (c) => categorySlug(c) === slug,
  );
  if (!category) return null;

  const team = teamId === undefined ? undefined : ledger.teams.find((t) => t.id === teamId);
  if (teamId !== undefined && !team) return null;

  const peopleById = new Map(ledger.people.map((p) => [p.id, p]));
  const teamsById = new Map(ledger.teams.map((t) => [t.id, t]));
  const cardsById = new Map(ledger.cards.map((c) => [c.id, c]));

  // A charge counts toward a team when its owner is on that team, or when it is
  // assigned to the team directly.
  const teamOf = (c: Charge) =>
    c.personId !== null ? (peopleById.get(c.personId)?.teamId ?? null) : c.teamId;

  const inCategory = ledger.charges.filter((c) => c.category === category);
  const charges = team ? inCategory.filter((c) => teamOf(c) === team.id) : inCategory;

  const totalCents = sumCents(charges);
  const share = (cents: number) => (totalCents > 0 ? cents / totalCents : 0);

  // Subscription vs one-off, which is the difference between a recurring
  // commitment and a single purchase.
  const subscriptionCents = sumCents(charges.filter((c) => c.subscriptionId !== null));
  const oneOffCents = totalCents - subscriptionCents;

  // Spend in this category that is still being billed to someone who left.
  const scopedMetrics = team ? allMetrics.filter((m) => m.person.teamId === team.id) : allMetrics;
  const orphanedCents = scopedMetrics.reduce(
    (t, m) =>
      t +
      m.subscriptions
        .filter((s) => s.status === "Orphaned" && s.category === category)
        .reduce((st, s) => st + s.postDepartureCents, 0),
    0,
  );

  const byGroup = (key: (c: Charge) => string) => {
    const totals = new Map<string, number>();
    for (const c of charges) totals.set(key(c), (totals.get(key(c)) ?? 0) + c.amountCents);
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  };

  const byTeam: SpendSlice[] = team
    ? []
    : byGroup((c) => String(teamOf(c) ?? 0)).map(([id, cents]) => {
        const t = teamsById.get(Number(id));
        return {
          label: t?.name ?? "Unassigned",
          href: t ? `/teams/${t.id}` : "/review",
          cents,
          share: share(cents),
          detail: t ? undefined : "Needs review",
        };
      });

  const vendorCounts = new Map<string, number>();
  for (const c of charges) vendorCounts.set(c.vendor, (vendorCounts.get(c.vendor) ?? 0) + 1);
  const byVendor: SpendSlice[] = byGroup((c) => c.vendor).map(([vendor, cents]) => ({
    label: vendor,
    cents,
    share: share(cents),
    detail: plural(vendorCounts.get(vendor) ?? 0, "charge"),
  }));

  const byPerson: SpendSlice[] = byGroup((c) => String(c.personId ?? "none")).map(([id, cents]) => {
    const person = id === "none" ? undefined : peopleById.get(Number(id));
    if (!person) {
      return { label: "Unassigned", href: "/review", cents, share: share(cents), detail: "Needs review" };
    }
    return {
      label: person.name,
      href: `/people/${person.id}`,
      cents,
      share: share(cents),
      detail: teamsById.get(person.teamId)?.name,
      flagged: Boolean(person.departureDate),
    };
  });

  const recent: TransactionRow[] = [...charges]
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id)
    .slice(0, 12)
    .map((c) => ({
      id: c.id,
      date: c.date,
      vendor: c.vendor,
      category: c.category,
      isSubscription: c.subscriptionId !== null,
      cardLast4: cardsById.get(c.cardId)?.last4 ?? null,
      amountCents: c.amountCents,
    }));

  return {
    now: ledger.now,
    category,
    team,
    totalCents,
    chargeCount: charges.length,
    /** Share of all company spend, in every category. */
    shareOfCompany: (() => {
      const company = sumCents(ledger.charges);
      return company > 0 ? totalCents / company : 0;
    })(),
    subscriptionCents,
    oneOffCents,
    orphanedCents,
    byTeam,
    byVendor,
    byPerson,
    recent,
  };
}

export interface TransactionFilters {
  vendor?: string;
  category?: string;
  from?: string; // yyyy-mm-dd, inclusive
  to?: string; // yyyy-mm-dd, inclusive
}

export interface TransactionRow {
  id: number;
  date: Date;
  vendor: string;
  category: string;
  isSubscription: boolean;
  cardLast4: string | null;
  amountCents: number;
}

export interface CardRow {
  card: CardWithAccount;
  chargeCount: number;
  spendCents: number;
  liveSubscriptions: number;
}

function parseDay(value?: string): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

export async function getPersonPage(personId: number, filters: TransactionFilters) {
  const ledger = await loadLedger();
  const metrics = computePeople(ledger).find((m) => m.person.id === personId);
  if (!metrics) return null;
  const team = ledger.teams.find((t) => t.id === metrics.person.teamId)!;

  const cardsById = new Map(metrics.cards.map((c) => [c.id, c]));

  const cardRows: CardRow[] = metrics.cards.map((card) => {
    const onCard = metrics.charges.filter((c) => c.cardId === card.id);
    return {
      card,
      chargeCount: onCard.length,
      spendCents: sumCents(onCard),
      liveSubscriptions: metrics.subscriptions.filter(
        (s) => s.cardId === card.id && s.status !== "Cancelled",
      ).length,
    };
  });

  // Filters apply to the transaction list only; the subscriptions table always uses every charge.
  const from = parseDay(filters.from);
  const toExclusive = parseDay(filters.to);
  const upper = toExclusive === null ? null : toExclusive + DAY_MS;

  const transactions: TransactionRow[] = metrics.charges
    .filter((c) => !filters.vendor || c.vendor === filters.vendor)
    .filter((c) => !filters.category || c.category === filters.category)
    .filter((c) => from === null || c.date.getTime() >= from)
    .filter((c) => upper === null || c.date.getTime() < upper)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id)
    .map((c) => ({
      id: c.id,
      date: c.date,
      vendor: c.vendor,
      category: c.category,
      isSubscription: c.subscriptionId !== null,
      cardLast4: cardsById.get(c.cardId)?.last4 ?? null,
      amountCents: c.amountCents,
    }));

  const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

  return {
    now: ledger.now,
    team,
    metrics,
    cardRows,
    transactions,
    transactionsTotalCents: sumCents(transactions),
    vendors: unique(metrics.charges.map((c) => c.vendor)),
    categories: unique(metrics.charges.map((c) => c.category)),
  };
}

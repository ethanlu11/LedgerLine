/**
 * Runs a real Postgres server for local development, without needing Docker or
 * a system install — the binaries ship with the `embedded-postgres` dev
 * dependency. Data lives in .postgres/ and survives restarts.
 *
 *   node scripts/local-postgres.mjs start
 *   node scripts/local-postgres.mjs stop
 *
 * Production (Vercel) never touches this; it reads DATABASE_URL as normal.
 */
import EmbeddedPostgres from "embedded-postgres";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".postgres");
const PORT = Number(process.env.LOCAL_PG_PORT ?? 55432);
const USER = "ledgerline";
const PASSWORD = "ledgerline";
const DB = "ledgerline";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
});

const cmd = process.argv[2] ?? "start";

/** pg_ctl detaches, so a previous run can still hold the port. */
function portHolders() {
  try {
    return execFileSync("lsof", ["-ti", `tcp:${PORT}`], { encoding: "utf8" })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

if (cmd === "start") {
  const busy = portHolders();
  if (busy.length > 0) {
    console.error(
      `Port ${PORT} is already in use (pid ${busy.join(", ")}).\n` +
        `If that is an old LedgerLine database, run: npm run db:stop`,
    );
    process.exit(1);
  }
  if (!existsSync(DATA_DIR)) {
    console.log("Initialising Postgres in .postgres/ …");
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase(DB);
    console.log(`Created database "${DB}".`);
  } catch {
    // Already there from a previous run.
  }
  console.log(`Postgres is up on port ${PORT}.`);
  console.log(`DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DB}?schema=public"`);
  console.log("Leave this running; Ctrl-C stops the server.");

  // The server is a child of this process, so staying alive is what keeps it up.
  const shutdown = async () => {
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await new Promise(() => {});
} else if (cmd === "stop") {
  // Ask nicely first, then make sure the detached postmaster is really gone —
  // a leftover one blocks the next start.
  await pg.stop().catch(() => {});
  const left = portHolders();
  for (const pid of left) {
    try {
      process.kill(Number(pid));
    } catch {
      // Already exited.
    }
  }
  console.log(left.length > 0 ? `Postgres stopped (pid ${left.join(", ")}).` : "Postgres stopped.");
  process.exit(0);
} else {
  console.error(`Unknown command "${cmd}". Use start or stop.`);
  process.exit(1);
}

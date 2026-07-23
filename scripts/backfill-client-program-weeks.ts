#!/usr/bin/env npx tsx
// ─────────────────────────────────────────────────────────────
// Catalyst OS — Copy-on-Assignment Backfill
//
// One-time script to populate client_program_weeks and
// client_program_week_days for client_programs rows that predate
// the copy-on-assignment migration (0008).
//
// Also sets source_template_name and source_template_version on
// those rows from the current template values.
//
// Safe to re-run: skips any client_program_id that already has
// rows in client_program_weeks.
//
// Usage:
//   node_modules/.bin/tsx --env-file=.env.local \
//     scripts/backfill-client-program-weeks.ts
//   Add --dry-run to preview without writing.
// ─────────────────────────────────────────────────────────────

import postgres from "postgres";

const dryRun = process.argv.includes("--dry-run");
const dbUrl = process.env.DATABASE_URL_DIRECT;
if (!dbUrl) {
  console.error("DATABASE_URL_DIRECT is not set.");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false });

async function main() {
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // Find all client_programs rows that have no client_program_weeks yet
  const unbackfilled = await sql`
    SELECT
      cp.id            AS client_program_id,
      cp.program_template_id,
      pt.name          AS template_name,
      pt.version       AS template_version
    FROM client_programs cp
    JOIN program_templates pt ON pt.id = cp.program_template_id
    WHERE NOT EXISTS (
      SELECT 1 FROM client_program_weeks cpw
      WHERE cpw.client_program_id = cp.id
    )
    ORDER BY cp.created_at
  `;

  if (unbackfilled.length === 0) {
    console.log("Nothing to backfill — all client_programs already have week rows.");
    return;
  }

  console.log(`Found ${unbackfilled.length} client_program(s) to backfill:`);
  unbackfilled.forEach((r) =>
    console.log(`  ${r.client_program_id}  template: ${r.template_name} v${r.template_version}`)
  );
  console.log();

  for (const cp of unbackfilled) {
    // Fetch template weeks
    const weeks = await sql`
      SELECT id, week_number, label, notes
      FROM program_weeks
      WHERE program_template_id = ${cp.program_template_id}
      ORDER BY week_number
    `;

    if (weeks.length === 0) {
      console.log(`  [SKIP] ${cp.client_program_id} — template has no weeks`);
      continue;
    }

    console.log(
      `  [${dryRun ? "DRY" : "WRITE"}] ${cp.client_program_id} — ${weeks.length} week(s)`
    );

    if (!dryRun) {
      await sql.begin(async (tx) => {
        // Snapshot lineage on client_programs
        await tx`
          UPDATE client_programs
          SET
            source_template_name    = ${cp.template_name},
            source_template_version = ${cp.template_version},
            updated_at              = now()
          WHERE id = ${cp.client_program_id}
        `;

        for (const week of weeks) {
          // Insert client_program_weeks row
          const [newWeek] = await tx`
            INSERT INTO client_program_weeks
              (client_program_id, source_week_id, week_number, label, notes)
            VALUES
              (${cp.client_program_id}, ${week.id}, ${week.week_number}, ${week.label}, ${week.notes})
            RETURNING id
          `;

          // Fetch template days for this week
          const days = await tx`
            SELECT id, day_of_week, workout_template_id, label, notes
            FROM program_week_days
            WHERE program_week_id = ${week.id}
            ORDER BY day_of_week
          `;

          if (days.length > 0) {
            await tx`
              INSERT INTO client_program_week_days
                (client_program_week_id, source_day_id, day_of_week, workout_template_id, label, notes)
              SELECT
                ${newWeek.id},
                d.id,
                d.day_of_week,
                d.workout_template_id,
                d.label,
                d.notes
              FROM unnest(${sql.array(days.map((d) => d.id))}::uuid[])      WITH ORDINALITY AS t(id, ord)
              JOIN program_week_days d ON d.id = t.id
              ORDER BY t.ord
            `;
            console.log(
              `    week ${week.week_number}: ${days.length} day slot(s) copied`
            );
          } else {
            console.log(`    week ${week.week_number}: no day slots`);
          }
        }
      });
    } else {
      for (const week of weeks) {
        const days = await sql`
          SELECT COUNT(*) AS n FROM program_week_days WHERE program_week_id = ${week.id}
        `;
        console.log(
          `    week ${week.week_number} "${week.label ?? "(no label)"}: ${days[0].n} day slot(s)`
        );
      }
    }
  }

  console.log(dryRun ? "\nDry run complete — no changes written." : "\nBackfill complete.");
}

main().catch(console.error).finally(() => sql.end());

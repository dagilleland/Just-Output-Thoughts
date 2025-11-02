// src/cli.ts
import { Command } from "commander";
import inquirer from "inquirer";
import { getDb, addThought, listThoughts, softDelete } from "./jotRepo.js";

/**
 * Split argv into option tokens and note tokens.
 * Rules:
 *  - Options must come first.
 *  - If `--` is present, everything after it is the note (including tokens starting with '-').
 *  - Otherwise, the first token that doesn't look like an option starts the note.
 */
function splitArgs(argv: string[]) {
  const DASHDASH = argv.indexOf("--");
  if (DASHDASH >= 0) {
    return {
      optv: argv.slice(0, DASHDASH),
      notev: argv.slice(DASHDASH + 1),
      usedDashDash: true,
    };
  }
  const firstNoteIdx = argv.findIndex((t) => !t.startsWith("-"));
  if (firstNoteIdx === -1) {
    return { optv: argv, notev: [] as string[], usedDashDash: false };
  }
  return {
    optv: argv.slice(0, firstNoteIdx),
    notev: argv.slice(firstNoteIdx),
    usedDashDash: false,
  };
}

const raw = process.argv.slice(2);
const { optv, notev, usedDashDash } = splitArgs(raw);

const program = new Command();

program
  .name("jot")
  .description("Just-Output-Thoughts — jot quick notes to a local SQLite DB")
  .option("-l, --list [num]", "List the last N thoughts (default 7). Use -1 for unlimited.", (v) => parseInt(v, 10))
  .option("-d, --delete <id>", "Delete a thought by its numeric id (soft delete).", (v) => parseInt(v, 10))
  .option("-y, --yes", "Skip confirmation prompts (unsafe).")
  .showHelpAfterError();

program.parse(optv, { from: "user" });
const opts = program.opts<{ list?: number | true; delete?: number; yes?: boolean }>();

(async () => {
  const db = getDb();

  // If a note is present, treat this invocation as "add" only.
  if (notev.length) {
    const text = notev.join(" ").trim();
    if (!text) {
      console.error("Nothing to jot. Provide some text.");
      process.exitCode = 1;
      return;
    }

    // Detect any stray option-looking tokens *inside* the note when user forgot to use --.
    if (!usedDashDash) {
      const strayIdx = notev.findIndex((t) => t.startsWith("-"));
      if (strayIdx >= 0) {
        console.warn(
          "⚠️  Detected option-like token inside note. If your note contains words starting with '-', use `--` before the note.\n" +
            "    Example: jot -l 3 -- - this starts with a dash"
        );
      }
    }

    const id = addThought(db, text);
    console.log(`📝 Jotted #${id}: ${text}`);

    // If user passed list/delete together with a note, ignore them (explicit UX).
    if (opts.list !== undefined || Number.isFinite(opts.delete)) {
      console.warn("ℹ️  Ignored flags (-l/-d) because a note was provided. Flags must precede the note and cannot be combined with add.");
    }
    return;
  }

  // Delete flow
  if (Number.isFinite(opts.delete)) {
    let proceed = !!opts.yes;
    if (!proceed) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        { type: "confirm", name: "confirm", message: `Delete thought #${opts.delete}?`, default: false },
      ]);
      proceed = confirm;
    }
    if (proceed) {
      const ok = softDelete(db, Number(opts.delete));
      console.log(ok ? `🗑️  Deleted #${opts.delete}` : `⚠️  Thought #${opts.delete} not found or already deleted`);
    } else {
      console.log("Deletion canceled.");
    }
  }

  // List flow (default 7 when present without value)
  if (opts.list !== undefined) {
    const n = opts.list === true || Number.isNaN(opts.list as number) ? 7 : Number(opts.list);
    const rows = listThoughts(db, n);
    if (rows.length === 0) {
      console.log("No thoughts yet. Try: jot your first thought");
      return;
    }
    for (const r of rows) {
      console.log(`#${r.id}  ${r.text}  ·  ${r.created_at}`);
    }
    return;
  }

  // No flags & no note → show help.
  program.help({ error: false });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

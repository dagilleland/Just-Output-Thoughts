// src/cli.ts
import { Command } from "commander";
import inquirer from "inquirer";
import { getDb, addThought, listThoughts, softDelete } from "./jotRepo.js";

const program = new Command();

program
  .name("jot")
  .description("Just-Output-Thoughts — jot quick notes to a local SQLite DB")
  .argument("[text...]", "Your thought to jot (free text).")
  .option("-l, --list [num]", "List the last N thoughts (default 7). Use -1 for unlimited.", (v) => parseInt(v, 10))
  .option("-d, --delete <id>", "Delete a thought by its numeric id (soft delete).", (v) => parseInt(v, 10))
  .option("-y, --yes", "Skip confirmation prompts (unsafe).")
  .showHelpAfterError();

program.action(async (textParts: string[], opts) => {
  const db = getDb();

  if (textParts?.length) {
    const text = textParts.join(" ").trim();
    if (!text) {
      console.error("Nothing to jot. Provide some text.");
      process.exitCode = 1;
    } else {
      const id = addThought(db, text);
      console.log(`📝 Jotted #${id}: ${text}`);
    }
  }

  if (Number.isFinite(opts.delete)) {
    let proceed = !!opts.yes;
    if (!proceed) {
      const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
        { type: "confirm", name: "confirm", message: `Delete thought #${opts.delete}?`, default: false }
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

  if (opts.list !== undefined) {
    const n = opts.list === true || Number.isNaN(opts.list) ? 7 : Number(opts.list);
    const rows = listThoughts(db, n);
    if (rows.length === 0) {
      console.log("No thoughts yet. Try: jot your first thought");
      return;
    }
    for (const r of rows) {
      console.log(`#${r.id}  ${r.text}  ·  ${r.created_at}`);
    }
  }

  if (!textParts?.length && opts.list === undefined && opts.delete === undefined) {
    program.help({ error: false });
  }
});

program.parseAsync();

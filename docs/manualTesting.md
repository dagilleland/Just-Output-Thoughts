# Manual Testing Guide — `jot` (Just-Output-Thoughts)

This guide helps you exercise the **core flows** (add → list → delete) on your local machine using the built CLI artifact.

> **Prereqs**
>
> - Node **20+** (recommended: latest LTS or 22.x)
> - Since `node:sqlite` is **experimental**, you must enable it when running locally.

---

## 1️⃣ Build the CLI

```
pnpm i
pnpm build
```

Build output is in `dist/` with an executable `cli.mjs` (shebang included).

---

## 2️⃣ Enable SQLite (experimental)

Set the environment variable `NODE_OPTIONS=--experimental-sqlite`.

### macOS / Linux
```
export NODE_OPTIONS=--experimental-sqlite
```

### Windows PowerShell
```
$env:NODE_OPTIONS="--experimental-sqlite"
```

To clear it later:
- bash/zsh → `unset NODE_OPTIONS`
- PowerShell → `Remove-Item Env:\NODE_OPTIONS`

---

## CLI Syntax — `jot`

This section explains how the `jot` command interprets its arguments and flags across different shells.  
It’s designed for **flag-first**, **free-text** input — no quotes required for simple notes.

> *This syntax design keeps `jot` simple and predictable across shells — flags up front, everything else is your thought.* ✍️

---

### 1️⃣ Command structure

```ps
jot [flags...] [--] [your note text...]
```

- **Flags** must come **before** any note text.
- **Note text** is everything that follows the first non-flag token.
- The optional `--` tells `jot` to stop interpreting further tokens as flags —  
  use it when your note contains words that start with `-`.

---

### 2️⃣ Common examples

| Goal | Example |
|------|----------|
| Add a note | `jot Remember to pick up dry cleaning` |
| List last 7 notes | `jot -l` |
| List last 20 notes | `jot -l 20` |
| Delete a note by ID | `jot -d 3` |
| Add a note after listing flag (invalid — will warn) | `jot -l 5 this is ignored` |
| Add a note that starts with `-` | `jot -- - this starts with a dash` |

---

### 3️⃣ Using quotes inside notes

Different shells treat quotes differently.  
If your note includes quotes, use the form appropriate for your shell:

#### **Bash / Zsh / Linux / macOS Terminal**

- Use single quotes around your note if it contains double quotes:

```bash
jot 'He said "ship it" today'
```

- Or escape the quotes:

```bash
jot He\ said\ "ship\ it"\ today
```

#
### **PowerShell (Windows)**
- Use backticks to escape quotes:

```ps
jot He said "ship it" today
```

- Or wrap in single quotes:

```ps
jot 'He said "ship it" today'
```

#
### **Command Prompt (cmd.exe)**

- Double the internal quotes:

```cmd
jot He said ""ship it"" today
```

---

### 4️⃣ Stopping flag parsing (`--`)

If your note begins with a dash or includes option-like tokens, use `--` to mark where the flags end:

```ps
jot -l 3 -- --literally this is part of the note
```


Everything after `--` is treated as plain text.

---

### 5️⃣ Summary of current flags

| Flag | Description |
|------|--------------|
| `-l [num]` | List the last *N* thoughts (default 7; use `-1` for unlimited) |
| `-d <id>` | Delete a thought by its numeric ID |
| `-y` | Skip confirmation prompts |
| `--` | End of flag parsing — treat all following tokens as note text |

---

### 6️⃣ Exit codes

| Code | Meaning |
|------|----------|
| `0` | Success |
| `1` | Invalid usage or other error (e.g., empty note) |

---

### 7️⃣ Tips

- Put all flags **first**, note **last**.  
  Example: `jot -l 5` ✅ but not `jot my note -l 5` ❌
- If you accidentally include a flag-like token in your note without `--`,  
  `jot` will warn and continue saving the note.
- For automation or scripts, use `-y` to bypass confirmation prompts.

---


---

## 3️⃣ Run the CLI (locally, without installing)

### Add a thought
```
node dist/cli.mjs remember to circle back to the learning outcome guides
```

Expected:
```
📝 Jotted #<id>: remember to circle back to the learning outcome guides
```

### List the latest thoughts
```
node dist/cli.mjs -l        # last 7 (default)
node dist/cli.mjs -l 20     # last 20
node dist/cli.mjs -l -1     # unlimited (no paging yet)
```

### Delete a thought (soft delete)
```
node dist/cli.mjs -d <id>       # prompts for confirmation
node dist/cli.mjs -d <id> -y    # no prompt (CI/automation friendly)
```

If you run `-l` again, the deleted id should **not** appear.

---

## 4️⃣ (Optionally) Install globally for a nicer `jot` command

### Using pnpm
```
pnpm link --global
```

### Using npm
```
npm link
```

Then you can run:
```
jot "follow up with DM to Joanne re: feature request"
jot -l
jot -d 3 -y
```

If the shell cannot find `jot`, ensure your global bin path is in `PATH`.

---

## 5️⃣ Where is the database?

By default, the DB is created under an **OS-appropriate per-user data dir**:

| OS | Default directory (via `env-paths`) | Example path |
|----|-------------------------------------|--------------|
| Windows | `%APPDATA%\jot` | `C:\Users\<you>\AppData\Roaming\jot` |
| macOS | `~/Library/Application Support/jot` | `/Users/<you>/Library/Application Support/jot` |
| Linux | `~/.local/share/jot` | `/home/<you>/.local/share/jot` |

Database filename: `jot.db`.

You can override the location with the `JOT_DATA_DIR` environment variable:

### macOS / Linux
```
export JOT_DATA_DIR="/tmp/jot-data"
node dist/cli.mjs "temp db goes here"
```

### Windows PowerShell
```
$env:JOT_DATA_DIR="C:\temp\jot-data"
node dist/cli.mjs "temp db goes here"
```

---

## 6️⃣ Quick sanity checklist

- Add 2–3 thoughts, then `-l` shows newest first.
- Delete one by id; `-l` no longer shows it.
- Use `-l -1` to confirm unlimited listing.
- Restart a fresh shell (without `NODE_OPTIONS`) → expect startup error (SQLite disabled); re-set `NODE_OPTIONS` and rerun.

---

## 7️⃣ Verifying the file on disk (optional)

If you have the `sqlite3` CLI installed:

```
sqlite3 "<path-to-db>/jot.db" ".tables"
sqlite3 "<path-to-db>/jot.db" "SELECT id, text, created_at, deleted_at FROM thoughts ORDER BY created_at DESC LIMIT 5;"
```

You should see your recent thoughts and `deleted_at` as `NULL` for active items.

---

## 8️⃣ Troubleshooting

- **“ExperimentalWarning: SQLite is an experimental feature…”**  
  Expected; harmless for local testing. Keep `NODE_OPTIONS=--experimental-sqlite` set.

- **Windows `EPERM` when deleting temp dirs**  
  Occurs if a DB file is still open. Close the process or rerun after exit (tests now handle this automatically).

- **Global install works but `jot` fails with SQLite errors**  
  Your session may not have `NODE_OPTIONS` set. Re-set it and retry.

- **No output for `-l`**  
  You may have no active thoughts, or `JOT_DATA_DIR` points elsewhere.

---

## 9️⃣ Future manual tests (when features land)

- **Edit**: `-e <index>` updates `text` and `updated_at`.
- **Tags**: add/list/filter tags.
- **Purge**: hard-delete rows (irreversible).
- **Markdown export**: verify generated `.md` output.
- **Interactive mode**: multi-step Inquirer flow (search, pick, act).

---

Happy jotting! ✍️

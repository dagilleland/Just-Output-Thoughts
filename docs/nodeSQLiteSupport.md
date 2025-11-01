# Node-Native SQLite Support (Drop-In Pattern)

This document explains how to enable **Node's built-in SQLite** (`node:sqlite`) in a reusable way.  
It describes three core pieces you can copy into any CLI project:

1. **`src/utils/db.ts`** — Opens a per-user SQLite database in the correct OS-specific data folder.
2. **`bin/sqlite-launcher.mjs`** — A lightweight bootstrap that automatically re-execs Node with `--experimental-sqlite` when needed (Node 22–24).
3. **`tests/utils/db.spec.ts`** — A small Vitest suite that verifies the helper works across platforms.

---

## 💡 Use-Case

When you build a CLI that wants a small persistent store (for notes, cache, logs, settings, etc.),  
Node 22+ already includes SQLite natively — no third-party binaries required.  
However, for Node 22–24, the feature is still *behind a flag*:

```
node --experimental-sqlite
```

Instead of asking every user to set that flag manually, the **launcher** script guarantees that
your CLI runs with SQLite enabled. Combined with the **`db.ts`** helper, you get:

- Zero external database dependencies
- A consistent per-user data path (`env-paths` based)
- Cross-platform support (Windows/macOS/Linux)
- Transparent use inside VS Code, external terminals, or CI

---

## 📂 Files to Copy

### 1. `src/utils/db.ts`

Provides the `openUserDb(appName, opts?)` function:

- Determines the correct per-user data folder with `env-paths`.
- Ensures the folder exists.
- Opens (or creates) a SQLite database using Node's native `DatabaseSync`.

You can import it anywhere in your CLI:

```ts
import { openUserDb } from "./utils/db.js";

const db = openUserDb("my-cli");
db.exec("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, text TEXT)");
```

---

### 2. `bin/sqlite-launcher.mjs`

Acts as the executable entry point for your CLI.
It checks whether `node:sqlite` is available and, if not, re-execs Node with
`--experimental-sqlite` before running your real compiled entry file.

```json
{
  "type": "module",
  "bin": { "my-cli": "./bin/sqlite-launcher.mjs" }
}
```

If you prefer TypeScript, rename to `src/launcher.ts` and have your build emit
`dist/launcher.js`, then point your `bin` to that file instead.

---

### 3. `tests/utils/db.spec.ts`

A small Vitest test that:

- Creates a temporary data directory.
- Opens the database with `openUserDb()`.
- Confirms basic read/write operations succeed.

Use it as a template for validating future projects that reuse this pattern.

---

## 🧩 Integration Steps

1. Copy the three files into your new CLI's `src/utils`, `tests/utils`, and `bin/` folders.
1. Update paths in `sqlite-launcher.mjs` (or `.ts`) to point to your built output
(default assumes `../dist/cli.js`).
1. Update package.json:

    ```json
    {
    "type": "module",
    "bin": { "your-cli": "./bin/sqlite-launcher.mjs" },
    "engines": { "node": ">=22.5" },
    "scripts": {
        "build": "tsup",
        "test": "set NODE_OPTIONS=--experimental-sqlite&& vitest"
    },
    "dependencies": { "env-paths": "^3.0.0" }
    }
    ```

1. Build with `tsup` (or your preferred bundler). Ensure your compiled CLI entry ends up at the path expected by the launcher.
1. Run tests:

    ```ps
    pnpm test
    ```

1. Manual sanity check:

    ```ps
    node ./bin/sqlite-launcher.mjs
    # → prints database path and confirms a working SQLite session
    ```

---

## ⚙️ Configuration Notes

| File             | Purpose                                                         | Common Tweaks                                               |
| ---------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| `package.json`   | Points `bin` to the launcher; defines `engines.node`            | Change the CLI name or build output path                    |
| `tsconfig.json`  | Use `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` | Keeps TypeScript aligned with Node's ESM rules              |
| `tsup.config.ts` | Builds both CLI and launcher                                    | `entry: { cli: "src/cli.ts", launcher: "src/launcher.ts" }` |

---

## 🧪 Typical Developer Workflow

```ps
# build to dist/
pnpm build

# run directly
node ./bin/sqlite-launcher.mjs

# or, after linking globally
pnpm link --global
jot        # your CLI now runs anywhere
```

No environment variables or VS Code tweaks required — the launcher handles the flag automatically.

---

## 🗂 Appendix A — When Node's LTS No Longer Needs the Flag

Future LTS (Node 25 +) removes the `--experimental-sqlite` requirement.
Your launcher already detects that scenario:

- It attempts to `require("node:sqlite")`.
- If successful, it does not re-exec.
- Once all supported LTS versions ship SQLite as stable,
you can safely simplify or delete the re-exec block.

Example future simplification:

```js
// Instead of re-exec logic, simply import your real entry:
import("../dist/cli.js");
```

At that point, you can also drop the `--experimental-sqlite` mention
from your `package.json` test scripts and documentation.

---

## 🗂 Appendix B — Quick Troubleshooting

| Symptom                                           | Likely Cause                                                            | Fix                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| “Failed to load url sqlite (resolved id: sqlite)” | Missing `createRequire` in helper or bundler transforming `node:sqlite` | Use `createRequire(import.meta.url)` as in this template |
| CLI runs but DB never appears                     | Wrong app name passed to `openUserDb()`                                 | Confirm consistent `APP_NAME`                            |
| Tests skipped                                     | Node started without `--experimental-sqlite`                            | Ensure launcher or test script includes the flag         |
| Works in one shell but not another                | Different shell environment                                             | Launcher solves this — verify you're running through it  |

---

## 🧩 Summary

This pattern gives you a self-contained, dependency-light way to use Node's native SQLite:

- `db.ts` — opens the DB in the right per-user folder
- `sqlite-launcher` — guarantees Node has SQLite enabled
- `db.spec.ts` — validates the setup automatically

Copy these three files into any new CLI and adjust only the paths and CLI name.
Future Node versions will make it even simpler, but this setup keeps your tools
working smoothly across all current LTS releases.

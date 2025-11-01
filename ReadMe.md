# Just Output Thoughts

This little cli (`jot`) allows you to quickly capture thoughts in the terminal, allowing you to record and tuck them away so that they don't interfere with your *coding flow*.

## Installing

It's recommended to install this globally on your system.

```ps
npm i -g @dagilleland/jot
```

## Running Locally

If you are building this locally, you can test it on your system with the following:

```ps
pnpm i
pnpm build
node dist/cli.mjs "remember to circle back to the learning outcome guides"
node dist/cli.mjs -l         # list last 7
node dist/cli.mjs -l 20      # list last 20
node dist/cli.mjs -d 3       # delete id 3 (prompts)
node dist/cli.mjs -d 3 -y    # delete without prompt
pnpm test
```


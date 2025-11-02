# Publishing to npmjs.org

> *To save future me from some pain points in memory loss, here's a few notes....*

## Local Check Before Publish

- Build and pack a tarball to sanity-check what will ship:

    ```ps
    pnpm build
    npm pack
    # see what's bundled...
    tar -tf dagilleland-jot-0.1.0.tgz  # or use 7-Zip on Windows
    ```

- Try a local global install of the tarball

    ```ps
    npm i -g .\dagilleland-jot-0.1.0.tgz
    jot "hello from the packed build"
    jot -l
    ```

## Publish Steps

1. `npm login`
1. (Optional but recommended) tag your repo: `git tag v0.1.0 && git push --tags`
1. Publish

    ```ps
    npm publish --provenace
    ```

    (`--provenance` adds supply-chain attestation if your repos is on GitHub Actions with OICD. If you're publishing from local, it can be omitted.)

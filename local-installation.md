# Local installation

This package is currently unpublished (alpha v0.1.0). To use it from another local project:

## Option 1 — `pnpm link`

From this directory:

```bash
pnpm run build
pnpm link --global
```

In your consumer project:

```bash
pnpm link --global @taloon/btcpay-middleware
```

When you change source, re-run `pnpm run build` from this directory — no need to re-link.

## Option 2 — `pnpm pack` + install from tarball

From this directory:

```bash
pnpm run build
pnpm pack
# produces taloon-btcpay-middleware-0.1.0.tgz
```

In your consumer project:

```bash
pnpm add /absolute/path/to/taloon-btcpay-middleware-0.1.0.tgz
```

Re-pack and re-install whenever you change source.

## Option 3 — workspace dependency

If your consumer project lives in the same monorepo and a `pnpm-workspace.yaml` includes `libs/*`, you can declare:

```json
"dependencies": {
  "@taloon/btcpay-middleware": "workspace:*"
}
```

and run `pnpm install` from the workspace root. Build the package first (`pnpm run build` from this directory) so that `dist/` exists before the consumer imports it.

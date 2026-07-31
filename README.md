# @iveri/tsconfig

Shared TypeScript compiler configurations. Every Iveri repo extends one of these instead of
copying compiler options around.

## Install

```bash
pnpm add -D @iveri/tsconfig typescript
```

## Variants

| Variant | Extend from | Use in                                             |
| ------- | ----------- | -------------------------------------------------- |
| `base`  | —           | anything TypeScript; the other two build on it     |
| `nest`  | `base`      | NestJS services (`*-api`, `*-dispatcher`, `*-bff`) |
| `react` | `base`      | React + Vite apps (`*-web`)                        |

### NestJS service

```json
{
    "extends": "@iveri/tsconfig/nest.json",
    "compilerOptions": {
        "outDir": "./dist",
        "baseUrl": "./"
    },
    "include": ["src/**/*", "test/**/*"]
}
```

`nest.json` turns on `experimentalDecorators` + `emitDecoratorMetadata` (NestJS DI and TypeORM
both read that metadata at runtime) and turns **off** `strictPropertyInitialization`, because
entities and DTOs declare `id: string;` with no initializer by design.

`outDir`, `baseUrl` and `include` are **your** repo's, not this package's — see below.

### React + Vite app

```json
{
    "extends": "@iveri/tsconfig/react.json",
    "include": ["src"]
}
```

`react.json` sets `noEmit` — Vite owns the emit, `tsc` only type-checks.

## No path-valued settings are shipped

None of the three variants set `outDir`, `rootDir`, `baseUrl`, `paths`, `include`, `exclude`
or `files`, and a test asserts they never will.

TypeScript resolves every path-valued setting against the config file that **declares** it,
not the one that extends it. A shared `"outDir": "./dist"` therefore means
`node_modules/@iveri/tsconfig/dist` in every consuming repo — `nest build` emits your entire
service in there and leaves the repo with no `dist` at all, silently and with a zero exit
code. `@iveri/tsconfig` 0.1.0 shipped that bug; 0.1.1 fixes it.

Declare those settings in your own `tsconfig.json`, as the examples above do.

## Notes on what is deliberately **not** enabled

- **`noUncheckedIndexedAccess`** is off. It fires mostly on array indexing that surrounding
  code already guards, and the path of least resistance under it is `!`, which defeats the
  strictness it was turned on for. Off is more honest than on-plus-assertions.
- **`exactOptionalPropertyTypes`** is off. It conflicts with how `class-transformer` and
  TypeORM partial updates hand around `undefined`.

Everything else in `strict` is on and stays on.

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

### React + Vite app

```json
{
    "extends": "@iveri/tsconfig/react.json",
    "include": ["src"]
}
```

`react.json` sets `noEmit` — Vite owns the emit, `tsc` only type-checks.

## Notes on what is deliberately **not** enabled

- **`noUncheckedIndexedAccess`** is off. It fires mostly on array indexing that surrounding
  code already guards, and the path of least resistance under it is `!`, which defeats the
  strictness it was turned on for. Off is more honest than on-plus-assertions.
- **`exactOptionalPropertyTypes`** is off. It conflicts with how `class-transformer` and
  TypeORM partial updates hand around `undefined`.

Everything else in `strict` is on and stays on.

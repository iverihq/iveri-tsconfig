# @iveri/tsconfig

Shared TypeScript compiler configurations. Every Iveri repo extends one of these instead of
copying compiler options around. Written for **TypeScript 6**.

## Install

```bash
pnpm add -D @iveri/tsconfig typescript@~6.0.3
```

## Variants

| Variant | Extends | Use in                                                         |
| ------- | ------- | -------------------------------------------------------------- |
| `base`  | —       | strictness and module hygiene every variant shares             |
| `node`  | `base`  | anything Node executes directly: libraries, scripts            |
| `nest`  | `node`  | NestJS services and `@iveri/nest-sdk`                          |
| `react` | `base`  | React apps a bundler (Vite) resolves — never one Node runs raw |

### Node-executed code is native ESM

`node` sets `module` and `moduleResolution` to **`nodenext`**, so the consuming package must be
`"type": "module"`, and every relative import names the file Node will load:

```ts
import { greet } from './greeting.js'; // a file
import { ROLE } from './enum/index.js'; // a directory's barrel
import type { Greeting } from './greeting.js'; // type-only: erased, never loaded
```

`tsc` refuses an extensionless relative import here (TS2835), which is the point — Node would
refuse it at runtime, and finding out in the compiler is cheaper.

### `react` stays on bundler resolution, deliberately

Vite resolves a bundled app, so it uses `moduleResolution: bundler` and keeps extensionless
imports. Its target stays **ES2022**: it type-checks against the browsers the apps support, not
against the Node version that runs the build.

## Choices worth knowing

- **`verbatimModuleSyntax`** in every variant: an import is emitted exactly as written, so a type
  must be imported with `import type` (TS1484 otherwise). It also implies `isolatedModules`, which
  every per-file transpiler — Vite's Oxc, SWC, esbuild — relies on.
- **`types` is set only where it means something.** TypeScript 6 includes no `@types/*` package
  unless named; `node` names `["node"]`, and an app adds its own (`vite/client`, …).
- **`nest` turns on `experimentalDecorators` and `emitDecoratorMetadata`** — NestJS DI and
  TypeORM read that metadata at runtime — and turns **off** `strictPropertyInitialization`,
  because entities and DTOs declare `id: string;` with no initializer by design.
- **Removed in 0.2.0:** `moduleResolution: node` (an error in TypeScript 6),
  `esModuleInterop`/`allowSyntheticDefaultImports` (TypeScript 6's defaults) and
  `resolveJsonModule` (nothing in the fleet imports JSON).

### What is deliberately **not** enabled

- **`noUncheckedIndexedAccess`** is off. It fires mostly on array indexing that surrounding
  code already guards, and the path of least resistance under it is `!`, which defeats the
  strictness it was turned on for. Off is more honest than on-plus-assertions.
- **`exactOptionalPropertyTypes`** is off. It conflicts with how `class-transformer` and
  TypeORM partial updates hand around `undefined`.

## No path-valued settings are shipped

No variant sets `outDir`, `rootDir`, `baseUrl`, `paths`, `include`, `exclude` or `files`, and a
test asserts they never will.

TypeScript resolves every path-valued setting against the config file that **declares** it,
not the one that extends it. A shared `"outDir": "./dist"` therefore means
`node_modules/@iveri/tsconfig/dist` in every consuming repo — `nest build` emits your entire
service in there and leaves the repo with no `dist` at all, silently and with a zero exit
code. `@iveri/tsconfig` 0.1.0 shipped that bug; 0.1.1 fixed it.

Declare those settings in your own `tsconfig.json` — and declare **`rootDir`** too: TypeScript 6
defaults it to the config file's own directory, so a `tsconfig.build.json` beside `src/` would
otherwise emit `dist/src/main.js`.

```jsonc
{
    "extends": "@iveri/tsconfig/nest.json",
    "compilerOptions": { "rootDir": "./src", "outDir": "./dist" },
    "include": ["src/**/*"],
}
```

## Verification

`pnpm test` reads every variant and then **compiles fixtures through it**: an ESM package with
`.js` specifiers compiles; an extensionless import and a type imported as a value are refused
with the expected error codes; the `nest` variant emits `design:paramtypes` as ES modules; the
`react` variant accepts what a bundler resolves. A preset that parses is not the same as one that
means what we think it does.

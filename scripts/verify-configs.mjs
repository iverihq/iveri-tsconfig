/**
 * The tsconfig package ships JSON, so it has no compiler to catch a bad edit.
 * These assertions are the substitute: they fail the build if a variant stops
 * parsing, stops extending base, or quietly loses a setting every repo relies on.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (file) => JSON.parse(readFileSync(resolve(PACKAGE_ROOT, file), 'utf8'));

const base = read('base.json');
const nest = read('nest.json');
const react = read('react.json');

assert.equal(base.compilerOptions.strict, true, 'base must be strict');
assert.equal(base.compilerOptions.declaration, true, 'base must emit declarations');
assert.equal(base.compilerOptions.target, 'ES2023');

assert.equal(nest.extends, './base.json', 'nest must extend base');
assert.equal(nest.compilerOptions.emitDecoratorMetadata, true, 'NestJS DI needs decorator metadata');
assert.equal(nest.compilerOptions.experimentalDecorators, true);
assert.equal(nest.compilerOptions.module, 'commonjs', 'NestJS runs CommonJS');

assert.equal(react.extends, './base.json', 'react must extend base');
assert.equal(react.compilerOptions.jsx, 'react-jsx');
assert.equal(react.compilerOptions.noEmit, true, 'Vite owns the emit, tsc only type-checks');
assert.equal(react.compilerOptions.declaration, false, 'declaration + noEmit is a tsc error');

/**
 * TypeScript resolves every path-valued setting against the config file that *declares* it,
 * not the one that extends it. A shared config that sets `outDir` therefore points at
 * `node_modules/@iveri/tsconfig/dist` in every consumer — `nest build` emits the whole
 * service in there and the repo is left with no `dist`. These settings belong to the
 * consuming repo, always.
 */
const PATH_RELATIVE_OPTIONS = [
    'outDir',
    'rootDir',
    'rootDirs',
    'baseUrl',
    'paths',
    'declarationDir',
    'outFile',
    'tsBuildInfoFile',
    'typeRoots',
];
const PATH_RELATIVE_ROOT_KEYS = ['include', 'exclude', 'files'];

for (const [name, config] of [
    ['base.json', base],
    ['nest.json', nest],
    ['react.json', react],
]) {
    for (const option of PATH_RELATIVE_OPTIONS) {
        assert.ok(
            !(option in (config.compilerOptions ?? {})),
            `${name} sets compilerOptions.${option}, which resolves inside node_modules/@iveri/tsconfig in every consumer`,
        );
    }
    for (const key of PATH_RELATIVE_ROOT_KEYS) {
        assert.ok(
            !(key in config),
            `${name} sets "${key}", which resolves inside node_modules/@iveri/tsconfig in every consumer`,
        );
    }
}

const { files } = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));
for (const variant of ['base.json', 'nest.json', 'react.json']) {
    assert.ok(files.includes(variant), `${variant} is missing from the files allowlist and would not be published`);
}

console.log('@iveri/tsconfig: 3 variants verified');

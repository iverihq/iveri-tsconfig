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

const { files } = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8'));
for (const variant of ['base.json', 'nest.json', 'react.json']) {
    assert.ok(files.includes(variant), `${variant} is missing from the files allowlist and would not be published`);
}

console.log('@iveri/tsconfig: 3 variants verified');

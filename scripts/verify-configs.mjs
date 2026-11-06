/**
 * The tsconfig package ships JSON, so nothing compiles it on its way to npm. This is the
 * substitute, in two halves.
 *
 * The first reads each variant and fails on a lost setting or a path-valued option. The second
 * is the half that matters: it compiles small fixtures through each published variant with the
 * TypeScript this package declares, because a preset that parses is not the same as a preset that
 * means what we think it does. Each fixture pins one promise — nodenext refuses an extensionless
 * import, `verbatimModuleSyntax` refuses a type imported as a value, the NestJS variant emits the
 * metadata dependency injection reads, and the bundler variant accepts what Vite resolves.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const PACKAGE_ROOT = resolve(import.meta.dirname, '..');
const FIXTURES = resolve(PACKAGE_ROOT, 'test', 'fixtures');
const TSC = resolve(PACKAGE_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
const VARIANTS = ['base.json', 'node.json', 'nest.json', 'react.json'];

const read = (file) => JSON.parse(readFileSync(resolve(PACKAGE_ROOT, file), 'utf8'));
const [base, node, nest, react] = VARIANTS.map(read);

assert.equal(base.compilerOptions.strict, true, 'base must be strict');
assert.equal(base.compilerOptions.verbatimModuleSyntax, true, 'base must keep imports exactly as written');
assert.equal(base.compilerOptions.target, 'es2025', 'base targets the language Node 26 runs');

assert.equal(node.extends, './base.json', 'node must extend base');
assert.equal(node.compilerOptions.module, 'nodenext', 'Node-executed code compiles as native ESM');
assert.equal(node.compilerOptions.moduleResolution, 'nodenext');
assert.deepEqual(node.compilerOptions.types, ['node'], 'TypeScript 6 includes no @types unless named');

assert.equal(nest.extends, './node.json', 'nest must extend node');
assert.equal(nest.compilerOptions.emitDecoratorMetadata, true, 'NestJS DI reads decorator metadata');
assert.equal(nest.compilerOptions.experimentalDecorators, true);

assert.equal(react.extends, './base.json', 'react must extend base');
assert.equal(react.compilerOptions.moduleResolution, 'bundler', 'Vite resolves bundled apps, not Node');
assert.equal(react.compilerOptions.noEmit, true, 'Vite owns the emit, tsc only type-checks');
assert.equal(react.compilerOptions.jsx, 'react-jsx');

/**
 * TypeScript resolves every path-valued setting against the config file that *declares* it, not
 * the one that extends it. A shared config that sets `outDir` therefore points at
 * `node_modules/@iveri/tsconfig/dist` in every consumer — `nest build` emits the whole service in
 * there and the repo is left with no `dist`. These settings belong to the consuming repo, always.
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

for (const [index, variant] of VARIANTS.entries()) {
    const config = [base, node, nest, react][index];
    for (const option of PATH_RELATIVE_OPTIONS) {
        assert.ok(
            !(option in (config.compilerOptions ?? {})),
            `${variant} sets compilerOptions.${option}, which resolves inside node_modules/@iveri/tsconfig in every consumer`,
        );
    }
    for (const key of PATH_RELATIVE_ROOT_KEYS) {
        assert.ok(!(key in config), `${variant} sets "${key}", which resolves inside node_modules/@iveri/tsconfig`);
    }
}

const { files } = read('package.json');
for (const variant of VARIANTS) {
    assert.ok(files.includes(variant), `${variant} is missing from the files allowlist and would not be published`);
}

/** Runs the declared TypeScript against one fixture and returns its exit status and diagnostics. */
function compile(fixture, extraArgs = []) {
    const result = spawnSync(
        process.execPath,
        [TSC, '-p', join(FIXTURES, fixture), '--pretty', 'false', ...extraArgs],
        {
            encoding: 'utf8',
        },
    );

    return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const compiles = (fixture) => {
    const { status, output } = compile(fixture);
    assert.equal(status, 0, `${fixture} should compile:\n${output}`);
};

const refuses = (fixture, code) => {
    const { status, output } = compile(fixture);
    assert.notEqual(status, 0, `${fixture} should be refused, and compiled`);
    assert.match(output, new RegExp(`error ${code}:`), `${fixture} should fail with ${code}, got:\n${output}`);
};

compiles('node-esm');
refuses('node-missing-extension', 'TS2835');
refuses('node-untyped-type-import', 'TS1484');
compiles('react-bundler');

const emitted = mkdtempSync(join(tmpdir(), 'iveri-tsconfig-'));
try {
    const { status, output } = compile('nest-metadata', ['--outDir', emitted]);
    assert.equal(status, 0, `nest-metadata should compile:\n${output}`);
    const javascript = readFileSync(join(emitted, 'main.js'), 'utf8');
    assert.match(javascript, /design:paramtypes/u, 'the nest variant must emit constructor parameter metadata');
    assert.match(javascript, /^import |^export /mu, 'the nest variant must emit ES modules, not CommonJS');
} finally {
    rmSync(emitted, { recursive: true, force: true });
}

console.log(`@iveri/tsconfig: ${VARIANTS.length} variants verified, 5 fixtures compiled`);

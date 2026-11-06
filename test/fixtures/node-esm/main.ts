import { readFile } from 'node:fs/promises';

import { greet } from './greeting.js';
import type { Greeting } from './greeting.js';

export async function run(): Promise<Greeting> {
    await readFile(import.meta.filename, 'utf8');
    return greet('fleet');
}

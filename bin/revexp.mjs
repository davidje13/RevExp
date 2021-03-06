#!/usr/bin/env node

import RevExp from '../src/RevExp.mjs';

let pattern = '';
let input = '';
let unknown = '?';
if (process.argv[2]?.startsWith('-u')) {
	unknown = process.argv[2].substr(2, 1);
	pattern = process.argv[3];
	input = process.argv[4];
} else {
	pattern = process.argv[2];
	input = process.argv[3];
}

if (pattern === undefined || input === undefined) {
	process.stderr.write(`Usage:\n  ${process.argv[1]} [-u<c>] <pattern> <input>\n`);
	process.exit(1);
}

try {
	const revexp = new RevExp(pattern);
	const result = revexp.reverse(input, unknown);
	process.stdout.write(`${result}\n`);
} catch (e) {
	process.stderr.write(`${e}\n`);
	process.exit(1);
}

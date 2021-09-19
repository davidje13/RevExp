#!/usr/bin/env node

import RevExpTests from './RevExp.test.mjs';

const suites = [RevExpTests];
const fullResults = { errors: 0, failures: 0, duration: 0 };

const out = { writer: process.stdout, red, green };
for (const suite of suites) {
	const beginTime = Date.now();
	const results = suite(out);
	const endTime = Date.now();
	const duration = endTime - beginTime;
	out.writer.write(`Errors:   ${results.errors}\n`);
	out.writer.write(`Failures: ${results.failures}\n`);
	out.writer.write(`Duration: ${duration}ms\n`);
	out.writer.write('\n');
	fullResults.errors += results.errors;
	fullResults.failures += results.failures;
	fullResults.duration += duration;
}

out.writer.write(`FULL RESULTS\n`);
out.writer.write(`Errors:   ${fullResults.errors}\n`);
out.writer.write(`Failures: ${fullResults.failures}\n`);
out.writer.write(`Duration: ${fullResults.duration}ms\n`);

if (fullResults.errors > 0) {
	out.writer.write(`${red('ERROR')}\n`);
	process.exit(1);
} else if (fullResults.failures > 0) {
	out.writer.write(`${red('FAIL')}\n`);
	process.exit(1);
} else {
	out.writer.write(`${green('PASS')}\n`);
}

function red(v) {
	return `\u001B[0;31m${v}\u001B[0m`;
}

function green(v) {
	return `\u001B[0;32m${v}\u001B[0m`;
}

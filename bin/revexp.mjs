#!/usr/bin/env node

import RevExp from '../src/RevExp.mjs';

let options;
try {
	options = parseArgs(process.argv.slice(2));
} catch (e) {
	if (e.message !== 'help') {
		process.stderr.write(`Error: ${e.message}\n\n`);
	}
	process.stderr.write('Usage:\n');
	process.stderr.write(`  ${process.argv[1]} [options] '<pattern>' ['<input>']\n`);
	process.stderr.write('\n');
	process.stderr.write('Options:\n');
	process.stderr.write('  --help         show this documentation\n');
	process.stderr.write('  -u<character>  set the "unknown" character for the input argument\n');
	process.stderr.write('  -l<length>     auto-generate input as length characters long\n');
	process.stderr.write('                 if length is negative, all solutions of the length\n');
	process.stderr.write('                 or shorter are displayed\n');
	process.stderr.write('  -f             only output successfully if fully resolved\n');
	process.stderr.write('\n');
	process.exit(2);
}

let count = 0;
function showResult(result) {
	if (result === null) {
		return;
	}
	if (options.onlyFull && !result.isSingular()) {
		return;
	}
	++count;
	process.stdout.write(`${result}\n`);
}

try {
	const revexp = new RevExp(options.pattern);
	if (options.input) {
		showResult(revexp.reverse(options.input));
	} else if (options.length >= 0) {
		const input = [];
		for (let i = 0; i < options.length; ++i) {
			input.push(RevExp.CharacterClass.ANY);
		}
		showResult(revexp.reverse(input));
	} else {
		for (const input = []; input.length <= -options.length; input.push(RevExp.CharacterClass.ANY)) {
			showResult(revexp.reverse(input));
		}
	}
	if (!count) {
		process.exit(1);
	}
} catch (e) {
	process.stderr.write(`Error: ${e}\n`);
	process.exit(3);
}

function parseArgs(args) {
	if (!args.length) {
		throw new Error('help');
	}

	let pattern = undefined;
	let input = undefined;
	let unknown = '?';
	let length = undefined;
	let onlyFull = false;
	let literal = false;

	for (let i = 0; i < args.length; ++i) {
		const arg = args[i];
		if (!literal && arg.startsWith('-')) {
			if (arg === '--') {
				literal = true;
				continue;
			}
			if (arg === '--help') {
				throw new Error('help');
			}
			const flag = arg[1];
			const getArgument = () => {
				if (arg.length > 2) {
					return arg.substring(2);
				} else {
					return args[++i];
				}
			};
			const chainNext = () => {
				if (arg.length > 2) {
					args[i] = '-' + arg.substring(2);
					--i;
				}
			};
			switch (flag) {
				case 'u':
					unknown = getArgument();
					break;
				case 'l':
					length = getArgument();
					break;
				case 'f':
					onlyFull = true;
					chainNext();
					break;
				default:
					throw new Error(`Unknown flag: '${flag}'`);
			}
		} else if (pattern === undefined) {
			pattern = arg;
		} else if (input === undefined) {
			input = arg;
		} else {
			throw new Error('Unexpected argument');
		}
	}

	if (pattern === undefined) {
		throw new Error('No pattern specified');
	}

	const options = {
		pattern,
		onlyFull,
		input: undefined,
		length: undefined,
	};

	if (length !== undefined) {
		if (input !== undefined) {
			throw new Error('Cannot provide both input length and input');
		}
		options.length = Number.parseInt(length);
	} else if (input !== undefined) {
		options.input = RevExp.string(input, unknown);
	} else {
		throw new Error('No input specified');
	}

	return options;
}

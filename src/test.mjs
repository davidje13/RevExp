#!/usr/bin/env node

import RevExp from './RevExp.mjs';

const results = runTests([
	['a', // literal
		['?', 'a'],
		['a', 'a'],
		['aa', null],
		['', null],
		['??', null],
		['b', null],
	],

	['ab', // chain
		['??', 'ab'],
	],

	['(a)', // capturing group
		['?', 'a'],
	],

	['(?:a)', // non-capturing group
		['?', 'a'],
	],

	['ab(c)(?:d)(ef)', // nested chain
		['??????', 'abcdef'],
	],

	['a|b', // or
		['?', '[ab]'],
	],

	['a(b|c)(d|e|(f|g))(h)', // complex or
		['????', 'a[bc][d-g]h'],
	],

	['[a-dfghi]', // character class
		['?', '[a-df-i]'],
		['b', 'b'],
		['e', null],
	],

	['[a-cbb]', // character class with overlapping ranges
		['?', '[abc]'],
		['b', 'b'],
		['e', null],
	],

	['\\d', // built-in character class
		['?', '[0-9]'],
	],

	['[^a-dx]', // negated character class
		['?', '[^a-dx]'],
		['e', 'e'],
		['b', null],
	],

	['[a-d][^rt-vZ-W]', // complex character classes
		['?w', '[a-d]w'],
	],

	['^ab$', // anchors
		['?', null],
		['??', 'ab'],
		['???', null],
	],

	['.*^ab$.*',
		['?', null],
		['??', 'ab'],
		['???', null],
	],

	['a^b',
		['??', null],
	],

	['a$b',
		['??', null],
	],

	['x(^|y)z*',
		['???', 'xyz'],
		['xzz', null],
	],

	['(^|x)yz*',
		['???', '[xy][yz]z'],
		['x??', 'xyz'],
		['y??', 'yzz'],
	],

	['a[bcm]|x[myz]', // or with inference
		['??', '[ax][bcmyz]'],
		['a?', 'a[bcm]'],
		['x?', 'x[myz]'],
		['?y', 'xy'],
		['?c', 'ac'],
		['?m', '[ax]m'],
		['ay', null],
		['n?', null],
		['?n', null],
	],

	['a', // quantifier: 1
		['', null],
		['?', 'a'],
		['??', null],
		['???', null],
	],

	['a?', // quantifier: 0-1
		['', ''],
		['?', 'a'],
		['??', null],
		['???', null],
	],

	['a*', // quantifier: 0+
		['', ''],
		['?', 'a'],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['a+', // quantifier: 1+
		['', null],
		['?', 'a'],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['a{2,4}', // quantifier: 2-4
		['', null],
		['?', null],
		['??', 'aa'],
		['???', 'aaa'],
		['????', 'aaaa'],
		['?????', null],
	],

	['a{2}', // quantifier: 2
		['', null],
		['?', null],
		['??', 'aa'],
		['???', null],
	],

	['a{0,2}', // quantifier: 0-2
		['', ''],
		['?', 'a'],
		['??', 'aa'],
		['???', null],
	],

	['a{2,}', // quantifier: 2+
		['', null],
		['?', null],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['abc?', // optional
		['?', null],
		['??', 'ab'],
		['???', 'abc'],
		['????', null],
	],

	[' *a{6} +a{3} *', // complex quantifier (encoded nonogram rule)
		['?????????', null],
		['??????????', 'aaaaaa aaa'],
		['???????????', '[ a]aaaaa[ a][ a]aa[ a]'],
		['????????????', '[ a][ a]aaaa[ a][ a][ a]a[ a][ a]'],
		['?????????????', '[ a][ a][ a]aaa[ a][ a][ a][ a][ a][ a][ a]'],
		['??????????????', '[ a][ a][ a][ a]aa[ a][ a][ a][ a][ a][ a][ a][ a]'],
		['???????????????', '[ a][ a][ a][ a][ a]a[ a][ a][ a][ a][ a][ a][ a][ a][ a]'],
		['????????????????', '[ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a][ a]'],
		['??????a??? ?????', ' [ a][ a][ a]aaa[ a][ a][ a] [ a][ a]a[ a][ a]'],
	],

	['[^a]*a{6}[^a]+a{3}[^a]*', // range recombination
		['???????????', '.aaaaa..aa.'],
	],

	['a*b*', // greedy quantifier
		['???', '[ab][ab][ab]'],
	],

	['a*?b*', // lazy quantifier
		['???', '[ab][ab][ab]'],
	],

	['\\u0020\\u004a\\u004A', // unicode escape
		['???', ' JJ'],
	],

	['[\\u0020\\u004a\\u004A]', // character class unicode escape
		['?', '[ J]'],
	],

	['(\\d|\\u0020)*(x+y?z)+', // complex character class combinations
		['?????', '[ 0-9x][ 0-9xyz][ 0-9xz][xy]z'],
	],

	[/a\.\n/, // escaped literals
		['???', 'a\\u002e\\u000a'],
	],

	['(^)*(a|)*($)*', // stress test (infinite motionless repetition)
		['', ''],
		['?', 'a'],
		['???', 'aaa'],
	],

	['(a*)+b', // stress test (catastrophic backtracking)
		['???', 'aab'],
		['??c', null],
		['aac', null],
		['??????????????????????????????', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaab'],
		['?????????????????????????????c', null],
		['aaaaaaaaaaaaaaaaaaaaaaaaaaaaac', null],
	],

	['a\\b[b&]', // word boundary
		['a&', 'a&'],
		['ab', null],
		//['a?', 'a&'], // TODO
		//['??', 'a&'], // TODO
	],

	['[b&]\\ba', // word boundary reverse
		['&a', '&a'],
		['ba', null],
		//['?a', '&a'], // TODO
		//['??', '&a'], // TODO
	],

	['a\\B[b&]', // word non-boundary
		['ab', 'ab'],
		['a&', null],
		//['a?', 'ab'], // TODO
		//['??', 'ab'], // TODO
	],

	['[b&]\\Ba', // word non-boundary reverse
		['ba', 'ba'],
		['&a', null],
		//['?a', 'ba'], // TODO
		//['??', 'ba'], // TODO
	],

	// TODO
	//['([ab])\\1', // backreference
	//	['??', '[ab][ab]'],
	//	['aa', 'aa'],
	//	['ab', null],
	//	['a?', 'aa'],
	//	['?a', 'aa'],
	//],

	// TODO
	//['(?:([ab])c|xx)?\\1 *', // backreference to optional group
	//	['???', '[abx][cx][ab ]'],
	//	['?c?', '[ab]c[ab]'],
	//	['?x?', 'xx '],
	//	['??', 'xx'],
	//],

	['(a', 'Incomplete token'],
	['[a', 'Incomplete token'],
	['[a-]', 'Incomplete character range'],
	['[a-b-c]', 'Cannot create range using existing ranges'],
	['a{}', 'Invalid character in quantifier'],
	['a{', 'Invalid character in quantifier'],
	['a{1', 'Invalid character in quantifier'],
	['a{1,', 'Invalid character in quantifier'],
	['a{1,2', 'Invalid character in quantifier'],
	['a{,}', 'Invalid character in quantifier'],
	['a{,1}', 'Invalid character in quantifier'],
	['a{1,,}', 'Invalid character in quantifier'],
	['a{1,2,}', 'Invalid character in quantifier'],
	['a{2,1}', 'Invalid quantifier range'],
	['a{a}', 'Invalid character in quantifier'],
	['a{1a}', 'Invalid character in quantifier'],
	['a**', 'Invalid quantifier target'],
	['(?:a*)*', 'Invalid quantifier target'], // maybe this should be allowed? it is allowed by RegExp, but is functionally the same as a**
	['\\', 'Incomplete token'],
	['\\u', 'Incomplete token'],
	['\\u000', 'Incomplete token'],
	['\\uXXXX', 'Invalid hex value \'XXXX\''],
	['\\u{0000', 'Expected \'}\''],
	['\\k<foo', 'Expected \'>\''],
], process.stdout);

process.stdout.write(`Errors:   ${results.errors}\n`);
process.stdout.write(`Failures: ${results.failures}\n`);
process.stdout.write(`Duration: ${results.duration}ms\n`);
if (results.errors > 0) {
	process.stdout.write(`${red('ERROR')}\n`);
	process.exit(1);
} else if (results.failures > 0) {
	process.stdout.write(`${red('FAIL')}\n`);
	process.exit(1);
} else {
	process.stdout.write(`${green('PASS')}\n`);
}

function red(v) {
	return `\u001B[0;31m${v}\u001B[0m`;
}

function green(v) {
	return `\u001B[0;32m${v}\u001B[0m`;
}

function runTests(patterns, out) {
	let errors = 0;
	let failures = 0;

	const pass = green('[PASS]');
	const fail = red('[FAIL]');
	const indent = '  ';
	const indentCont = '         ';

	const beginTime = Date.now();

	patterns.forEach(([pattern, ...tests]) => {
		const expectedError = (tests.length === 1 && typeof tests[0] === 'string') ? tests[0] : null;
		out.write(`- ${pattern}\n`);
		let revexp;
		try {
			revexp = RevExp.compile(pattern);
		} catch (e) {
			if (expectedError) {
				if (e.message.includes(expectedError)) {
					out.write(`${indent}${pass} matched expected compilation error\n\n`);
				} else {
					out.write(`${indent}${fail} unexpected compilation error\n${indentCont}${e}\n${indentCont}expected: ${expectedError}\n\n`);
					++failures;
				}
			} else {
				++errors;
				out.write(`${indent}${fail} compilation error\n${indentCont}${e}\n\n`);
			}
			return;
		}
		if (expectedError) {
			out.write(`${indent}${fail} expected compilation error but did not error\n${indentCont}expected: ${expectedError}\n\n`);
			++failures;
			return;
		}

		for (const [test, answer] of tests) {
			const name = JSON.stringify(test);
			try {
				const result = revexp.reverse(test, '?');
				const sresult = result ? String(result) : null;
				if (sresult === answer) {
					out.write(`${indent}${pass} ${name} => ${JSON.stringify(sresult)}\n`);
				} else {
					out.write(`${indent}${fail} ${name} => ${JSON.stringify(sresult)}\n${indentCont}expected ${JSON.stringify(answer)}\n`);
					++failures;
				}
			} catch (e) {
				out.write(`${indent}${fail} ${name}\n${indentCont}error ${e}\n`);
				++errors;
			}
		}
		out.write('\n');
	});

	const endTime = Date.now();

	return { errors, failures, duration: endTime - beginTime };
}

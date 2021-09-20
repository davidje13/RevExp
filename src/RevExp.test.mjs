import RevExp from './RevExp.mjs';

export default (out) => runTests([
	['a', null, // literal
		['?', 'a'],
		['a', 'a'],
		['aa', null],
		['', null],
		['??', null],
		['b', null],
	],

	['ab', null, // chain
		['??', 'ab'],
	],

	['(a)', null, // capturing group
		['?', 'a'],
	],

	['(?:a)', null, // non-capturing group
		['?', 'a'],
	],

	['ab(c)(?:d)(ef)', null, // nested chain
		['??????', 'abcdef'],
	],

	['a|b', null, // or
		['?', '[ab]'],
	],

	['a(b|c)(d|e|(f|g))(h)', null, // complex or
		['????', 'a[bc][d-g]h'],
	],

	['[a-dfghi]', null, // character class
		['?', '[a-df-i]'],
		['b', 'b'],
		['e', null],
	],

	['[a-cbb]', null, // character class with overlapping ranges
		['?', '[abc]'],
		['b', 'b'],
		['e', null],
	],

	['.', null, // any (default flags)
		['a', 'a'],
		['\n', null],
	],

	['.', '', // any (no 's' flag)
		['a', 'a'],
		['\n', null],
	],

	['.', 's', // any (with 's' flag)
		['a', 'a'],
		['\n', '\\n'],
		['?', '.'],
	],

	['[]', null, // empty character class
		['?', null],
	],

	['[^]', null, // any character class
		['?', '.'],
	],

	['\\d', null, // built-in character class
		['?', '[0-9]'],
	],

	['[^a-dx]', null, // negated character class
		['?', '[^a-dx]'],
		['e', 'e'],
		['b', null],
	],

	['[a-d][^rt-vZ-W]', null, // complex character classes
		['?w', '[a-d]w'],
	],

	['^ab$', null, // anchors
		['?', null],
		['??', 'ab'],
		['???', null],
	],

	['.*^ab$.*', null,
		['?', null],
		['??', 'ab'],
		['???', null],
	],

	['a^b', null,
		['??', null],
	],

	['a$b', null,
		['??', null],
	],

	['.*^a$.*', 's', // anchors (no 'm' flag)
		['a', 'a'],
		['\na', null],
		['a\n', null],
		['?', 'a'],
		['??', null],
	],

	['.*^a$.*', 'ms', // anchors (with 'm' flag)
		['a', 'a'],
		['\na', '\\na'],
		['a\n', 'a\\n'],
		['\na\n', '\\na\\n'],
		['?\n', 'a\\n'],
		['\n?', '\\na'],
		['?', 'a'],
		['?b', null],
		['b?', null],
		['a?', 'a[\\n\\r\\u2028\\u2029]'],
		['?a', '[\\n\\r\\u2028\\u2029]a'],
		['??', '[\\n\\ra\\u2028\\u2029][\\n\\ra\\u2028\\u2029]'],
	],

	['.^a$.', 'ms',
		['???', '[\\n\\r\\u2028\\u2029]a[\\n\\r\\u2028\\u2029]'],
	],

	['\\n^a$\\n', 'm',
		['a', null],
		['\na\n', '\\na\\n'],
		['???', '\\na\\n'],
	],

	['x(^|y)z*', null,
		['???', 'xyz'],
		['xzz', null],
	],

	['(^|x)yz*', null,
		['???', '[xy][yz]z'],
		['x??', 'xyz'],
		['y??', 'yzz'],
	],

	['a[bcm]|x[myz]', null, // or with inference
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

	['a', null, // quantifier: 1
		['', null],
		['?', 'a'],
		['??', null],
		['???', null],
	],

	['a?', null, // quantifier: 0-1
		['', ''],
		['?', 'a'],
		['??', null],
		['???', null],
	],

	['a*', null, // quantifier: 0+
		['', ''],
		['?', 'a'],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['a+', null, // quantifier: 1+
		['', null],
		['?', 'a'],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['a{2,4}', null, // quantifier: 2-4
		['', null],
		['?', null],
		['??', 'aa'],
		['???', 'aaa'],
		['????', 'aaaa'],
		['?????', null],
	],

	['a{2}', null, // quantifier: 2
		['', null],
		['?', null],
		['??', 'aa'],
		['???', null],
	],

	['a{0,2}', null, // quantifier: 0-2
		['', ''],
		['?', 'a'],
		['??', 'aa'],
		['???', null],
	],

	['a{2,}', null, // quantifier: 2+
		['', null],
		['?', null],
		['??', 'aa'],
		['???', 'aaa'],
	],

	['abc?', null, // optional
		['?', null],
		['??', 'ab'],
		['???', 'abc'],
		['????', null],
	],

	[' *a{6} +a{3} *', null, // complex quantifier (encoded nonogram rule)
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

	['[^a]*a{6}[^a]+a{3}[^a]*', null, // range recombination
		['???????????', '.aaaaa..aa.'],
	],

	['a*b*', null, // greedy quantifier
		['???', '[ab][ab][ab]'],
	],

	['a*?b*', null, // lazy quantifier
		['???', '[ab][ab][ab]'],
	],

	['\\u0020\\u004a\\u004A', null, // unicode escape
		['???', ' JJ'],
	],

	['[\\u0020\\u004a\\u004A]', null, // character class unicode escape
		['?', '[ J]'],
	],

	['(\\d|\\u0020)*(x+y?z)+', null, // complex character class combinations
		['?????', '[ 0-9x][ 0-9xyz][ 0-9xz][xy]z'],
	],

	[/a\.\n/, null, // escaped literals
		['???', 'a\\.\\n'],
	],

	['(^)*(a|)*($)*', null, // stress test (infinite motionless repetition)
		['', ''],
		['?', 'a'],
		['???', 'aaa'],
	],

	['(a*)+b', null, // stress test (catastrophic backtracking)
		['???', 'aab'],
		['??c', null],
		['aac', null],
		['??????????????????????????????', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaab'],
		['?????????????????????????????c', null],
		['aaaaaaaaaaaaaaaaaaaaaaaaaaaaac', null],
	],

	['a\\b[b&]', null, // word boundary
		['a&', 'a&'],
		['ab', null],
		['a?', 'a&'],
		//['??', 'a&'], // TODO
	],

	['[b&]\\ba', null, // word boundary reverse
		['&a', '&a'],
		['ba', null],
		['?a', '&a'],
		['??', '&a'],
	],

	['a\\B[b&]', null, // word non-boundary
		['ab', 'ab'],
		['a&', null],
		['a?', 'ab'],
		//['??', 'ab'], // TODO
	],

	['[b&]\\Ba', null, // word non-boundary reverse
		['ba', 'ba'],
		['&a', null],
		['?a', 'ba'],
		['??', 'ba'],
	],

	['([ab])(c)\\1', null, // backreference
		['???', '[ab]c[ab]'],
		['aca', 'aca'],
		//['acb', null], // TODO
		//['a??', 'aca'], // TODO
		//['??a', 'aca'], // TODO
	],

	['(?<foo>[ab])(c)\\k<foo>', null, // named backreference
		['???', '[ab]c[ab]'],
	],

	['(?<foo>[ab])(c)\\2', null,
		['???', '[ab]cc'],
	],

	['(a)(b)\\2\\1', null,
		['????', 'abba'],
		//['??', null], // TODO
		['?????', null],
	],

	['(a)(\\1)\\2', null,
		['???', 'aaa'],
	],

	['(.)(\\1)\\2', null,
		//['a??', 'aaa'], // TODO
		//['?b?', 'bbb'], // TODO
		//['??c', 'ccc'], // TODO
	],

	['(?:([ab])c|xx)?\\1 *', null, // backreference to optional group
		['???', '[ abx][ cx][ ab]'],
		//['?c?', '[ab]c[ab]'], // TODO
		//['?x?', 'xx '], // TODO
		//['??', '[ x][ x]'], // TODO
	],

	['(a', null, 'Incomplete token'],
	['[a', null, 'Incomplete token'],
	['[a-]', null, 'Incomplete character range'],
	['[a-b-c]', null, 'Cannot create range using existing ranges'],
	['a{}', null, 'Invalid character in quantifier'],
	['a{', null, 'Invalid character in quantifier'],
	['a{1', null, 'Invalid character in quantifier'],
	['a{1,', null, 'Invalid character in quantifier'],
	['a{1,2', null, 'Invalid character in quantifier'],
	['a{,}', null, 'Invalid character in quantifier'],
	['a{,1}', null, 'Invalid character in quantifier'],
	['a{1,,}', null, 'Invalid character in quantifier'],
	['a{1,2,}', null, 'Invalid character in quantifier'],
	['a{2,1}', null, 'Invalid quantifier range'],
	['a{a}', null, 'Invalid character in quantifier'],
	['a{1a}', null, 'Invalid character in quantifier'],
	['a**', null, 'Invalid quantifier target'],
	['(?:a*)*', null, 'Invalid quantifier target'], // maybe this should be allowed? it is allowed by RegExp, but is functionally the same as a**
	['(?nope)', null, 'Invalid group flags'],
	['\\', null, 'Incomplete token'],
	['\\u', null, 'Incomplete token'],
	['\\u000', null, 'Incomplete token'],
	['\\uXXXX', null, 'Invalid hex value \'XXXX\''],
	['\\u{0000', null, 'Expected \'}\''],
	['\\k<foo', null, 'Expected \'>\''],
	['\\1', null, 'Backreference to unknown group 1'],
	['(?:x)\\1', null, 'Backreference to unknown group 1'],
	['(x)\\2', null, 'Backreference to unknown group 2'],
	['\\1(x)', null, 'Backreference to unknown group 1'],
	['(\\1)', null, 'Backreference to unknown group 1'],
	['\\k<foo>', null, 'Backreference to unknown group \'foo\''],
], out);

function runTests(patterns, { writer, red, green }) {
	writer.write('RevExp\n');

	let errors = 0;
	let failures = 0;

	const pass = green('[PASS]');
	const fail = red('[FAIL]');
	const indent = '  ';
	const indentCont = '         ';

	patterns.forEach(([pattern, flags, ...tests]) => {
		const expectedError = (tests.length === 1 && typeof tests[0] === 'string') ? tests[0] : null;
		writer.write(`- ${pattern}  ${flags ?? ''}\n`);
		let revexp;
		try {
			revexp = RevExp.compile(pattern, flags);
		} catch (e) {
			if (expectedError) {
				if (e.message.includes(expectedError)) {
					writer.write(`${indent}${pass} matched expected compilation error\n\n`);
				} else {
					writer.write(`${indent}${fail} unexpected compilation error\n${indentCont}${e}\n${indentCont}expected: ${expectedError}\n\n`);
					++failures;
				}
			} else {
				++errors;
				writer.write(`${indent}${fail} compilation error\n${indentCont}${e}\n\n`);
			}
			return;
		}
		if (expectedError) {
			writer.write(`${indent}${fail} expected compilation error but did not error\n${indentCont}expected: ${expectedError}\n\n`);
			++failures;
			return;
		}

		for (const [test, answer] of tests) {
			const name = JSON.stringify(test);
			try {
				const result = revexp.reverse(test, '?');
				const sresult = result ? String(result) : null;
				if (sresult === answer) {
					writer.write(`${indent}${pass} ${name} => ${JSON.stringify(sresult)}\n`);
				} else {
					writer.write(`${indent}${fail} ${name} => ${JSON.stringify(sresult)}\n${indentCont}expected ${JSON.stringify(answer)}\n`);
					++failures;
				}
			} catch (e) {
				writer.write(`${indent}${fail} ${name}\n${indentCont}error ${e}\n`);
				++errors;
			}
		}
		writer.write('\n');
	});

	return { errors, failures };
}

import ConsumableString from './ConsumableString.mjs';
import CharacterClass from '../CharacterClass.mjs';
import {
	Assertion,
	BoundaryAssertion,
	PosAssertion,
	BackReference,
	Quantifier,
	Chain,
	Choice,
	CapturingGroup,
	REWIND_CHAR,
	OR,
} from './nodes.mjs';

const CHAR_A = 'A'.charCodeAt(0);
const HEX_CHECK = /^[0-9a-fA-F]+$/;
const readHex = (v) => {
	if (!HEX_CHECK.test(v)) {
		throw new Error(`Invalid hex value '${v}'`);
	}
	return Number.parseInt(v, 16);
};

const CHAR_ESC = new Map([
	['t', CharacterClass.of('\t')],
	['r', CharacterClass.of('\r')],
	['n', CharacterClass.of('\n')],
	['v', CharacterClass.of('\v')],
	['f', CharacterClass.of('\f')],
	['b', CharacterClass.of('\b')],
	['0', CharacterClass.of('\u0000')],
	['c', (cs) => CharacterClass.ofCode(1 + cs.get(1).charCodeAt(0) - CHAR_A)],
	['x', (cs) => CharacterClass.ofCode(readHex(cs.get(2)))],
	['u', (cs) => {
		const code = cs.check('{') ? cs.readUntil('}', true) : cs.get(4);
		return CharacterClass.ofCode(readHex(code));
	}],
	['\\', CharacterClass.of('\\')],
]);
const CHAR_CLASS_ESC = new Map([
	...CHAR_ESC,
	['d', CharacterClass.NUMERIC],
	['D', CharacterClass.NUMERIC.inverse()],
	['w', CharacterClass.WORD],
	['W', CharacterClass.WORD.inverse()],
	['s', CharacterClass.SPACE],
	['S', CharacterClass.SPACE.inverse()],
]);
const ESC = new Map([
	...CHAR_CLASS_ESC.entries(),
	['b', new BoundaryAssertion(CharacterClass.WORD, false)],
	['B', new BoundaryAssertion(CharacterClass.WORD, true)],
	['k', (cs, context) => {
		if (!cs.check('<')) {
			throw new Error('Incomplete named backreference');
		}
		const name = cs.readUntil('>', true);
		const ref = context.groupNames.get(name);
		if (!ref) {
			throw new Error(`Backreference to unknown group '${name}'`);
		}
		return new BackReference(ref);
	}],
]);
for (let i = 1; i < 10; ++ i) {
	ESC.set(String(i), (cs, context) => {
		const ref = context.groupNumbers[i - 1];
		if (!ref) {
			throw new Error(`Backreference to unknown group ${i}`);
		}
		return new BackReference(ref);
	});
}

function resolve(lookup, cs, c, context) {
	const v = lookup.get(c) ?? CharacterClass.of(c);
	return (typeof v === 'function') ? v(cs, context) : v;
}

const readQuantifierMode = (cs) => {
	if (cs.check('?')) {
		return 'lazy';
	} else {
		return 'greedy';
	}
};

const readQuantifier = (cs) => {
	const min = cs.readInt();
	if (min === null) {
		throw new Error(`Invalid character in quantifier at ${cs.pos}`);
	}
	const max = cs.check(',') ? cs.readInt() : min;
	if (!cs.check('}')) {
		throw new Error(`Invalid character in quantifier at ${cs.pos}`);
	}
	return new Quantifier(min, max, readQuantifierMode(cs));
};

const _readCharacterClass = (cs, context) => {
	const invert = cs.check('^');
	const allowSets = context.flags.unicodeSets;
	const allowStrings = context.flags.unicodeSets;
	const parts = [];
	const strings = new Set();
	const stringParts = new Set();
	let chars = CharacterClass.NONE;
	let op = 'union';
	let nextRange = false;
	const endSection = () => {
		if (nextRange) {
			throw new Error(`Incomplete character range at ${cs.pos}`);
		}
		const chars2 = CharacterClass.union(...parts);
		if (op === 'intersect') {
			chars = chars.intersect(chars2);
			const l = new Set(strings);
			for (const p of stringParts) {
				l.delete(p);
			}
			for (const p of l) {
				strings.delete(p);
			}
		} else if (op === 'subtract') {
			chars = chars.intersect(chars2.inverse());
			for (const p of stringParts) {
				strings.delete(p);
			}
		} else {
			chars = chars.union(chars2);
			for (const p of stringParts) {
				strings.add(p);
			}
		}
		parts.length = 0;
		stringParts.clear();
	};
	for (let c; (c = cs.get()) !== ']';) {
		if (allowSets && c === '[') {
			const sub = _readCharacterClass(cs, context);
			parts.push(sub.chars);
			stringParts.add(sub.strings);
		} else if (allowSets && c === '&' && cs.check('&')) {
			endSection();
			op = 'intersect';
		} else if (allowSets && c === '-' && cs.check('-')) {
			endSection();
			op = 'subtract';
		} else if (allowStrings && c === '\\' && cs.check('q{')) {
			const s = [];
			for (let c2; (c2 = cs.get()) !== '}';) {
				if (c2 === '|') {
					stringParts.add(s.join(''));
					s.length = 0;
				} else if (c2 === '\\') {
					s.push(resolve(CHAR_ESC, cs, cs.get(), context).singularChar());
				} else {
					s.push(c2);
				}
			}
			stringParts.add(s.join(''));
		} else if (c === '-' && parts.length > 0 && !nextRange) {
			nextRange = true;
		} else {
			let part = (c === '\\')
				? resolve(CHAR_CLASS_ESC, cs, cs.get(), context)
				: CharacterClass.of(c);
			if (nextRange) {
				nextRange = false;
				part = parts.pop().rangeTo(part);
			}
			parts.push(part);
		}
	}
	endSection();
	if (invert) {
		if (strings.size > 0) {
			// TODO: is this possible somehow?
			throw new Error('Cannot invert quoted strings');
		}
		return { chars: chars.inverse(), strings: [] };
	}
	return { chars, strings };
};

const readCharacterClass = (cs, context) => {
	const { chars, strings } = _readCharacterClass(cs, context);
	const options = [];
	for (const s of strings) {
		options.push(toChain([...s].map(CharacterClass.of)));
	}
	if (!chars.isEmpty()) {
		options.push(chars);
	}
	return options.length === 1 ? options[0] : new Choice(options);
};

const getGroupMode = (cs) => {
	if (!cs.check('?')) {
		return { type: 'capturing', name: null };
	}
	if (cs.check(':')) {
		return { type: 'inline' };
	} else if (cs.check('=')) {
		return { type: 'lookahead', inverted: false };
	} else if (cs.check('!')) {
		return { type: 'lookahead', inverted: true };
	} else if (cs.check('<=')) {
		return { type: 'lookbehind', inverted: false };
	} else if (cs.check('<!')) {
		return { type: 'lookbehind', inverted: true };
	} else if (cs.check('<')) {
		return { type: 'capturing', name: cs.readUntil('>', true) };
	}
	throw new Error(`Invalid group flags at ${cs.pos}`);
}

function toChain(tokens) {
	if (tokens.length === 1) {
		return tokens[0];
	}
	const elements = [];
	for (const token of tokens) {
		if (token instanceof Chain) {
			elements.push(...token.elements);
		} else {
			elements.push(token);
		}
	}
	return new Chain(elements);
}

function postProc(tokens) {
	const options = [];
	let curChain = [];
	for (const token of tokens) {
		if (token === OR) {
			options.push(toChain(curChain));
			curChain = [];
		} else if (token instanceof Quantifier) {
			const target = curChain.pop();
			if (!target || target instanceof Quantifier) {
				throw new Error('Invalid quantifier target');
			}
			curChain.push(token.withTarget(target));
		} else {
			curChain.push(token);
		}
	}
	if (!options.length) {
		return toChain(curChain);
	}
	options.push(toChain(curChain));
	return new Choice(options);
}

const SPECIALS = new Map([
	['\\', (cs, context) => resolve(ESC, cs, cs.get(), context)],
	['^', (cs, context) => context.begin],
	['$', (cs, context) => context.end],
	['|', OR],
	['.', (cs, context) => context.any],
	['?', (cs) => new Quantifier(0, 1, readQuantifierMode(cs))],
	['+', (cs) => new Quantifier(1, null, readQuantifierMode(cs))],
	['*', (cs) => new Quantifier(0, null, readQuantifierMode(cs))],
	['(', (cs, context) => {
		const mode = getGroupMode(cs);
		const tokens = [];
		for (let c; (c = cs.get()) !== ')';) {
			tokens.push(resolve(SPECIALS, cs, c, context));
		}
		const inner = postProc(tokens);
		switch (mode.type) {
			case 'capturing':
				const group = new CapturingGroup(mode.name, inner);
				context.groupNumbers.push(group);
				if (mode.name) {
					context.groupNames.set(mode.name, group);
				}
				return group;
			case 'inline':
				return inner;
			default:
				return new Assertion(mode.type, mode.inverted, inner);
		}
	}],
	['{', readQuantifier],
	['[', readCharacterClass],
]);

export default function toAST(pattern, flags) {
	const context = {
		flags,
		any: flags.dotAll ? CharacterClass.ANY : CharacterClass.NEWLINE.inverse(),
		begin: flags.multiline ? new Choice([new Chain([REWIND_CHAR, CharacterClass.NEWLINE]), PosAssertion.BEGIN]) : PosAssertion.BEGIN,
		end: flags.multiline ? new Choice([new Chain([CharacterClass.NEWLINE, REWIND_CHAR]), PosAssertion.END]) : PosAssertion.END,
		groupNumbers: [],
		groupNames: new Map(),
	};

	const tokens = [];
	for (const cs = new ConsumableString(pattern); !cs.end();) {
		tokens.push(resolve(SPECIALS, cs, cs.get(), context));
	}
	return postProc(tokens);
}

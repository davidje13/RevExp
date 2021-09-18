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

const ESC = new Map([
	['d', CharacterClass.NUMERIC],
	['D', CharacterClass.NUMERIC.inverse()],
	['w', CharacterClass.WORD],
	['W', CharacterClass.WORD.inverse()],
	['s', CharacterClass.SPACE],
	['S', CharacterClass.SPACE.inverse()],
	['t', CharacterClass.of('\t')],
	['r', CharacterClass.of('\r')],
	['n', CharacterClass.of('\n')],
	['v', CharacterClass.of('\v')],
	['f', CharacterClass.of('\f')],
	['b', new BoundaryAssertion(CharacterClass.WORD, false)],
	['B', new BoundaryAssertion(CharacterClass.WORD, true)],
	['0', CharacterClass.of('\u0000')],
	['c', (cs) => CharacterClass.ofCode(1 + cs.get(1).charCodeAt(0) - CHAR_A)],
	['x', (cs) => CharacterClass.ofCode(readHex(cs.get(2)))],
	['u', (cs) => {
		const code = cs.check('{') ? cs.readUntil('}', true) : cs.get(4);
		return CharacterClass.ofCode(readHex(code));
	}],
	['\\', CharacterClass.of('\\')],
	['k', (cs) => {
		if (!cs.check('<')) {
			throw new Error('Incomplete named backreference');
		}
		return new BackReference(cs.readUntil('>', true));
	}],
]);
const CHAR_CLASS_ESC = new Map(ESC);
CHAR_CLASS_ESC.set('b', CharacterClass.of('\b'));
CHAR_CLASS_ESC.delete('B');
CHAR_CLASS_ESC.delete('k');
for (let i = 1; i < 10; ++ i) {
	ESC.set(String(i), new BackReference(i));
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

const readCharacterClass = (cs, context) => {
	const invert = cs.check('^');
	const parts = [];
	let nextRange = false;
	for (let c; (c = cs.get()) !== ']';) {
		if (c === '-' && parts.length > 0) {
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
	if (nextRange) {
		throw new Error(`Incomplete character range at ${cs.pos}`);
	}
	const chars = CharacterClass.union(...parts);
	return invert ? chars.inverse() : chars;
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
	['^', new PosAssertion(0)],
	['$', new PosAssertion(-1)],
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
			case 'capturing': return new CapturingGroup(mode.name, inner);
			case 'inline': return inner;
			default: return new Assertion(mode.type, mode.inverted, inner);
		}
	}],
	['{', readQuantifier],
	['[', readCharacterClass],
]);

export default function toAST(pattern, flags) {
	const context = {
		flags,
		any: flags.dotAll ? CharacterClass.ANY : CharacterClass.NEWLINE.inverse(),
	};

	const tokens = [];
	for (const cs = new ConsumableString(pattern); !cs.end();) {
		tokens.push(resolve(SPECIALS, cs, cs.get(), context));
	}
	return postProc(tokens);
}

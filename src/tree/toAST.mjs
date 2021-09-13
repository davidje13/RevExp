import ConsumableString from './ConsumableString.mjs';
import CharacterRange from '../CharacterRange.mjs';
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
	['d', CharacterRange.NUMERIC],
	['D', CharacterRange.NUMERIC.inverse()],
	['w', CharacterRange.ALPHA_NUMERIC],
	['W', CharacterRange.ALPHA_NUMERIC.inverse()],
	['s', CharacterRange.SPACE],
	['S', CharacterRange.SPACE.inverse()],
	['t', CharacterRange.of('\t')],
	['r', CharacterRange.of('\r')],
	['n', CharacterRange.of('\n')],
	['v', CharacterRange.of('\v')],
	['f', CharacterRange.of('\f')],
	['b', new BoundaryAssertion(CharacterRange.ALPHA_NUMERIC, false)],
	['B', new BoundaryAssertion(CharacterRange.ALPHA_NUMERIC, true)],
	['0', CharacterRange.of('\u0000')],
	['c', (cs) => CharacterRange.ofCode(1 + cs.get(1).charCodeAt(0) - CHAR_A)],
	['x', (cs) => CharacterRange.ofCode(readHex(cs.get(2)))],
	['u', (cs) => {
		const code = cs.check('{') ? cs.readUntil('}', true) : cs.get(4);
		return CharacterRange.ofCode(readHex(code));
	}],
	['\\', CharacterRange.of('\\')],
	['k', (cs) => {
		if (!cs.check('<')) {
			throw new Error('Incomplete named backreference');
		}
		return new BackReference(cs.readUntil('>', true));
	}],
]);
const RANGE_ESC = new Map(ESC);
RANGE_ESC.set('b', CharacterRange.of('\b'));
RANGE_ESC.delete('B');
RANGE_ESC.delete('k');
for (let i = 1; i < 10; ++ i) {
	ESC.set(String(i), new BackReference(i));
}

function resolve(lookup, cs, c) {
	const v = lookup.get(c) ?? CharacterRange.of(c);
	return (typeof v === 'function') ? v(cs) : v;
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

const readRange = (cs) => {
	const invert = cs.check('^');
	const parts = [];
	let nextRange = false;
	for (let c; (c = cs.get()) !== ']';) {
		if (c === '-' && parts.length > 0) {
			nextRange = true;
		} else {
			let part = (c === '\\') ? resolve(RANGE_ESC, cs, cs.get()) : CharacterRange.of(c);
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
	const range = CharacterRange.union(...parts);
	return invert ? range.inverse() : range;
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
	['\\', (cs) => resolve(ESC, cs, cs.get())],
	['^', new PosAssertion(0)],
	['$', new PosAssertion(-1)],
	['|', OR],
	['.', CharacterRange.ANY],
	['?', (cs) => new Quantifier(0, 1, readQuantifierMode(cs))],
	['+', (cs) => new Quantifier(1, null, readQuantifierMode(cs))],
	['*', (cs) => new Quantifier(0, null, readQuantifierMode(cs))],
	['(', (cs) => {
		const mode = getGroupMode(cs);
		const tokens = [];
		for (let c; (c = cs.get()) !== ')';) {
			tokens.push(resolve(SPECIALS, cs, c));
		}
		const inner = postProc(tokens);
		switch (mode.type) {
			case 'capturing': return new CapturingGroup(mode.name, inner);
			case 'inline': return inner;
			default: return new Assertion(mode.type, mode.inverted, inner);
		}
	}],
	['{', readQuantifier],
	['[', readRange],
]);

export default function toAST(pattern) {
	const tokens = [];
	for (const cs = new ConsumableString(pattern); !cs.end();) {
		tokens.push(resolve(SPECIALS, cs, cs.get()));
	}
	return postProc(tokens);
}

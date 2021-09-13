import CharacterRange from './CharacterRange.mjs';
import ConsumableString from './ConsumableString.mjs';
import ASTNode from './ASTNode.mjs';

const CHAR_A = 'A'.charCodeAt(0);
const HEX_CHECK = /^[0-9a-fA-F]+$/;
const mod = (a, b) => (((a % b) + b) % b);
const readHex = (v) => {
	if (!HEX_CHECK.test(v)) {
		throw new Error(`Invalid hex value '${v}'`);
	}
	return Number.parseInt(v, 16);
};

class Assertion extends ASTNode {
	constructor(mode, inverted, condition = null) {
		super('assertion');
		this.mode = mode;
		this.inverted = inverted;
		this.condition = condition;
	}

	toGraph() {
		throw new Error('Assertions are not currently supported');
	}
}

class BoundaryAssertion extends ASTNode {
	constructor(range, inverted) {
		super('boundary-assertion');
		this.range = range;
		this.invRange = range.inverse();
		this.inverted = inverted;
	}

	toGraph(nexts) {
		const end = [{ advance: -1, nexts }];
		if (this.inverted) {
			return [{ advance: -1, nexts: [
				...this.range.toGraph(this.range.toGraph(end)),
				...this.invRange.toGraph(this.invRange.toGraph(end)),
			] }];
		} else {
			return [{ advance: -1, nexts: [
				...this.range.toGraph(this.invRange.toGraph(end)),
				...this.invRange.toGraph(this.range.toGraph(end)),
			] }];
		}
	}
}

class PosAssertion extends ASTNode {
	constructor(pos) {
		super('position-assertion');
		this.pos = pos;
	}

	toGraph(nexts) {
		return [{ pos: this.pos, nexts }];
	}
}

class BackReference extends ASTNode {
	constructor(ref) {
		super('backreference');
		this.ref = ref;
	}

	toGraph() {
		throw new Error('Backreferences are not currently supported');
	}
}

class Quantifier extends ASTNode {
	constructor(min, max, mode, target = null) {
		super('quantifier');
		this.min = min;
		this.max = max;
		this.mode = mode;
		this.target = target;

		if (this.max !== null && this.max < this.min) {
			throw new Error(`Invalid quantifier range: ${min} - ${max}`);
		}
	}

	withTarget(target) {
		return new Quantifier(this.min, this.max, this.mode, target);
	}

	toGraph(nexts) {
		const branch = (this.mode === 'lazy')
			? ((ns) => [...nexts, ...ns])
			: ((ns) => [...ns, ...nexts]);

		let ns;
		if (this.max === null) {
			const looper = { nexts: [] };
			looper.nexts = this.target.toGraph(branch([looper]));
			ns = [looper];
			for (let i = this.min - 1; i > 0; --i) {
				ns = this.target.toGraph(ns);
			}
		} else {
			ns = [];
			for (let i = this.max; i > 0; --i) {
				ns = this.target.toGraph((i >= this.min) ? branch(ns) : ns);
			}
		}
		return (this.min === 0) ? branch(ns) : ns;
	}
}

class Chain extends ASTNode {
	constructor(elements) {
		super('chain');
		this.elements = elements;
	}

	toGraph(nexts) {
		let ns = nexts;
		for (let i = this.elements.length; (i--) > 0;) {
			ns = this.elements[i].toGraph(ns);
		}
		return ns;
	}
}

class Choice extends ASTNode {
	constructor(options) {
		super('choice');
		this.options = options;
	}

	toGraph(nexts) {
		const r = [];
		for (const option of this.options) { // flatMap
			r.push(...option.toGraph(nexts));
		}
		return r;
	}
}

class CapturingGroup extends ASTNode {
	constructor(name, target) {
		super('group');
		this.name = name;
		this.target = target;
	}

	toGraph(nexts) {
		return this.target.toGraph(nexts);
	}
}

const OR = new ASTNode('or');

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

function toAST(pattern) {
	const tokens = [];
	for (const cs = new ConsumableString(pattern); !cs.end();) {
		tokens.push(resolve(SPECIALS, cs, cs.get()));
	}
	return postProc(tokens);
}

function check(positions, pos, rule) {
	if (rule.pos !== undefined) {
		if (pos !== mod(rule.pos, positions.length)) {
			return false; // position assertion failed
		}
	}
	if (rule.range) {
		if (!positions[pos].inputRange.intersects(rule.range)) {
			return false;
		}
	}
	return true;
}

export default class RevExp {
	constructor(pattern, flags = null) {
		if (pattern instanceof RegExp || pattern instanceof RevExp) {
			this.source = pattern.source;
			this.flags = flags ?? pattern.flags;
		} else {
			this.source = String(pattern);
			this.flags = flags ?? '';
		}
		this.dotAll = this.flags.includes('s'); // todo (currently assumes true)
		this.global = this.flags.includes('g'); // irrelevant
		this.hasIndices = this.flags.includes('d'); // irrelevant
		this.ignoreCase = this.flags.includes('i'); // todo (currently assumes false)
		this.sticky = this.flags.includes('y'); // irrelevant
		this.unicode = this.flags.includes('u'); // todo (currently assumes false)

		const ast = toAST(this.source);
		this.endNode = { nexts: [] };
		this.beginNodes = ast.toGraph([this.endNode]);
	}

	reverse(value) {
		const ranges = CharacterRange.string(value);
		const length = ranges.length;

		// add virtual "end state" position
		ranges.push(CharacterRange.NONE);

		const positions = ranges.map((range) => ({
			inputRange: range,
			states: new Map(),
			resolved: CharacterRange.NONE,
		}));

		let active = [{
			pos: -1,
			prevs: [],
			nexts: this.beginNodes,
			nextPos: 0,
			node: null,
		}];
		while (active.length) {
			const nextActive = [];
			for (const a of active) {
				const pos = a.nextPos;
				if (pos < 0 || pos > length) {
					continue;
				}
				const { states } = positions[pos];
				for (const n of a.nexts) {
					const existingState = states.get(n);
					if (existingState) {
						existingState.prevs.push(a);
					} else if (check(positions, pos, n)) {
						const state = {
							pos,
							prevs: [a],
							nexts: n.nexts,
							nextPos: pos + (n.advance ?? 0),
							node: n,
						};
						states.set(n, state);
						nextActive.push(state);
					}
				}
			}
			active = nextActive;
		}

		const endState = positions[length].states.get(this.endNode);
		if (!endState) {
			return null;
		}

		active = [endState];
		while (active.length) {
			const nextActive = [];
			for (const a of active) {
				if (!a.node) {
					continue;
				}
				const p = positions[a.pos];
				if (a.node.range) {
					p.resolved = p.resolved.union(a.node.range);
				}
				nextActive.push(...a.prevs);
				a.node = null;
			}
			active = nextActive;
		}

		positions.pop(); // remove trailing end-of-input
		return positions.map((p) => (p.inputRange.intersect(p.resolved)));
	}

	test(value) {
		return this.reverse(value) !== null;
	}

	toString() {
		return this.pattern;
	}
}

RevExp.compile = (p) => new RevExp(p);

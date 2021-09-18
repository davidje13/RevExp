import CharacterClass from './CharacterClass.mjs';
import CharacterClassString from './CharacterClassString.mjs';
import toAST from './tree/toAST.mjs';

const mod = (a, b) => (((a % b) + b) % b);

function check(positions, pos, rule) {
	if (rule.pos !== undefined) {
		if (pos !== mod(rule.pos, positions.length)) {
			return false; // position assertion failed
		}
	}
	if (rule.chars) {
		if (!positions[pos].inputChars.intersects(rule.chars)) {
			return false;
		}
	}
	return true;
}

function parseFlags(flags) {
	return {
		dotAll: flags.includes('s'),
		global: flags.includes('g'),
		hasIndices: flags.includes('d'),
		ignoreCase: flags.includes('i'),
		sticky: flags.includes('y'),
		unicode: flags.includes('u'),
	};
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
		const parsedFlags = parseFlags(this.flags);
		Object.assign(this, parsedFlags);

		const ast = toAST(this.source, parsedFlags);
		this.endNode = { nexts: [] };
		this.beginNodes = ast.toGraph([this.endNode]);
	}

	reverse(value, unknown = null) {
		const inputCharsString = CharacterClassString(value, unknown);
		const length = inputCharsString.length;

		// add virtual "end state" position
		inputCharsString.push(CharacterClass.NONE);

		const positions = inputCharsString.map((chars) => ({
			inputChars: chars,
			states: new Map(),
			resolved: CharacterClass.NONE,
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
				if (a.node.chars) {
					p.resolved = p.resolved.union(a.node.chars);
				}
				nextActive.push(...a.prevs);
				a.node = null;
			}
			active = nextActive;
		}

		positions.pop(); // remove trailing end-of-input
		return CharacterClassString(positions.map((p) => (p.inputChars.intersect(p.resolved))));
	}

	test(value, unknown = null) {
		return this.reverse(value, unknown) !== null;
	}

	toString() {
		return this.pattern;
	}
}

RevExp.compile = (pattern, flags) => new RevExp(pattern, flags);
RevExp.CharacterClass = CharacterClass;
RevExp.string = CharacterClassString;

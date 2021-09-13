import CharacterRange from './CharacterRange.mjs';
import toAST from './tree/toAST.mjs';

const mod = (a, b) => (((a % b) + b) % b);

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

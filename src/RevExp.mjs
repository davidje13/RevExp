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
		hasIndices: flags.includes('d'),
		global: flags.includes('g'),
		ignoreCase: flags.includes('i'),
		multiline: flags.includes('m'),
		dotAll: flags.includes('s'),
		unicode: flags.includes('u'),
		sticky: flags.includes('y'),
	};
}

function reduceGraph(begin, fn, initial = null) {
	const visited = new Set();
	const active = [begin];
	let v = initial;
	while (active.length) {
		const a = active.pop();
		v = fn(a, v);
		for (const next of a.nexts) {
			if (!visited.has(next)) {
				active.push(next);
				visited.add(next);
			}
		}
	}
	return v;
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
		this.graphContainsLoops = true; // TODO: check if graph contains loops
		this.graphContainsOverwrites = reduceGraph({ nexts: this.beginNodes }, (n, v) => (v || n.advance < 0), false);
	}

	reverse(value, unknown = null) {
		const inputCharsString = CharacterClassString(value, unknown);
		const length = inputCharsString.length;

		// add virtual "end state" position
		const positions = [...inputCharsString, CharacterClass.NONE].map((chars) => ({
			inputChars: chars,
			states: new Map(),
		}));

		const checkLoops = this.graphContainsLoops && this.graphContainsOverwrites;
		const beginState = {
			pos: -1,
			prevs: [],
			nexts: this.beginNodes,
			nextPos: 0,
			node: null,
			remaining: 0,
			history: checkLoops ? new Set() : null,
			solution: null,
		};
		// breadth-first so that we avoid loops if found
		let active = [beginState];
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
						if (!checkLoops) {
							existingState.prevs.push(a);
						} else if (!a.history.has(existingState)) { // avoid loops in result
							existingState.prevs.push(a);
							for (const hist of a.history) {
								existingState.history.add(hist);
							}
						}
					} else if (check(positions, pos, n)) {
						const state = {
							pos,
							prevs: [a],
							nexts: n.nexts,
							nextPos: pos + (n.advance ?? 0),
							node: n,
							remaining: 0,
							history: checkLoops ? new Set(a.history) : null,
							solution: null,
						};
						state.history?.add(state);
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

		if (!this.graphContainsOverwrites) {
			const solution = inputCharsString.map(() => CharacterClass.NONE);

			active = [endState];
			while (active.length) {
				const a = active.pop();
				if (a.node?.chars) {
					solution[a.pos] = solution[a.pos].union(a.node.chars);
				}
				for (const prev of a.prevs) {
					if ((++prev.remaining) === 1) {
						active.push(prev);
					}
				}
			}

			return CharacterClassString(solution.map((p, i) => (inputCharsString[i].intersect(p))));
		}

		active = [endState];
		while (active.length) {
			const a = active.pop();
			for (const prev of a.prevs) {
				if ((++prev.remaining) === 1) {
					active.push(prev);
				}
			}
		}

		endState.solution = inputCharsString;
		active = [endState];
		while (active.length) {
			const a = active.pop();
			if (a.solution && a.node?.chars) {
				const combined = a.solution[a.pos].intersect(a.node.chars);
				if (combined.isEmpty()) {
					a.solution = null;
				} else {
					a.solution[a.pos] = combined;
				}
			}
			for (const prev of a.prevs) {
				if (a.solution) {
					if (!prev.solution) {
						prev.solution = [...a.solution];
					} else {
						for (let i = 0; i < inputCharsString.length; ++i) {
							prev.solution[i] = prev.solution[i].union(a.solution[i]);
						}
					}
				}
				if ((--prev.remaining) === 0) {
					active.push(prev);
				}
			}
		}

		if (!beginState.solution) {
			return null;
		}

		return CharacterClassString(beginState.solution);
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

export class Assertion {
	constructor(mode, inverted, condition = null) {
		this.mode = mode;
		this.inverted = inverted;
		this.condition = condition;
	}

	toGraph() {
		throw new Error('Assertions are not currently supported');
	}
}

export class BoundaryAssertion {
	constructor(chars, inverted) {
		this.chars = chars;
		this.invChars = chars.inverse();
		this.inverted = inverted;
	}

	toGraph(nexts) {
		const end = [{ advance: -1, nexts }];
		if (this.inverted) {
			return [{ advance: -1, nexts: [
				...this.chars.toGraph(this.chars.toGraph(end)),
				...this.invChars.toGraph(this.invChars.toGraph(end)),
			] }];
		} else {
			return [{ advance: -1, nexts: [
				...this.chars.toGraph(this.invChars.toGraph(end)),
				...this.invChars.toGraph(this.chars.toGraph(end)),
			] }];
		}
	}
}

export class PosAssertion {
	constructor(pos) {
		this.pos = pos;
	}

	toGraph(nexts) {
		return [{ pos: this.pos, nexts }];
	}
}
PosAssertion.BEGIN = new PosAssertion(0);
PosAssertion.END = new PosAssertion(-1);

export class BackReference {
	constructor(ref) {
		this.ref = ref;
	}

	toGraph(nexts) {
		// this is currently a very lax definition of a backreference which allows anything that would
		// match the original pattern (or blank since the original pattern could have been skipped)
		return [...this.ref.toGraph(nexts), ...nexts];
	}
}

export class Quantifier {
	constructor(min, max, mode, target = null) {
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

export class Chain {
	constructor(elements) {
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

export class Choice {
	constructor(options) {
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

export class CapturingGroup {
	constructor(name, target) {
		this.name = name;
		this.target = target;
	}

	toGraph(nexts) {
		return this.target.toGraph(nexts);
	}
}

class AdvanceChar {
	constructor(advance) {
		this.advance = advance;
	}

	toGraph(nexts) {
		return [{ advance: this.advance, nexts }];
	}
}
export const REWIND_CHAR = new AdvanceChar(-1);

export const OR = Symbol();

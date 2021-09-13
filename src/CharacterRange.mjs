const escapeSpecial = (special, v) => v.replace(special, (x) => `\\u${x.charCodeAt(0).toString(16).padStart(4, '0')}`);
const escapeSpecialRegular = escapeSpecial.bind(null, /[^-a-zA-Z0-9 ,:;'"!@%&_=<>`~]/g);
const escapeSpecialCharRange = escapeSpecial.bind(null, /[^a-zA-Z0-9 ,:;'"!@%&_=<>`~(){}.?+*$]/g);
const printRange = (chars) => {
	let begin = 0;
	let p = -2;
	const r = [];
	for (let i = 0; i <= chars.length; ++i) {
		const v = (i === chars.length) ? -2 : chars[i].charCodeAt(0);
		if (v !== p + 1) {
			const n = i - begin;
			begin = i;
			if (n > 1) {
				if (n === 3) {
					r.push(escapeSpecialCharRange(chars[i - 2]));
				} else if (n > 3) {
					r.push('-');
				}
				r.push(escapeSpecialCharRange(chars[i - 1]));
			}
			if (i < chars.length) {
				r.push(escapeSpecialCharRange(chars[i]));
			}
		}
		p = v;
	}
	return r.join('');
};

export default class CharacterRange {
	constructor(chars, inverted = false) {
		this.chars = chars;
		this.inverted = inverted;
	}

	includes(c) {
		return ((this.chars.indexOf(c) !== -1) !== this.inverted);
	}

	isEmpty() {
		return !this.chars.length && !this.inverted;
	}

	isSingular() {
		return (this.chars.length === 1) && !this.inverted;
	}

	singularChar() {
		if (!this.isSingular()) {
			throw new Error('Not singular');
		}
		return this.chars[0];
	}

	intersects(other) {
		if (this.inverted && other.inverted) {
			return true;
		}
		if (!this.inverted) {
			if (!other.chars.length) {
				return other.inverted;
			}
			return this.chars.some((c) => other.includes(c));
		}
		if (!this.chars.length) {
			return true;
		}
		return other.chars.some((c) => this.includes(c));
	}

	intersect(other) {
		if (!this.inverted) {
			if (!other.chars.length) {
				return other.inverted ? this : other;
			}
			return new CharacterRange(this.chars.filter((c) => other.includes(c)), false);
		}
		if (!other.inverted) {
			if (!this.chars.length) {
				return this.inverted ? other : this;
			}
			return new CharacterRange(other.chars.filter((c) => this.includes(c)), false);
		}
		if (!this.chars.length || !other.chars.length) {
			return this.chars.length ? this : other;
		}
		const all = new Set(this.chars);
		for (const b of other.chars) {
			all.add(b);
		}
		return new CharacterRange([...all], true);
	}

	union(other) {
		if (this.inverted) {
			if (!other.chars.length) {
				return other.inverted ? other : this;
			}
			return new CharacterRange(this.chars.filter((c) => !other.includes(c)), true);
		}
		if (other.inverted) {
			if (!this.chars.length) {
				return this.inverted ? this : other;
			}
			return new CharacterRange(other.chars.filter((c) => !this.includes(c)), true);
		}
		if (!this.chars.length || !other.chars.length) {
			return this.chars.length ? this : other;
		}
		const all = new Set(this.chars);
		for (const b of other.chars) {
			all.add(b);
		}
		return new CharacterRange([...all], false);
	}

	rangeTo(other) {
		if (!this.isSingular() || !other.isSingular()) {
			throw new Error('Cannot create range using existing ranges');
		}
		return CharacterRange.range(this.singularChar(), other.singularChar());
	}

	inverse() {
		return new CharacterRange(this.chars, !this.inverted);
	}

	toGraph(nexts) {
		return [{ range: this, advance: 1, nexts }];
	}

	toString() {
		if (!this.chars.length) {
			return this.inverted ? '.' : '\\u0000';
		}
		this.chars.sort(); // char code ordering
		if (this.inverted) {
			return `[^${printRange(this.chars)}]`;
		} else if (this.chars.length === 1) {
			return escapeSpecialRegular(this.chars[0]);
		} else {
			return `[${printRange(this.chars)}]`;
		}
	}
}

CharacterRange.ANY = new CharacterRange([], true);
CharacterRange.NONE = new CharacterRange([], false);
CharacterRange.of = (chars) => new CharacterRange([...chars]);
CharacterRange.ofCode = (code) => new CharacterRange([String.fromCharCode(code)]);
CharacterRange.range = (a, b) => {
	const ac = a.charCodeAt(0);
	const bc = b.charCodeAt(0);
	const v = [];
	for (let i = Math.min(ac, bc); i <= Math.max(ac, bc); ++i) {
		v.push(String.fromCharCode(i));
	}
	return new CharacterRange(v);
};
CharacterRange.union = (...r) => r.reduce((a, b) => a.union(b));
CharacterRange.string = (value, unknown = null) => {
	if (Array.isArray(value) && value.length > 0 && value[0] instanceof CharacterRange) {
		return value;
	}
	return [...value].map((c) => (c === unknown) ? CharacterRange.ANY : new CharacterRange([c]));
};
CharacterRange.print = (values) => values.map((v) => v.toString()).join('');

CharacterRange.NUMERIC = CharacterRange.range('0', '9');
CharacterRange.ALPHA_NUMERIC = CharacterRange.union(
	CharacterRange.range('a', 'z'),
	CharacterRange.range('A', 'Z'),
	CharacterRange.NUMERIC,
	CharacterRange.of('_'),
);
CharacterRange.SPACE = CharacterRange.of([
	' ', '\f', '\n', '\r', '\t', '\v',
	'\u00a0', '\u1680', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF',
]).union(CharacterRange.range('\u2000', '\u200A'));

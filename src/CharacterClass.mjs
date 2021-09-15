const escapeSpecial = (special, v) => v.replace(special, (x) => `\\u${x.charCodeAt(0).toString(16).padStart(4, '0')}`);
const escapeSpecialRegular = escapeSpecial.bind(null, /[^-a-zA-Z0-9 ,:;'"!@%&_=<>`~]/g);
const escapeSpecialCharRange = escapeSpecial.bind(null, /[^a-zA-Z0-9 ,:;'"!@%&_=<>`~(){}.?+*$]/g);
const printChars = (chars) => {
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

export default class CharacterClass {
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
				return this.chars.length > 0 && other.inverted;
			}
			return this.chars.some((c) => other.includes(c));
		}
		if (!this.chars.length) {
			return other.chars.length > 0;
		}
		return other.chars.some((c) => this.includes(c));
	}

	intersect(other) {
		if (!this.inverted) {
			if (!other.chars.length) {
				return other.inverted ? this : other;
			}
			return new CharacterClass(this.chars.filter((c) => other.includes(c)), false);
		}
		if (!other.inverted) {
			if (!this.chars.length) {
				return this.inverted ? other : this;
			}
			return new CharacterClass(other.chars.filter((c) => this.includes(c)), false);
		}
		if (!this.chars.length || !other.chars.length) {
			return this.chars.length ? this : other;
		}
		const all = new Set(this.chars);
		for (const b of other.chars) {
			all.add(b);
		}
		return new CharacterClass([...all], true);
	}

	union(other) {
		if (this.inverted) {
			if (!other.chars.length) {
				return other.inverted ? other : this;
			}
			return new CharacterClass(this.chars.filter((c) => !other.includes(c)), true);
		}
		if (other.inverted) {
			if (!this.chars.length) {
				return this.inverted ? this : other;
			}
			return new CharacterClass(other.chars.filter((c) => !this.includes(c)), true);
		}
		if (!this.chars.length || !other.chars.length) {
			return this.chars.length ? this : other;
		}
		const all = new Set(this.chars);
		for (const b of other.chars) {
			all.add(b);
		}
		return new CharacterClass([...all], false);
	}

	rangeTo(other) {
		if (!this.isSingular() || !other.isSingular()) {
			throw new Error('Cannot create range using existing ranges');
		}
		return CharacterClass.range(this.singularChar(), other.singularChar());
	}

	inverse() {
		return new CharacterClass(this.chars, !this.inverted);
	}

	toGraph(nexts) {
		return [{ chars: this, advance: 1, nexts }];
	}

	toString() {
		if (!this.chars.length) {
			return this.inverted ? '.' : '[]';
		}
		this.chars.sort(); // char code ordering
		if (this.inverted) {
			return `[^${printChars(this.chars)}]`;
		} else if (this.chars.length === 1) {
			return escapeSpecialRegular(this.chars[0]);
		} else {
			return `[${printChars(this.chars)}]`;
		}
	}
}

CharacterClass.ANY = new CharacterClass([], true);
CharacterClass.NONE = new CharacterClass([], false);
CharacterClass.of = (chars) => new CharacterClass([...chars]);
CharacterClass.ofCode = (code) => new CharacterClass([String.fromCharCode(code)]);
CharacterClass.range = (a, b) => {
	const ac = a.charCodeAt(0);
	const bc = b.charCodeAt(0);
	const v = [];
	for (let i = Math.min(ac, bc); i <= Math.max(ac, bc); ++i) {
		v.push(String.fromCharCode(i));
	}
	return new CharacterClass(v);
};
CharacterClass.union = (...r) => r.reduce((a, b) => a.union(b), CharacterClass.NONE);

CharacterClass.NUMERIC = CharacterClass.range('0', '9');
CharacterClass.ALPHA_NUMERIC = CharacterClass.union(
	CharacterClass.range('a', 'z'),
	CharacterClass.range('A', 'Z'),
	CharacterClass.NUMERIC,
	CharacterClass.of('_'),
);
CharacterClass.SPACE = CharacterClass.of([
	' ', '\f', '\n', '\r', '\t', '\v',
	'\u00a0', '\u1680', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000', '\uFEFF',
]).union(CharacterClass.range('\u2000', '\u200A'));

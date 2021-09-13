const CHAR_0 = '0'.charCodeAt(0);

export default class ConsumableString {
	constructor(string) {
		this.data = string;
		this.pos = 0;
		this.length = string.length;
	}

	get(n = 1) {
		if (this.pos + n > this.length) {
			throw new Error(`Incomplete token at ${this.pos} '${this.data}'`);
		}
		this.pos += n;
		return this.data.substr(this.pos - n, n);
	}

	check(v) {
		const n = v.length;
		if (this.pos + n > this.length) {
			return false;
		}
		if (this.data.substr(this.pos, n) === v) {
			this.pos += n;
			return true;
		}
		return false;
	}

	readUntil(v, check = false) {
		const begin = this.pos;
		const n = v.length;
		for (; this.pos + n <= this.length; ++this.pos) {
			if (this.data.substr(this.pos, n) === v) {
				break;
			}
		}
		if (check && !this.check(v)) {
			throw new Error(`Expected '${v}' after ${begin} '${this.data}'`);
		}
		return this.data.substring(begin, this.pos);
	}

	readInt() {
		let val = null;
		for (; this.pos < this.length; ++this.pos) {
			const v = this.data.charCodeAt(this.pos) - CHAR_0;
			if (v < 0 || v > 9) {
				break;
			}
			val = (val ?? 0) * 10 + v;
		}
		return val;
	}

	end() {
		return this.pos >= this.length;
	}
}

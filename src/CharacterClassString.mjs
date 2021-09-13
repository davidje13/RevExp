import CharacterClass from './CharacterClass.mjs';

function TO_STRING() {
	return this.map((v) => v.toString()).join('');
}

export default (value, unknown = null) => {
	let r = [...value];
	if (r.length > 0 && !(r[0] instanceof CharacterClass)) {
		r = r.map((c) => (c === unknown) ? CharacterClass.ANY : new CharacterClass([c]));
	}
	Object.defineProperty(r, 'toString', { value: TO_STRING });
	return r;
};

import CharacterClass from './CharacterClass.mjs';

describe('CharacterClass', () => {
	test('union with inverse returns ANY', () => {
		const base = CharacterClass.WORD;
		const unioned = base.union(base.inverse());
		expect(String(unioned), equals('.'));
	});
});

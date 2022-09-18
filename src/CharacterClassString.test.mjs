import CharacterClassString from './CharacterClassString.mjs';
import CharacterClass from './CharacterClass.mjs';

describe('CharacterClassString', () => {
	test('generates an array of character classes from a string', () => {
		const str = CharacterClassString('hello');
		expect(str, hasLength(5));
		expect(str[0].isSingular(), isTrue());
		expect(str[0].singularChar(), equals('h'));
	});

	test('substitutes the unknown character', () => {
		const str = CharacterClassString('hello', 'l');
		expect(str[2], same(CharacterClass.ANY));
	});

	test('provides a convenient toString method', () => {
		const str1 = CharacterClassString('hello');
		expect(str1.toString(), equals('hello'));

		const str2 = CharacterClassString('hello', 'l');
		expect(str2.toString(), equals('he..o'));
	});

	test('provides a convenient isSingular method', () => {
		const str1 = CharacterClassString('hello');
		expect(str1.isSingular(), isTrue());

		const str2 = CharacterClassString('hello', 'l');
		expect(str2.isSingular(), isFalse());
	});
});

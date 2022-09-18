declare namespace RevExp {
	class CharacterClass {
		public includes(char: string): boolean;
		public isEmpty(): boolean;
		public isSingular(): boolean;
		public singularChar(): string;
		public equals(other: CharacterClass): boolean;
		public intersects(other: CharacterClass): boolean;
		public intersect(other: CharacterClass): CharacterClass;
		public union(other: CharacterClass): CharacterClass;
		public rangeTo(other: CharacterClass): CharacterClass;
		public inverse(): CharacterClass;

		public static readonly ANY: CharacterClass;
		public static readonly NONE: CharacterClass;
		public static readonly NUMERIC: CharacterClass;
		public static readonly WORD: CharacterClass;
		public static readonly NEWLINE: CharacterClass;
		public static readonly SPACE: CharacterClass;

		public static of(chars: string | string[]): CharacterClass;
		public static ofCode(code: number): CharacterClass;
		public static range(a: string, b: string): CharacterClass;
		public static union(...classes: CharacterClass[]): CharacterClass;
	}

	type CharacterClassString = CharacterClass[] & { isSingular(): boolean };
}

declare class RevExp {
	public constructor(
		pattern: string | RegExp | RevExp,
		flags?: string | null | undefined,
	);

	public reverse(
		value: string | string[] | RevExp.CharacterClass[],
		unknown?: string | null | undefined,
	): RevExp.CharacterClassString | null;

	public test(
		value: string | string[] | RevExp.CharacterClass[],
		unknown?: string | null | undefined,
	): boolean;

	public readonly source: string;
	public readonly flags: string;
	public readonly hasIndices: boolean;
	public readonly global: boolean;
	public readonly ignoreCase: boolean;
	public readonly multiline: boolean;
	public readonly dotAll: boolean;
	public readonly unicode: boolean;
	public readonly sticky: boolean;

	public static compile(pattern: string, flags?: string | null | undefined): RevExp;

	public static string(
		value: string | string[] | RevExp.CharacterClass[],
		unknown?: string | null | undefined,
	): RevExp.CharacterClassString;
}

export default RevExp;

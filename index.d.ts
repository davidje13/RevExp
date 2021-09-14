declare module 'revexp' {
	class CharacterClass {
		public includes(char: string): boolean;
		public isEmpty(): boolean;
		public isSingular(): boolean;
		public singularChar(): string;
		public intersects(other: CharacterClass): boolean;
		public intersect(other: CharacterClass): CharacterClass;
		public union(other: CharacterClass): CharacterClass;
		public rangeTo(other: CharacterClass): CharacterClass;
		public inverse(): CharacterClass;

		public static readonly ANY: CharacterClass;
		public static readonly NONE: CharacterClass;
		public static readonly NUMERIC: CharacterClass;
		public static readonly ALPHA_NUMERIC: CharacterClass;
		public static readonly SPACE: CharacterClass;

		public static of(chars: string | string[]): CharacterClass;
		public static ofCode(code: number): CharacterClass;
		public static range(a: string, b: string): CharacterClass;
		public static union(...classes: CharacterClass[]): CharacterClass;
	}

	class RevExp {
		public constructor(
			pattern: string | RegExp | RevExp,
			flags?: string | null | undefined,
		);

		public reverse(
			value: string | string[] | CharacterClass[],
			unknown?: string | null | undefined,
		): CharacterClass[] | null;

		public test(
			value: string | string[] | CharacterClass[],
			unknown?: string | null | undefined,
		): boolean;

		public readonly source: string;
		public readonly flags: string;
		public readonly dotAll: boolean;
		public readonly global: boolean;
		public readonly hasIndices: boolean;
		public readonly ignoreCase: boolean;
		public readonly sticky: boolean;
		public readonly unicode: boolean;

		public static readonly CharacterClass: typeof CharacterClass;

		public static compile(pattern: string): RevExp;

		public static string(
			value: string | string[] | CharacterClass[],
			unknown?: string | null | undefined,
		): CharacterClass[];
	}

	export default RevExp;
}

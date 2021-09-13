import { terser } from 'rollup-plugin-terser';

export default {
	input: 'src/index.mjs',
	output: [
		{
			file: 'build/index.js',
			format: 'umd',
			name: 'revexp',
		},
	],
	plugins: [terser()],
};

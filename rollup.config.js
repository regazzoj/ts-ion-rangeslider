import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import postcss from "rollup-plugin-postcss";

import {main, style} from './package.json'

const name = main.replace(/\.js$/, '');

const bundle = config => ({
    ...config,
    input: 'src/index.ts',
    external: id => !/^[./]/.test(id),
})

export default [
    bundle({
        output: {
            file: `${name}.js`,
            format: 'es',
            sourcemap: true,
        },
        plugins: [esbuild({minify: true})]
    }),
    bundle({
        plugins: [dts()],
        output: {
            file: `${name}.d.ts`,
            format: 'es',
        },
    }),
    {
        input: 'src/styles/main.less',
        output: [{
            file: style
        }],
        plugins: [postcss({extract: true, minimize: true})]
    }
]
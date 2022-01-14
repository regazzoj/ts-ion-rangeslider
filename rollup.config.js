import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'
import postcss from "rollup-plugin-postcss";

import { style } from './package.json'

const fileName = 'ts-ion-range-slider'

const commonConfig = {
    external: id => !/^[./]/.test(id),
    input: 'src/index.ts',
    output: {
        name: 'TsIonRangeSlider',
        sourcemap: true
    },
    plugins: []
}

// ESM config
const esmConfig = Object.assign({}, commonConfig);
esmConfig.output = Object.assign({}, commonConfig.output, {
    file: `dist/mjs/${fileName}.mjs`,
    format: 'esm'
});
esmConfig.plugins = [
    ...esmConfig.plugins,
    esbuild({bundle: true})
];

// ESM prod config
const esmProdConfig = Object.assign({}, esmConfig);
esmProdConfig.output = Object.assign({}, esmConfig.output, {
    file: `dist/mjs/${fileName}.min.mjs`,
    sourcemap: false
});
esmProdConfig.plugins = [
    ...esmConfig.plugins,
    esbuild({bundle: true, minify: true})
];

// UMD config
const umdConfig = Object.assign({}, commonConfig);
umdConfig.output = Object.assign({}, commonConfig.output, {
    file: `dist/umd/${fileName}.js`,
    format: 'umd'
});
umdConfig.plugins = [
    ...commonConfig.plugins,
    esbuild({bundle: true})

];

// Production config
const umdProdConfig = Object.assign({}, umdConfig);
umdProdConfig.output = Object.assign({}, umdConfig.output, {
    file: `dist/umd/${fileName}.min.js`,
    sourcemap: false
});
umdProdConfig.plugins = [
    ...umdConfig.plugins,
    esbuild({bundle: true, minify: true})
];

export default [
    esmConfig,
    esmProdConfig,
    umdConfig,
    umdProdConfig,
    {
        input: "typings/index.d.ts",
        plugins: [dts()],
        output: {
            file: `dist/typings/${fileName}.d.ts`,
            format: 'es',
        },
    },
    {
        input: 'src/styles/main.less',
        output: [{
            file: style
        }],
        plugins: [postcss({extract: true, minimize: true})]
    }
]
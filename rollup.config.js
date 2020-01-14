const vue = require('rollup-plugin-vue');
const babel = require('rollup-plugin-babel');
const { terser } = require('rollup-plugin-terser');
const resolve = require('rollup-plugin-node-resolve');
// const commonjs = require('rollup-plugin-commonjs');

const isProduction = process.env.NODE_ENV === 'production';

export default {
  input: 'src/index.js',
  output: {
    file: isProduction
      ? 'dist/vuen-echarts.min.js'
      : 'dist/vuen-echarts.js',
    name: 'VueNECharts',
    format: 'umd',
    globals: {
      vue: 'Vue',
      'echarts/lib/echarts': 'echarts'
    }
  },
  external: ['vue', 'echarts/lib/echarts'],
  plugins: [
    resolve({ extensions: ['.vue'] }),
    vue({
      template: {},
      css: false
    }),
    babel({
      runtimeHelpers: true,
      externalHelpers: false
    }),
    isProduction && terser()
  ]
};

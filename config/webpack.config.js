const nodeExternals = require('webpack-node-externals')
const path = require('path')

const rootPath = path.join(__dirname, '..')

module.exports = {
  devtool: 'source-map',

  target: 'node',

  entry: {
    main: `${rootPath}/lib/index.js`,
  },

  node: {
    __dirname: false,
    __filename: false,
  },

  output: {
    filename: '[name].[hash].js',
    path: `${rootPath}/dist`,
    devtoolModuleFilenameTemplate : '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
      },
    ],
  },

  externals: [nodeExternals()],
}

const nodeExternals = require('webpack-node-externals');


module.exports = {
  devtool: 'source-map',

  target: 'node',

  node: {
    __dirname: false,
    __filename: false
  },

  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel-loader'
      }
    ]
  },

  externals: [nodeExternals()]
};

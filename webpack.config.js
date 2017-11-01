var webConfig = {
  entry: './src/device-ui-controller.js',
  output: {
    filename: 'device-ui-controller.web.js',
    library: 'InitDeviceUI',
    libraryTarget: 'var'
  },
  module:{
    loaders: [
      { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ]
  }
};

module.exports = webConfig;

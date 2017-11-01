var webConfig = {
  entry: './src/device-ui-controller.js',
  output: {
    filename: 'device-ui-controller.web.js',
    library: 'InitDeviceUI',
    libraryTarget: 'var'
  }
};

module.exports = webConfig;

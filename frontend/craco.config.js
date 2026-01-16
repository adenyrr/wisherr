const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix for ESM modules in i18next
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false
        }
      });
      return webpackConfig;
    }
  }
};

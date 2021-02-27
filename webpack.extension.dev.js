const {merge} = require('webpack-merge');
const common = require('./webpack.extension.common');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
});

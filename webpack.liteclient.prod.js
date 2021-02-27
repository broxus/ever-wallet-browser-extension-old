const {merge} = require('webpack-merge');
const common = require('./webpack.liteclient.common');

module.exports = merge(common, {
    mode: 'production',
});

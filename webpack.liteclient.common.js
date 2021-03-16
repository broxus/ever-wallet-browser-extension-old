const path = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
    entry: {
        background: "./src/background/liteclient.ts",
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CleanWebpackPlugin({cleanStaleWebpackAssets: false}),
        new WasmPackPlugin({
            extraArgs: '--target web',
            crateDirectory: path.resolve(__dirname, 'nekoton'),
        }),
        new CopyWebpackPlugin({
            patterns: [
                {from: path.resolve(__dirname, "src/liteclient_manifest.json"), to: 'manifest.json'},
                {from: path.resolve(__dirname, "src/icons/icon16.png")},
                {from: path.resolve(__dirname, "src/icons/icon48.png")},
                {from: path.resolve(__dirname, "src/icons/icon128.png")},
                {from: path.resolve(__dirname, "nekoton/pkg/index_bg.wasm")}
            ],
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist/liteclient')
    },
    experiments: {
        asyncWebAssembly: true
    }
};

const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin')

module.exports = {
    entry: {
        popup: './src/popup/index.tsx',
        background: './src/background/extension.ts',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.svg$/,
                use: ['@svgr/webpack'],
            },
            {
                test: /\.s[ac]ss$/i,
                use: ['style-loader', 'css-loader', 'sass-loader'],
            },
            {
                test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].[ext]',
                            outputPath: 'fonts/',
                        },
                    },
                ],
            },
            {
                test: /\.(png|jpe?g|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new HtmlWebpackPlugin({ template: 'src/popup/index.html' }),
        new WasmPackPlugin({
            crateDirectory: path.resolve(__dirname, 'nekoton'),
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: './src/extension_manifest.json', to: 'manifest.json' },
                { from: './src/icons/icon16.png' },
                { from: './src/icons/icon48.png' },
                { from: './src/icons/icon128.png' },
            ],
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    experiments: {
        asyncWebAssembly: true,
    },
}

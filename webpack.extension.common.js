const path = require('path')

const { ProvidePlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin')

module.exports = {
    entry: {
        polyfills: path.resolve(__dirname, 'src/polyfills.ts'),
        popup: path.resolve(__dirname, 'src/popup/index.tsx'),
        contentscript: path.resolve(__dirname, 'src/background/contentscript.ts'),
        background: path.resolve(__dirname, 'src/background/extension.ts'),
        inpage: path.resolve(__dirname, 'src/background/inpage.ts'),
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
        alias: {
            '@nekoton': path.resolve(__dirname, 'nekoton/pkg'),
            '@common': path.resolve(__dirname, 'src/popup/common'),
            '@components': path.resolve(__dirname, 'src/popup/components'),
            '@img': path.resolve(__dirname, 'src/popup/img'),
            '@store': path.resolve(__dirname, 'src/popup/store'),
            '@utils': path.resolve(__dirname, 'src/popup/utils'),
        },
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            util: require.resolve('util/'),
            process: 'process/browser',
        },
    },
    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'nekoton/pkg/index_bg.wasm') },
                {
                    from: path.resolve(__dirname, 'src/extension_manifest.json'),
                    to: 'manifest.json',
                },
                { from: path.resolve(__dirname, 'src/popup/icons/icon16.png') },
                { from: path.resolve(__dirname, 'src/popup/icons/icon48.png') },
                { from: path.resolve(__dirname, 'src/popup/icons/icon128.png') },
            ],
        }),
        new HtmlWebpackPlugin({ template: path.resolve(__dirname, 'src/popup/index.html') }),
        new ProvidePlugin({
            process: 'process/browser',
        }),
        new WasmPackPlugin({
            extraArgs: '--target web',
            crateDirectory: path.resolve(__dirname, 'nekoton'),
        }),
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist/extension'),
    },
    experiments: {
        asyncWebAssembly: true,
    },
}

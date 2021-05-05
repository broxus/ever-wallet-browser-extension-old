const path = require('path')

const { ProvidePlugin } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WasmPackPlugin = require('@wasm-tool/wasm-pack-plugin')

module.exports = {
    entry: {
        popup: path.resolve(__dirname, 'src/popup/index.tsx'),
        background: path.resolve(__dirname, 'src/app/background/index.ts'),
        contentscript: path.resolve(__dirname, 'src/app/contentscript.ts'),
        inpage: {
            import: path.resolve(__dirname, 'src/app/inpage.ts'),
            library: {
                name: 'inpage',
                type: 'umd',
            },
        },
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
            '@popup': path.resolve(__dirname, 'src/popup'),
            '@shared': path.resolve(__dirname, 'src/shared'),
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
                { from: path.resolve(__dirname, 'src/popup/icons/icon16.png') },
                { from: path.resolve(__dirname, 'src/popup/icons/icon48.png') },
                { from: path.resolve(__dirname, 'src/popup/icons/icon128.png') },
                { from: path.resolve(__dirname, 'src/manifest.json') },
            ],
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src/popup/popup.html'),
            chunks: ['popup'],
            filename: 'popup.html',
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src/popup/notification.html'),
            chunks: ['popup'],
            filename: 'notification.html',
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, 'src/popup/home.html'),
            chunks: ['popup'],
            filename: 'home.html',
        }),
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
        path: path.resolve(__dirname, 'dist'),
    },
    experiments: {
        asyncWebAssembly: true,
    },
}

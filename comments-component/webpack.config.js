const path = require('path');

module.exports = {
    entry: './src/components/comments/Comments.tsx',
    output: {
        filename: 'comments.bundle.js',
        // path: path.resolve(__dirname, 'dist'),
        path: path.resolve(__dirname, '../docs/assets/script/custom/comments'),
        library: 'CommentsComponent',
        libraryTarget: 'umd',
        globalObject: 'this', // Ensures compatibility in different environments
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx|js|jsx)$/,
                include: [
                    path.resolve(__dirname, 'src'),
                    path.resolve(__dirname, 'node_modules/solid-icons'),
                ],
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            '@babel/preset-typescript',
                            [
                                'babel-preset-solid',
                                {
                                    generate: 'dom',
                                    hydratable: true,
                                },
                            ],
                        ],
                    },
                },
            },
        ],
    },
    mode: 'production',
    // No external dependencies
};

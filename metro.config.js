const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.NODE_ENV === 'production') {
    config.transformer.minifierConfig = {
        compress: { drop_console: true },
    };
}

module.exports = config;

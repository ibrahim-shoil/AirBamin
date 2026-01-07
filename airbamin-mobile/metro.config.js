const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure fonts are properly resolved
config.resolver.assetExts.push('ttf', 'otf', 'woff', 'woff2');

module.exports = config;

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin to ensure custom fonts AND @expo/vector-icons fonts are properly copied to Android assets
 */
const withCustomFonts = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const fontsDestDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
        'fonts'
      );

      // Create destination directory
      fs.mkdirSync(fontsDestDir, { recursive: true });

      // 1. Copy custom app fonts (Baloo)
      const customFontsSourceDir = path.join(config.modRequest.projectRoot, 'assets', 'fonts');

      if (fs.existsSync(customFontsSourceDir)) {
        const fontFiles = fs.readdirSync(customFontsSourceDir).filter(file =>
          file.endsWith('.ttf') || file.endsWith('.otf')
        );

        fontFiles.forEach(file => {
          const sourcePath = path.join(customFontsSourceDir, file);
          const destPath = path.join(fontsDestDir, file);

          console.log(`[CustomFonts] Copying ${file} to Android assets`);
          fs.copyFileSync(sourcePath, destPath);
        });
      } else {
        console.warn('[CustomFonts] Custom fonts directory not found:', customFontsSourceDir);
      }

      // 2. Copy @expo/vector-icons fonts (Feather, Ionicons)
      const vectorIconsFontsDir = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        '@expo',
        'vector-icons',
        'build',
        'vendor',
        'react-native-vector-icons',
        'Fonts'
      );

      if (fs.existsSync(vectorIconsFontsDir)) {
        // Copy only the icon fonts we're using
        const iconFonts = ['Feather.ttf', 'Ionicons.ttf'];

        iconFonts.forEach(file => {
          const sourcePath = path.join(vectorIconsFontsDir, file);
          if (fs.existsSync(sourcePath)) {
            const destPath = path.join(fontsDestDir, file);
            console.log(`[VectorIcons] Copying ${file} to Android assets`);
            fs.copyFileSync(sourcePath, destPath);
          } else {
            console.warn(`[VectorIcons] Font file not found: ${file}`);
          }
        });
      } else {
        console.warn('[VectorIcons] @expo/vector-icons fonts directory not found:', vectorIconsFontsDir);
      }

      return config;
    }
  ]);
};

module.exports = withCustomFonts;

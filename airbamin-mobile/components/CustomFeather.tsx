/**
 * Custom Feather Icons component for Android compatibility
 * 
 * This creates a Feather icon set that explicitly uses the 'Feather' font
 * that we load manually in App.tsx via useFonts.
 * 
 * The built-in @expo/vector-icons Feather component doesn't work on Android
 * because it looks for a different internal font family name.
 */
import { createIconSet } from '@expo/vector-icons';

// Import the CORRECT glyph map directly from @expo/vector-icons
const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Feather.json');

// Create custom Feather icon set that uses our loaded 'Feather' font
const CustomFeather = createIconSet(glyphMap, 'Feather', 'Feather.ttf');

export default CustomFeather;

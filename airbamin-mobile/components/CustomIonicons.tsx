/**
 * Custom Ionicons component for Android compatibility
 * 
 * Same approach as CustomFeather - uses the correct glyph map
 * with the font we explicitly load in App.tsx
 */
import { createIconSet } from '@expo/vector-icons';

// Import the CORRECT glyph map directly from @expo/vector-icons
const glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');

// Create custom Ionicons icon set that uses our loaded 'Ionicons' font
const CustomIonicons = createIconSet(glyphMap, 'Ionicons', 'Ionicons.ttf');

export default CustomIonicons;

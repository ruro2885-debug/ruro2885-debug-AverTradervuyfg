/**
 * Seedable Premium Flat Vector Avatar Generator for AVER Platform.
 * Generates unique, professional, high-end vector cartoon illustrations for traders.
 * Ensures balanced color harmony, crisp geometry, and sleek modern aesthetic.
 */

import { renderBackHair, renderFrontHair } from './hairRenderers';
import { renderAccessory } from './accessoryRenderers';

// Comprehensive female name detector
export function isFemaleName(seed: string): boolean {
  if (!seed) return false;
  const str = seed.toLowerCase().trim();
  
  // Explicit female keywords or tags in seeds/usernames
  if (
    str.includes('female') || str.includes('woman') || str.includes('girl') || 
    str.includes('lady') || str.includes('she') || str.includes('her') || 
    str.includes('mrs') || str.includes('ms') || str.includes('miss') || str.includes('queen')
  ) {
    return true;
  }

  const femaleKeywords = [
    'amy', 'grace', 'sarah', 'sara', 'emma', 'jessica', 'jess', 'mia', 'sophia', 'chloe', 
    'hannah', 'olivia', 'emily', 'anna', 'maria', 'rachel', 'elena', 'victoria', 'vicky',
    'zoe', 'zoey', 'ava', 'lily', 'maya', 'lisa', 'laura', 'kate', 'katie', 'clara', 'eva', 
    'julia', 'julie', 'sophie', 'alice', 'charlotte', 'isabella', 'amelia', 'harper', 
    'evelyn', 'abigail', 'ella', 'elizabeth', 'camila', 'sofia', 'avery', 'scarlett', 
    'eleanor', 'madison', 'layla', 'penelope', 'aria', 'ellie', 'nora', 'hazel', 'riley', 
    'stella', 'aurora', 'natalie', 'emilia', 'everly', 'leah', 'aubrey', 'willow', 'addison', 
    'lucy', 'audrey', 'bella', 'nova', 'brooklyn', 'paisley', 'savannah', 'claire', 'skylar', 
    'isla', 'genesis', 'naomi', 'caroline', 'eliana', 'valentina', 'ruby', 'kennedy', 'ivy', 
    'ariana', 'aaliyah', 'cora', 'madelyn', 'katelyn', 'hailey', 'autumn', 'quinn', 'nevaeh', 
    'piper', 'serenity', 'samantha', 'katherine', 'allison', 'gabriella', 'brianna', 
    'daisy', 'holly', 'jasmine', 'kayla', 'kimberly', 'morgan', 'nicole', 'paige', 'rebecca', 
    'stephanie', 'taylor', 'trinity', 'vanessa', 'sydney', 'andrea', 'angela', 'ashley', 
    'brittany', 'chelsea', 'christina', 'danielle', 'erica', 'heather', 'jennifer', 'karen', 
    'kelly', 'kristen', 'megan', 'melissa', 'michelle', 'patricia', 'tracy', 'amanda', 
    'amber', 'april', 'bethany', 'brandi', 'crystal', 'dawn', 'denise', 'diana', 'erika', 
    'heidi', 'jamie', 'joy', 'kristin', 'laurie', 'lori', 'monica', 'pamela', 'rhonda', 
    'shannon', 'stacy', 'tammy', 'tara', 'tiffany', 'tonya', 'valerie', 'wendy', 'jane', 
    'mary', 'walker', 'murphy', 'gwalker', 'amurphy', 'macroedge'
  ];

  for (const name of femaleKeywords) {
    if (str.includes(name)) return true;
  }

  const cleanAlpha = str.replace(/[^a-z]/g, '');
  if (cleanAlpha.length >= 3) {
    if (
      cleanAlpha.endsWith('ia') || cleanAlpha.endsWith('lina') || cleanAlpha.endsWith('ina') || 
      cleanAlpha.endsWith('ella') || cleanAlpha.endsWith('ie') || cleanAlpha.endsWith('ey') || 
      cleanAlpha.endsWith('ah')
    ) {
      return true;
    }
  }

  return false;
}

// Deterministic pseudo-random generator from seed
function seededRandom(seed: string) {
  let h = 5381;
  const str = seed || 'aver_trader_default';
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i) | 0;
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Convert Hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

// Adjust color brightness for clean vector shading without CSS filters
function adjustColorBrightness(hex: string, percent: number): string {
  try {
    const { r, g, b } = hexToRgb(hex);
    const adjust = (val: number) => {
      const newVal = Math.round(val * (1 + percent / 100));
      return Math.min(255, Math.max(0, newVal)).toString(16).padStart(2, '0');
    };
    return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
  } catch (e) {
    return hex;
  }
}

// Calculate color distance to prevent background blending
function colorDistance(hex1: string, hex2: string): number {
  try {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  } catch (e) {
    return 100;
  }
}

// --- CURATED PALETTES ---
const BACKGROUND_PALETTES = [
  '#0F172A', // Midnight Slate
  '#1E1B4B', // Royal Indigo
  '#064E3B', // Deep Emerald
  '#1E293B', // Dark Navy
  '#134E4A', // Deep Teal
  '#31122D', // Deep Mulberry
  '#1E3A8A', // Cobalt Blue
  '#334155', // Cool Steel
  '#27272A', // Matte Zinc
  '#3B0764', // Deep Violet
  '#1F2937', // Charcoal Dark
  '#0284C7', // Vivid Sapphire
  '#0D9488', // Rich Cyan
  '#7C3AED', // Vivid Purple
  '#2563EB', // Electric Blue
];

const SKIN_TONES = [
  '#FFDBAC', // Light Fair
  '#F1C27D', // Warm Ivory
  '#E0AC69', // Golden Tan
  '#C68642', // Olive Tan
  '#8D5524', // Rich Chestnut
  '#5A3311', // Deep Bronze
  '#3D0C02', // Dark Espresso
  '#D2A679', // Warm Sand
  '#E5C298', // Soft Neutral
];

const HAIR_COLORS = [
  '#111827', // Obsidian Black
  '#262626', // Charcoal Dark
  '#3B2F2F', // Dark Chocolate
  '#5C4033', // Warm Chestnut
  '#8B3A2B', // Auburn Red
  '#E6C875', // Honey Gold
  '#CBD5E1', // Platinum Silver
  '#4A3728', // Medium Brown
  '#78350F', // Rich Bronze
];

const CLOTHING_PALETTES = [
  { main: '#0F172A', secondary: '#38BDF8', detail: '#E2E8F0', label: 'Suit' },
  { main: '#1E293B', secondary: '#10B981', detail: '#F8FAFC', label: 'Blazer' },
  { main: '#334155', secondary: '#F59E0B', detail: '#FFFFFF', label: 'Hoodie' },
  { main: '#0284C7', secondary: '#1E293B', detail: '#38BDF8', label: 'Sweater' },
  { main: '#059669', secondary: '#34D399', detail: '#FFFFFF', label: 'Vest' },
  { main: '#7C3AED', secondary: '#A78BFA', detail: '#F3E8FF', label: 'Jacket' },
  { main: '#B91C1C', secondary: '#FCA5A5', detail: '#FFFFFF', label: 'Polo' },
  { main: '#18181B', secondary: '#3F3F46', detail: '#E4E4E7', label: 'TechWear' },
  { main: '#0D9488', secondary: '#2DD4BF', detail: '#F0FDFA', label: 'ZipUp' },
  { main: '#4338CA', secondary: '#818CF8', detail: '#EEF2FF', label: 'Turtleneck' },
];

export function generateAvatarSvg(seed: string, forcedHairStyle?: number, avatarConfig?: { hairStyle?: number; isFemaleFace?: boolean; skinTone?: string; hairColor?: string }): string {
  const rand = seededRandom(seed);
  
  // Clean seed string for DOM clipPath IDs
  const safeId = (seed || 'trader').replace(/[^a-zA-Z0-9]/g, '') || 'default';
  const clipId = 'avatar-clip-' + safeId;

  // --- DETERMINISTIC GENDER & PALETTE SELECTION ---
  const forceFemale = isFemaleName(seed);
  const isMale = avatarConfig?.isFemaleFace !== undefined ? !avatarConfig.isFemaleFace : (forceFemale ? false : rand() > 0.48);

  let selectedSkin = avatarConfig?.skinTone || SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)];
  let selectedHair = avatarConfig?.hairColor || HAIR_COLORS[Math.floor(rand() * HAIR_COLORS.length)];
  
  // Background with guaranteed contrast
  let bgOptions = BACKGROUND_PALETTES.filter(bg => colorDistance(bg, selectedSkin) > 70);
  if (bgOptions.length === 0) bgOptions = BACKGROUND_PALETTES;
  let selectedBg = bgOptions[Math.floor(rand() * bgOptions.length)];

  // Clothing selection
  const clothingStyle = CLOTHING_PALETTES[Math.floor(rand() * CLOTHING_PALETTES.length)];

  // Vector shading parameters
  const shadowSkin = adjustColorBrightness(selectedSkin, -18);
  const highlightSkin = adjustColorBrightness(selectedSkin, 12);
  const shadowHair = adjustColorBrightness(selectedHair, -22);
  const highlightHair = adjustColorBrightness(selectedHair, 35);

  // Hairstyle indexes (0 to 23)
  const hairStyle = avatarConfig?.hairStyle !== undefined 
    ? avatarConfig.hairStyle 
    : (forcedHairStyle !== undefined ? forcedHairStyle : (isMale ? Math.floor(rand() * 12) : Math.floor(rand() * 12) + 12));
  const facialHairType = isMale && rand() < 0.35 ? Math.floor(rand() * 4) : -1;
  
  // Balanced Accessory System (55% None, 20% Eyewear, 10% Jewelry, 7% Headwear, 4% HairAcc, 4% Headset)
  const randAcc = rand();
  let accType: 'none' | 'eyewear' | 'jewelry' | 'headwear' | 'hairAcc' | 'headset' = 'none';
  let accSubIndex = 0;

  if (randAcc < 0.55) {
    accType = 'none';
  } else if (randAcc < 0.75) {
    accType = 'eyewear';
    accSubIndex = Math.floor(rand() * 5);
  } else if (randAcc < 0.85) {
    accType = 'jewelry';
    accSubIndex = Math.floor(rand() * 3);
  } else if (randAcc < 0.92) {
    // Check hair compatibility for headwear/hats
    const isHighHair = [10, 14, 16, 19, 22].includes(hairStyle);
    if (isHighHair) {
      accType = rand() > 0.5 ? 'eyewear' : 'jewelry';
      accSubIndex = Math.floor(rand() * 3);
    } else {
      accType = 'headwear';
      accSubIndex = Math.floor(rand() * 3);
    }
  } else if (randAcc < 0.96) {
    accType = 'hairAcc';
    accSubIndex = Math.floor(rand() * 2);
  } else {
    accType = 'headset';
  }

  const hasBlush = (!isMale || rand() < 0.2) && colorDistance(selectedSkin, '#FFDBAC') < 120;
  const eyeIrisColor = ['#2563EB', '#059669', '#D97706', '#1E293B', '#7C3AED'][Math.floor(rand() * 5)];

  const neckThickness = isMale ? 12 : 9;

  // Controlled face shape variations
  const faceShapeType = Math.floor(rand() * 4);
  let facePath = '';
  if (isMale) {
    if (faceShapeType === 0) { // Classic Oval
      facePath = `<path d="M29 32 C29 18, 71 18, 71 32 L71 52 C71 68, 29 68, 29 52 Z" fill="${selectedSkin}" />`;
    } else if (faceShapeType === 1) { // Chiseled Square Jaw
      facePath = `<path d="M28 32 C28 17, 72 17, 72 32 L72 53 C72 69, 68 70, 50 70 C32 70, 28 69, 28 53 Z" fill="${selectedSkin}" />`;
    } else if (faceShapeType === 2) { // Round / Soft
      facePath = `<path d="M30 32 C30 18, 70 18, 70 32 L70 51 C70 67, 30 67, 30 51 Z" fill="${selectedSkin}" />`;
    } else { // Strong Tapered
      facePath = `<path d="M28 32 C28 18, 72 18, 72 32 L72 51 C72 68, 50 71, 28 51 Z" fill="${selectedSkin}" />`;
    }
  } else {
    if (faceShapeType === 0) { // Classic Female Oval
      facePath = `<path d="M31 32 C31 20, 69 20, 69 32 L69 50 C69 66, 31 66, 31 50 Z" fill="${selectedSkin}" />`;
    } else if (faceShapeType === 1) { // Soft Heart Shape
      facePath = `<path d="M30 32 C30 19, 70 19, 70 32 L70 49 C70 65, 50 68, 30 49 Z" fill="${selectedSkin}" />`;
    } else if (faceShapeType === 2) { // Soft Round
      facePath = `<path d="M31 32 C31 20, 69 20, 69 32 L69 51 C69 66, 31 66, 31 51 Z" fill="${selectedSkin}" />`;
    } else { // Elegant Diamond
      facePath = `<path d="M31 32 C31 20, 69 20, 69 32 L69 49 C69 64, 50 67, 31 49 Z" fill="${selectedSkin}" />`;
    }
  }

  // Controlled eyebrow variations
  const eyebrowStyle = Math.floor(rand() * 3);
  let eyebrowSvg = '';
  if (isMale) {
    if (eyebrowStyle === 0) {
      eyebrowSvg = `<path d="M35 41 Q40 38 45 40" stroke-width="2.8" /><path d="M55 40 Q60 38 65 41" stroke-width="2.8" />`;
    } else if (eyebrowStyle === 1) {
      eyebrowSvg = `<path d="M34 40 L45 39" stroke-width="3" /><path d="M55 39 L66 40" stroke-width="3" />`;
    } else {
      eyebrowSvg = `<path d="M35 42 Q40 37 45 40" stroke-width="2.6" /><path d="M55 40 Q60 37 65 42" stroke-width="2.6" />`;
    }
  } else {
    if (eyebrowStyle === 0) {
      eyebrowSvg = `<path d="M35 41 Q40 37 45 41" stroke-width="2.2" /><path d="M55 41 Q60 37 65 41" stroke-width="2.2" />`;
    } else if (eyebrowStyle === 1) {
      eyebrowSvg = `<path d="M35 40 Q41 36 46 39" stroke-width="2.0" /><path d="M54 39 Q59 36 65 40" stroke-width="2.0" />`;
    } else {
      eyebrowSvg = `<path d="M35 41 Q40 38 45 40" stroke-width="2.2" /><path d="M55 40 Q60 38 65 41" stroke-width="2.2" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <clipPath id="${clipId}">
        <circle cx="50" cy="50" r="46" />
      </clipPath>
      <radialGradient id="bg-glow-${safeId}" cx="50%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.15" />
      </radialGradient>
    </defs>

    <!-- Outer Circular Frame -->
    <circle cx="50" cy="50" r="48" fill="${selectedBg}" />
    <!-- Background Radial Lighting Overlay -->
    <circle cx="50" cy="50" r="48" fill="url(#bg-glow-${safeId})" />

    <!-- Clipped Avatar Art -->
    <g clip-path="url(#${clipId})">
      
      <!-- Back Hair Layer (Seamless behind neck/ears) -->
      ${renderBackHair(hairStyle, selectedHair, shadowHair, highlightHair)}

      <!-- Neck & Shadow -->
      <g>
        <!-- Neck Base -->
        <path d="M${50 - neckThickness} 54 L${50 - neckThickness} 74 L${50 + neckThickness} 74 L${50 + neckThickness} 54 Z" fill="${shadowSkin}" />
        <!-- Neck Highlight Contour -->
        <path d="M${50 - neckThickness + 2} 57 L${50 - neckThickness + 2} 74 L${50 + neckThickness - 2} 74 L${50 + neckThickness - 2} 57 Z" fill="${selectedSkin}" />
      </g>

      <!-- Apparel / Clothing -->
      <g>
        ${clothingStyle.label === 'Suit' ? `
          <!-- Tailored Suit -->
          <path d="M14 100 L14 82 Q50 68 86 82 L86 100 Z" fill="${clothingStyle.main}" />
          <path d="M${50 - neckThickness} 72 L50 94 L${50 + neckThickness} 72 Z" fill="${clothingStyle.detail}" />
          <path d="M48 76 L52 76 L51 98 L49 98 Z" fill="${clothingStyle.secondary}" />
        ` : ''}

        ${clothingStyle.label === 'Blazer' ? `
          <!-- Modern Blazer -->
          <path d="M14 100 L14 80 Q50 66 86 80 L86 100 Z" fill="${clothingStyle.main}" />
          <path d="M${50 - neckThickness - 1} 70 Q50 82 ${50 + neckThickness + 1} 70 L${50 + neckThickness + 1} 76 Q50 88 ${50 - neckThickness - 1} 76 Z" fill="${clothingStyle.secondary}" />
          <path d="M42 80 L50 92 L58 80 Z" fill="${clothingStyle.detail}" />
        ` : ''}

        ${clothingStyle.label === 'Hoodie' ? `
          <!-- Tech Hoodie -->
          <path d="M12 100 L12 78 Q50 65 88 78 L88 100 Z" fill="${clothingStyle.main}" />
          <path d="M36 78 Q50 86 64 78 L60 100 L40 100 Z" fill="${clothingStyle.secondary}" opacity="0.3" />
          <path d="M46 80 L46 96 M54 80 L54 96" stroke="${clothingStyle.detail}" stroke-width="1.5" stroke-linecap="round" />
        ` : ''}

        ${clothingStyle.label === 'Sweater' ? `
          <!-- Crewneck Sweater -->
          <path d="M14 100 L14 78 Q50 66 86 78 L86 100 Z" fill="${clothingStyle.main}" />
          <path d="M${50 - neckThickness - 1} 72 Q50 80 ${50 + neckThickness + 1} 72 L${50 + neckThickness + 1} 76 Q50 84 ${50 - neckThickness - 1} 76 Z" fill="${clothingStyle.secondary}" />
        ` : ''}

        ${clothingStyle.label === 'Turtleneck' ? `
          <!-- Indigo Turtleneck -->
          <path d="M14 100 L14 76 Q50 64 86 76 L86 100 Z" fill="${clothingStyle.main}" />
          <rect x="${50 - neckThickness}" y="66" width="${neckThickness * 2}" height="10" rx="3" fill="${clothingStyle.main}" />
          <line x1="${50 - neckThickness}" y1="71" x2="${50 + neckThickness}" y2="71" stroke="${clothingStyle.secondary}" stroke-width="1" opacity="0.5" />
        ` : ''}

        ${['Vest', 'Jacket', 'Polo', 'TechWear', 'ZipUp'].includes(clothingStyle.label) ? `
          <!-- Athletic Tech Apparel -->
          <path d="M12 100 L12 78 Q50 66 88 78 L88 100 Z" fill="${clothingStyle.main}" />
          <path d="M48 76 L52 76 L52 100 L48 100 Z" fill="${clothingStyle.secondary}" />
          <path d="M${50 - neckThickness} 72 Q50 80 ${50 + neckThickness} 72" fill="none" stroke="${clothingStyle.detail}" stroke-width="2" />
        ` : ''}
      </g>

      <!-- Head Base & Ears -->
      <g>
        <!-- Ears -->
        <circle cx="27" cy="49" r="4.5" fill="${selectedSkin}" />
        <circle cx="27" cy="49" r="2.5" fill="${shadowSkin}" opacity="0.5" />
        <circle cx="73" cy="49" r="4.5" fill="${selectedSkin}" />
        <circle cx="73" cy="49" r="2.5" fill="${shadowSkin}" opacity="0.5" />

        <!-- Main Face Geometry -->
        ${facePath}
        
        <!-- Forehead Soft Highlight -->
        <ellipse cx="50" cy="28" rx="14" ry="5" fill="${highlightSkin}" opacity="0.25" />
      </g>

      <!-- Cheek Blush -->
      ${hasBlush ? `
        <ellipse cx="37" cy="53" rx="4" ry="2.5" fill="#F43F5E" opacity="0.22" />
        <ellipse cx="63" cy="53" rx="4" ry="2.5" fill="#F43F5E" opacity="0.22" />
      ` : ''}

      <!-- Eyebrows -->
      <g fill="none" stroke="${selectedHair}" stroke-linecap="round">
        ${eyebrowSvg}
      </g>

      <!-- Expressive Vector Eyes -->
      <g>
        <!-- Left Eye Base -->
        <ellipse cx="40" cy="47" rx="4" ry="4.5" fill="#FFFFFF" />
        <!-- Left Iris -->
        <circle cx="40.5" cy="47" r="2.8" fill="${eyeIrisColor}" />
        <circle cx="40.5" cy="47" r="1.8" fill="#0F172A" />
        <!-- Left Eye Catchlight (Sparkle) -->
        <circle cx="39.3" cy="45.7" r="0.8" fill="#FFFFFF" />

        <!-- Right Eye Base -->
        <ellipse cx="60" cy="47" rx="4" ry="4.5" fill="#FFFFFF" />
        <!-- Right Iris -->
        <circle cx="59.5" cy="47" r="2.8" fill="${eyeIrisColor}" />
        <circle cx="59.5" cy="47" r="1.8" fill="#0F172A" />
        <!-- Right Eye Catchlight -->
        <circle cx="58.3" cy="45.7" r="0.8" fill="#FFFFFF" />
      </g>

      <!-- Nose Mark -->
      <path d="M49 46 L49 53 Q51 54 53 53" fill="none" stroke="${shadowSkin}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Smile / Mouth -->
      <g stroke="#1E293B" stroke-linecap="round" stroke-linejoin="round" fill="none">
        ${rand() > 0.4 ? `
          <!-- Confident Smile -->
          <path d="M42 59 Q50 66 58 59" stroke-width="2" />
          <path d="M44 60 Q50 63 56 60" fill="#FFFFFF" stroke="none" opacity="0.9" />
        ` : `
          <!-- Sleek Subtle Smile -->
          <path d="M44 60 Q50 63 56 60" stroke-width="2" />
        `}
      </g>

      <!-- Facial Hair (Male) -->
      ${facialHairType >= 0 ? `
        <g fill="${selectedHair}" opacity="0.9">
          ${facialHairType === 0 ? '<!-- Trimmed Beard --> <path d="M29 50 C29 68, 71 68, 71 50 L71 54 C71 70, 29 70, 29 54 Z" /><path d="M43 57 Q50 54 57 57 Q50 59 43 57 Z" />' : ''}
          ${facialHairType === 1 ? '<!-- Goatee --> <path d="M43 57 Q50 55 57 57 Q50 59 43 57 Z" /><path d="M45 61 Q50 68 55 61 L53 68 L47 68 Z" />' : ''}
          ${facialHairType === 2 ? '<!-- Full Beard --> <path d="M29 46 C29 72, 71 72, 71 46 C71 56, 65 72, 50 72 C35 72, 29 56, 29 46 Z" /><path d="M42 57 Q50 54 58 57 Q50 60 42 57 Z" />' : ''}
          ${facialHairType === 3 ? '<!-- Mustache --> <path d="M42 57 Q50 54 58 57 Q50 60 42 57 Z" />' : ''}
        </g>
      ` : ''}

      <!-- Front Hair Layer (Art-directed visual construction) -->
      ${renderFrontHair(hairStyle, selectedHair, shadowHair, highlightHair)}

      <!-- Art-Directed Accessories (Eyewear, Jewelry, Headwear, Hair Accessories, Headsets) -->
      ${renderAccessory(accType, accSubIndex, selectedHair, selectedSkin)}

    </g>
  </svg>`;
}

export function getAvatarDataUrl(seed: string, forcedHairStyle?: number, avatarConfig?: { hairStyle?: number; isFemaleFace?: boolean; skinTone?: string; hairColor?: string }): string {
  const svg = generateAvatarSvg(seed, forcedHairStyle, avatarConfig);
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

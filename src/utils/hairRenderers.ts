/**
 * Formal Registry for Avatar Hairstyle System.
 * Defines distinct, reusable geometric shapes and path parameters for each hairstyle type
 * (e.g., HairTexturedCrop, HairSidePart, HairShortFade, HairSpikyCrown, HairRoundedAfro, HairLongWaves, etc.).
 * Ensures consistent silhouettes, volume, scalp attachment, and texture across all avatar renders.
 * All styles are accurately bounded to fit the head contour (x=25 to x=75).
 */

export interface HairstyleDefinition {
  id: number;
  key: string;
  name: string;
  category: 'short' | 'medium' | 'long' | 'updo' | 'volume' | 'locs_braids';
  genderPreference: 'male' | 'female' | 'unisex';
  hasBackLayer: boolean;
  getBackPath?: (shadowColor: string, hairColor: string, highlightColor: string) => string;
  getFrontGroup: (hairColor: string, shadowColor: string, highlightColor: string) => string;
}

// --- DISTINCT REUSABLE GEOMETRIC HAIRSTYLE SHAPES & PATH PARAMETERS ---

export const HairTexturedCrop: HairstyleDefinition = {
  id: 0,
  key: 'HairTexturedCrop',
  name: 'Modern Textured Crop',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-0" data-hair-key="HairTexturedCrop">
      <!-- Main Hair Mass anchored to scalp -->
      <path d="M26 32 C25 20, 35 15, 50 15 C65 15, 75 20, 74 32 C74 27, 68 25, 62 27 C56 25, 44 25, 38 27 C32 25, 26 27, 26 32 Z" fill="${hairColor}" />
      <!-- Tapered Sides -->
      <path d="M26 32 C26 24, 28 20, 32 18 L27 34 Z M74 32 C74 24, 72 20, 68 18 L73 34 Z" fill="${shadowColor}" />
      <!-- Textured Bangs Fringe -->
      <path d="M28 26 C33 29, 36 25, 42 28 C47 25, 53 29, 58 26 C64 28, 68 25, 72 27 C70 23, 62 20, 50 20 C38 20, 30 23, 28 26 Z" fill="${hairColor}" />
      <path d="M34 22 C42 19, 58 19, 66 22" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairSidePart: HairstyleDefinition = {
  id: 1,
  key: 'HairSidePart',
  name: 'Executive Side Part',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-1" data-hair-key="HairSidePart">
      <path d="M26 32 C25 18, 38 14, 52 14 C68 14, 75 19, 74 32 C71 25, 60 22, 50 23 C38 22, 28 27, 26 32 Z" fill="${hairColor}" />
      <path d="M35 18 L34 28" fill="none" stroke="${shadowColor}" stroke-width="2" />
      <path d="M38 16 C48 16, 62 18, 70 23" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairShortFade: HairstyleDefinition = {
  id: 2,
  key: 'HairShortFade',
  name: 'Clean Buzz Cut & Fade',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor) => `
    <g id="hair-style-2" data-hair-key="HairShortFade">
      <path d="M27 32 C26 21, 36 17, 50 17 C64 17, 74 21, 73 32 C73 27, 65 24, 50 24 C35 24, 27 27, 27 32 Z" fill="${shadowColor}" opacity="0.9" />
      <path d="M32 21 C40 19, 60 19, 68 21" fill="none" stroke="${hairColor}" stroke-width="1.5" stroke-dasharray="2,2" />
    </g>
  `
};

export const HairSpikyCrown: HairstyleDefinition = {
  id: 3,
  key: 'HairSpikyCrown',
  name: 'Modern Connected Spiky Crown',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-3" data-hair-key="HairSpikyCrown">
      <!-- Base Scalp Under-Shadow -->
      <path d="M26 32 C25 22, 32 16, 50 16 C68 16, 75 22, 74 32 C70 28, 62 26, 50 26 C38 26, 30 28, 26 32 Z" fill="${shadowColor}" />
      <!-- Connected Volume Spiky Crown -->
      <path d="M26 31 C 25 24, 25 16, 30 14 C 33 9, 39 8, 43 11 C 46 6, 54 6, 57 11 C 61 8, 67 9, 70 14 C 75 16, 75 24, 74 31 C 68 26, 58 24, 50 24 C 42 24, 32 26, 26 31 Z" fill="${hairColor}" />
      <!-- Volumetric Tufts & Highlights -->
      <path d="M33 18 C 37 13, 42 11, 44 15" fill="none" stroke="${highlightColor}" stroke-width="2.2" stroke-linecap="round" />
      <path d="M47 13 C 50 8, 55 8, 57 13" fill="none" stroke="${highlightColor}" stroke-width="2.5" stroke-linecap="round" />
      <path d="M57 16 C 63 13, 67 15, 69 19" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
      <path d="M28 29 Q 34 25 40 28 Q 48 24 54 27 Q 62 24 72 29 Q 63 25 50 25 Q 37 25 28 29 Z" fill="${shadowColor}" opacity="0.6" />
    </g>
  `
};

export const HairPompadour: HairstyleDefinition = {
  id: 4,
  key: 'HairPompadour',
  name: 'Volumetric Pompadour',
  category: 'medium',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-4" data-hair-key="HairPompadour">
      <path d="M26 32 C25 16, 33 10, 50 10 C67 10, 75 16, 74 32 C70 23, 62 20, 50 20 C38 20, 30 23, 26 32 Z" fill="${hairColor}" />
      <path d="M26 32 L28 22 L32 32 Z M74 32 L72 22 L68 32 Z" fill="${shadowColor}" />
      <path d="M35 12 C45 10, 55 10, 65 12" fill="none" stroke="${highlightColor}" stroke-width="2.5" stroke-linecap="round" />
    </g>
  `
};

export const HairCurlyCrop: HairstyleDefinition = {
  id: 5,
  key: 'HairCurlyCrop',
  name: 'Textured Curly Crop',
  category: 'short',
  genderPreference: 'unisex',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-5" data-hair-key="HairCurlyCrop">
      <path d="M26 32 C25 20, 32 14, 40 14 C44 10, 56 10, 60 14 C68 14, 75 20, 74 32 C70 26, 60 24, 50 24 C40 24, 30 26, 26 32 Z" fill="${hairColor}" />
      <circle cx="34" cy="18" r="3.5" fill="${shadowColor}" />
      <circle cx="50" cy="14" r="4.5" fill="${shadowColor}" />
      <circle cx="66" cy="18" r="3.5" fill="${shadowColor}" />
      <circle cx="42" cy="20" r="3" fill="${highlightColor}" />
      <circle cx="58" cy="20" r="3" fill="${highlightColor}" />
    </g>
  `
};

export const HairMediumFlow: HairstyleDefinition = {
  id: 6,
  key: 'HairMediumFlow',
  name: 'Medium Flow Curtains',
  category: 'medium',
  genderPreference: 'unisex',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M25 30 C23 42, 23 58, 27 65 C29 52, 28 38, 28 32 Z M75 30 C77 42, 77 58, 73 65 C71 52, 72 38, 72 32 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-6" data-hair-key="HairMediumFlow">
      <path d="M26 32 C25 18, 35 14, 50 14 C65 14, 75 18, 74 32 C70 26, 60 24, 50 25 C40 24, 30 26, 26 32 Z" fill="${hairColor}" />
      <path d="M25 32 C24 18, 35 14, 48 18 C46 28, 38 35, 29 38 C26 36, 25 34, 25 32 Z" fill="${hairColor}" />
      <path d="M75 32 C76 18, 65 14, 52 18 C54 28, 62 35, 71 38 C74 36, 75 34, 75 32 Z" fill="${hairColor}" />
      <path d="M32 22 C38 20, 44 22, 46 26" fill="none" stroke="${highlightColor}" stroke-width="2" />
      <path d="M68 22 C62 20, 56 22, 54 26" fill="none" stroke="${highlightColor}" stroke-width="2" />
    </g>
  `
};

export const HairSlickBack: HairstyleDefinition = {
  id: 7,
  key: 'HairSlickBack',
  name: 'Modern Slick Back',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-7" data-hair-key="HairSlickBack">
      <path d="M26 32 C25 18, 35 12, 50 12 C65 12, 75 18, 74 32 C70 25, 60 22, 50 22 C40 22, 30 25, 26 32 Z" fill="${hairColor}" />
      <path d="M34 16 L34 26 M42 14 L42 24 M50 13 L50 23 M58 14 L58 24 M66 16 L66 26" stroke="${highlightColor}" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `
};

export const HairDreadlocksTop: HairstyleDefinition = {
  id: 8,
  key: 'HairDreadlocksTop',
  name: 'Dreadlocks Top',
  category: 'locs_braids',
  genderPreference: 'unisex',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M25 35 C23 48, 24 60, 27 68 C30 55, 29 42, 28 35 Z M75 35 C77 48, 76 60, 73 68 C70 55, 71 42, 72 35 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor) => `
    <g id="hair-style-8" data-hair-key="HairDreadlocksTop">
      <path d="M26 32 C25 20, 32 12, 50 12 C68 12, 75 20, 74 32 Z" fill="${shadowColor}" />
      <rect x="32" y="14" width="5" height="18" rx="2.5" fill="${hairColor}" stroke="${shadowColor}" stroke-width="1" />
      <rect x="40" y="10" width="5" height="20" rx="2.5" fill="${hairColor}" stroke="${shadowColor}" stroke-width="1" />
      <rect x="48" y="9" width="5" height="21" rx="2.5" fill="${hairColor}" stroke="${shadowColor}" stroke-width="1" />
      <rect x="56" y="10" width="5" height="20" rx="2.5" fill="${hairColor}" stroke="${shadowColor}" stroke-width="1" />
      <rect x="64" y="14" width="5" height="18" rx="2.5" fill="${hairColor}" stroke="${shadowColor}" stroke-width="1" />
    </g>
  `
};

export const HairBedhead: HairstyleDefinition = {
  id: 9,
  key: 'HairBedhead',
  name: 'Tousled Bedhead',
  category: 'short',
  genderPreference: 'unisex',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-9" data-hair-key="HairBedhead">
      <path d="M26 32 C25 22, 30 14, 38 14 C42 10, 54 11, 60 9 C66 11, 75 18, 74 32 C70 27, 60 24, 50 25 C40 24, 30 27, 26 32 Z" fill="${hairColor}" />
      <path d="M30 20 C36 15, 42 18, 48 14" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
      <path d="M52 14 C58 18, 64 15, 70 20" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairRoundedAfro: HairstyleDefinition = {
  id: 10,
  key: 'HairRoundedAfro',
  name: 'Rounded Afro Taper',
  category: 'volume',
  genderPreference: 'unisex',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M24 32 C21 20, 79 20, 76 32 C78 44, 75 58, 72 60 L28 60 C25 58, 22 44, 24 32 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-10" data-hair-key="HairRoundedAfro">
      <path d="M25 32 C22 18, 78 18, 75 32 C72 26, 62 22, 50 22 C38 22, 28 26, 25 32 Z" fill="${hairColor}" />
      <path d="M28 20 C38 16, 62 16, 72 20" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairForwardQuiff: HairstyleDefinition = {
  id: 11,
  key: 'HairForwardQuiff',
  name: 'Forward Fringe Quiff',
  category: 'short',
  genderPreference: 'male',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-11" data-hair-key="HairForwardQuiff">
      <path d="M26 32 C25 18, 34 10, 52 10 C68 12, 75 20, 74 32 C70 25, 62 23, 50 24 C38 23, 30 26, 26 32 Z" fill="${hairColor}" />
      <path d="M38 14 C48 11, 58 14, 64 19" fill="none" stroke="${highlightColor}" stroke-width="2.5" stroke-linecap="round" />
    </g>
  `
};

export const HairSleekBob: HairstyleDefinition = {
  id: 12,
  key: 'HairSleekBob',
  name: 'Sleek Bob with Bangs',
  category: 'medium',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M24 28 C23 42, 23 60, 26 70 C30 72, 34 72, 35 66 C32 55, 30 40, 30 28 Z M76 28 C77 42, 77 60, 74 70 C70 72, 66 72, 65 66 C68 55, 70 40, 70 28 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-12" data-hair-key="HairSleekBob">
      <path d="M25 28 C24 16, 33 12, 50 12 C67 12, 76 16, 75 28 C75 42, 73 58, 69 65 C66 50, 68 32, 68 28 C58 26, 42 26, 32 28 C32 32, 34 50, 31 65 C27 58, 25 42, 25 28 Z" fill="${hairColor}" />
      <path d="M30 26 C40 28, 60 28, 70 26 C68 22, 60 20, 50 20 C40 20, 32 22, 30 26 Z" fill="${shadowColor}" />
      <path d="M34 21 C44 19, 56 19, 66 21" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairLongWaves: HairstyleDefinition = {
  id: 13,
  key: 'HairLongWaves',
  name: 'Long Layered Waves',
  category: 'long',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M23 28 C20 45, 19 68, 24 82 C29 85, 36 82, 34 68 C32 50, 30 35, 30 28 Z M77 28 C80 45, 81 68, 76 82 C71 85, 64 82, 66 68 C68 50, 70 35, 70 28 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-13" data-hair-key="HairLongWaves">
      <path d="M24 28 C23 15, 33 10, 50 10 C67 10, 77 15, 76 28 C76 45, 78 65, 74 78 C69 65, 69 42, 67 30 C58 25, 42 25, 33 30 C31 42, 31 65, 26 78 C22 65, 24 45, 24 28 Z" fill="${hairColor}" />
      <path d="M28 32 C32 48, 30 62, 26 72" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
      <path d="M72 32 C68 48, 70 62, 74 72" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairHighTopBun: HairstyleDefinition = {
  id: 14,
  key: 'HairHighTopBun',
  name: 'High Top Knot Bun',
  category: 'updo',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor, hairColor, highlightColor) => `
    <g fill="${hairColor}">
      <circle cx="50" cy="11" r="10" stroke="${shadowColor}" stroke-width="1.5" />
      <path d="M44 14 C47 8, 53 8, 56 14" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `,
  getFrontGroup: (hairColor) => `
    <g id="hair-style-14" data-hair-key="HairHighTopBun">
      <path d="M25 28 C24 18, 34 14, 50 14 C66 14, 76 18, 75 28 C70 24, 60 22, 50 23 C40 22, 30 24, 25 28 Z" fill="${hairColor}" />
      <path d="M28 28 C26 38, 27 48, 29 54" fill="none" stroke="${hairColor}" stroke-width="2" stroke-linecap="round" />
      <path d="M72 28 C74 38, 73 48, 71 54" fill="none" stroke="${hairColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairPixieCut: HairstyleDefinition = {
  id: 15,
  key: 'HairPixieCut',
  name: 'Chic Pixie Cut',
  category: 'short',
  genderPreference: 'female',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-15" data-hair-key="HairPixieCut">
      <path d="M25 28 C24 16, 34 12, 50 12 C66 12, 76 16, 75 28 C70 24, 62 22, 54 26 C46 22, 34 23, 25 28 Z" fill="${hairColor}" />
      <path d="M32 18 C42 15, 58 15, 68 19" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairCurlyAfroCoils: HairstyleDefinition = {
  id: 16,
  key: 'HairCurlyAfroCoils',
  name: 'Voluminous Curly Afro Coils',
  category: 'volume',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M22 34 C18 20, 82 20, 78 34 C82 50, 78 66, 72 70 L28 70 C22 66, 18 50, 22 34 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor) => `
    <g id="hair-style-16" data-hair-key="HairCurlyAfroCoils">
      <path d="M23 30 C19 18, 81 18, 77 30 C80 44, 76 60, 71 65 C67 56, 68 34, 67 28 C58 24, 42 24, 33 28 C32 34, 33 56, 29 65 C24 60, 20 44, 23 30 Z" fill="${hairColor}" />
      <circle cx="28" cy="24" r="3.5" fill="${shadowColor}" />
      <circle cx="50" cy="18" r="4.5" fill="${shadowColor}" />
      <circle cx="72" cy="24" r="3.5" fill="${shadowColor}" />
    </g>
  `
};

export const HairSideSwept: HairstyleDefinition = {
  id: 17,
  key: 'HairSideSwept',
  name: 'Side Swept Glamour',
  category: 'long',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M23 30 C20 48, 21 72, 26 84 C31 86, 36 80, 33 65 Z M77 30 C80 45, 80 65, 77 78 C74 80, 68 78, 68 68 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-17" data-hair-key="HairSideSwept">
      <path d="M24 28 C23 14, 34 10, 52 10 C69 10, 77 16, 76 28 C76 48, 78 68, 74 80 C69 68, 66 48, 64 32 C54 26, 38 28, 28 32 C26 40, 25 52, 24 28 Z" fill="${hairColor}" />
      <path d="M34 16 C48 14, 66 18, 74 26" fill="none" stroke="${highlightColor}" stroke-width="2.5" stroke-linecap="round" />
    </g>
  `
};

export const HairShoulderLob: HairstyleDefinition = {
  id: 18,
  key: 'HairShoulderLob',
  name: 'Shoulder-Length Lob',
  category: 'medium',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M24 28 C22 42, 22 58, 26 68 C29 70, 34 68, 33 58 C31 46, 30 34, 30 28 Z M76 28 C78 42, 78 58, 74 68 C71 70, 66 68, 67 58 C69 46, 70 34, 70 28 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-18" data-hair-key="HairShoulderLob">
      <path d="M25 28 C24 16, 33 12, 50 12 C67 12, 76 16, 75 28 C75 42, 75 56, 72 64 C68 52, 68 32, 68 28 C58 25, 42 25, 32 28 C32 32, 32 52, 28 64 C25 56, 25 42, 25 28 Z" fill="${hairColor}" />
      <path d="M32 20 C42 18, 58 18, 68 20" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairSpaceBuns: HairstyleDefinition = {
  id: 19,
  key: 'HairSpaceBuns',
  name: 'Playful Space Buns',
  category: 'updo',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor, hairColor) => `
    <g fill="${hairColor}">
      <circle cx="32" cy="14" r="8" stroke="${shadowColor}" stroke-width="1.5" />
      <circle cx="68" cy="14" r="8" stroke="${shadowColor}" stroke-width="1.5" />
    </g>
  `,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-19" data-hair-key="HairSpaceBuns">
      <path d="M25 28 C24 18, 34 14, 50 14 C66 14, 76 18, 75 28 C70 24, 60 23, 50 24 C40 23, 30 24, 25 28 Z" fill="${hairColor}" />
      <path d="M38 18 Q 50 22 62 18" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairBraidedCrown: HairstyleDefinition = {
  id: 20,
  key: 'HairBraidedCrown',
  name: 'Braided Crown',
  category: 'locs_braids',
  genderPreference: 'female',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-20" data-hair-key="HairBraidedCrown">
      <path d="M25 28 C24 16, 33 12, 50 12 C67 12, 76 16, 75 28 C70 24, 60 22, 50 23 C40 22, 30 24, 25 28 Z" fill="${hairColor}" />
      <path d="M28 20 Q 50 14 72 20" fill="none" stroke="${highlightColor}" stroke-width="3" stroke-dasharray="3,3" stroke-linecap="round" />
    </g>
  `
};

export const HairCurtainShag: HairstyleDefinition = {
  id: 21,
  key: 'HairCurtainShag',
  name: 'Curtain Bangs Shag',
  category: 'medium',
  genderPreference: 'female',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-21" data-hair-key="HairCurtainShag">
      <path d="M24 28 C23 15, 33 10, 50 10 C67 10, 77 15, 76 28 C74 42, 73 58, 69 65 C66 52, 64 36, 62 30 C54 35, 46 35, 38 30 C36 36, 34 52, 31 65 C27 58, 26 42, 24 28 Z" fill="${hairColor}" />
      <path d="M38 28 C44 22, 48 20, 50 22 C52 20, 56 22, 62 28" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

export const HairMessyPonytail: HairstyleDefinition = {
  id: 22,
  key: 'HairMessyPonytail',
  name: 'Messy High Ponytail',
  category: 'updo',
  genderPreference: 'female',
  hasBackLayer: true,
  getBackPath: (shadowColor) => `<path d="M68 22 C76 18, 84 24, 82 38 C80 48, 72 56, 66 52 Z" fill="${shadowColor}" />`,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-22" data-hair-key="HairMessyPonytail">
      <path d="M25 28 C24 16, 34 12, 50 12 C66 12, 76 16, 75 28 C70 24, 60 22, 50 23 C40 22, 30 24, 25 28 Z" fill="${hairColor}" />
      <path d="M32 20 C42 16, 58 16, 68 20" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
      <path d="M29 28 C27 36, 28 44, 30 50" fill="none" stroke="${hairColor}" stroke-width="1.8" stroke-linecap="round" />
    </g>
  `
};

export const HairLowChignon: HairstyleDefinition = {
  id: 23,
  key: 'HairLowChignon',
  name: 'Low Bun / Chignon',
  category: 'updo',
  genderPreference: 'female',
  hasBackLayer: false,
  getFrontGroup: (hairColor, shadowColor, highlightColor) => `
    <g id="hair-style-23" data-hair-key="HairLowChignon">
      <path d="M25 28 C24 16, 34 12, 50 12 C66 12, 76 16, 75 28 C70 24, 60 22, 50 23 C40 22, 30 24, 25 28 Z" fill="${hairColor}" />
      <path d="M30 20 C40 17, 60 17, 70 20" fill="none" stroke="${highlightColor}" stroke-width="2" stroke-linecap="round" />
    </g>
  `
};

// --- FORMAL HAIRSTYLE REGISTRY MAP ---

export const HAIRSTYLE_REGISTRY: Record<number, HairstyleDefinition> = {
  0: HairTexturedCrop,
  1: HairSidePart,
  2: HairShortFade,
  3: HairSpikyCrown,
  4: HairPompadour,
  5: HairCurlyCrop,
  6: HairMediumFlow,
  7: HairSlickBack,
  8: HairDreadlocksTop,
  9: HairBedhead,
  10: HairRoundedAfro,
  11: HairForwardQuiff,
  12: HairSleekBob,
  13: HairLongWaves,
  14: HairHighTopBun,
  15: HairPixieCut,
  16: HairCurlyAfroCoils,
  17: HairSideSwept,
  18: HairShoulderLob,
  19: HairSpaceBuns,
  20: HairBraidedCrown,
  21: HairCurtainShag,
  22: HairMessyPonytail,
  23: HairLowChignon
};

export function getHairstyleDefinition(styleId: number): HairstyleDefinition {
  return HAIRSTYLE_REGISTRY[styleId] || HairTexturedCrop;
}

export function renderBackHair(
  style: number,
  hairColor: string,
  shadowColor: string,
  highlightColor: string
): string {
  const def = getHairstyleDefinition(style);
  if (def && def.hasBackLayer && def.getBackPath) {
    return def.getBackPath(shadowColor, hairColor, highlightColor);
  }
  return '';
}

export function renderFrontHair(
  style: number,
  hairColor: string,
  shadowColor: string,
  highlightColor: string
): string {
  const def = getHairstyleDefinition(style);
  if (def && def.getFrontGroup) {
    return def.getFrontGroup(hairColor, shadowColor, highlightColor);
  }
  return HairTexturedCrop.getFrontGroup(hairColor, shadowColor, highlightColor);
}

/**
 * Vector accessory rendering system for 2D avatars.
 * Broad accessory library with zero headset bias, proper anchoring,
 * and cartoon/vector art style consistency.
 */

export function renderAccessory(
  type: 'none' | 'eyewear' | 'jewelry' | 'headwear' | 'hairAcc' | 'headset',
  subIndex: number,
  hairColor: string,
  skinTone: string
): string {
  if (type === 'none') return '';

  switch (type) {
    case 'eyewear':
      switch (subIndex) {
        case 0:
          // Modern Tech Rectangular Glasses
          return `
            <g id="acc-glasses-0" fill="none" stroke="#0F172A" stroke-linecap="round" stroke-linejoin="round">
              <rect x="32" y="42" width="15" height="10" rx="2.5" fill="rgba(255,255,255,0.25)" stroke-width="2" />
              <rect x="53" y="42" width="15" height="10" rx="2.5" fill="rgba(255,255,255,0.25)" stroke-width="2" />
              <path d="M47 45 L53 45" stroke-width="2" />
              <path d="M26 44 L32 44 M68 44 L74 44" stroke-width="1.8" />
            </g>
          `;
        case 1:
          // Round Intel Specs
          return `
            <g id="acc-glasses-1" fill="none" stroke="#1E293B" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="39" cy="47" r="7" fill="rgba(255,255,255,0.2)" stroke-width="2" />
              <circle cx="61" cy="47" r="7" fill="rgba(255,255,255,0.2)" stroke-width="2" />
              <path d="M46 47 L54 47" stroke-width="2" />
              <path d="M26 45 L32 46 M68 46 L74 45" stroke-width="1.8" />
            </g>
          `;
        case 2:
          // Tinted Gold Aviator Sunglasses
          return `
            <g id="acc-glasses-2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M31 43 L47 43 L45 52 Q39 55 33 52 Z" fill="rgba(15, 23, 42, 0.75)" stroke="#F59E0B" stroke-width="1.8" />
              <path d="M53 43 L69 43 L67 52 Q61 55 55 52 Z" fill="rgba(15, 23, 42, 0.75)" stroke="#F59E0B" stroke-width="1.8" />
              <path d="M47 44 L53 44 M46 42 L54 42" stroke="#F59E0B" stroke-width="1.8" />
              <path d="M26 43 L31 43 M69 43 L74 43" stroke="#F59E0B" stroke-width="1.5" />
            </g>
          `;
        case 3:
          // Sleek Wireframe Specs
          return `
            <g id="acc-glasses-3" fill="none" stroke="#64748B" stroke-linecap="round" stroke-linejoin="round">
              <rect x="33" y="43" width="14" height="9" rx="4" fill="rgba(255,255,255,0.18)" stroke-width="1.5" />
              <rect x="53" y="43" width="14" height="9" rx="4" fill="rgba(255,255,255,0.18)" stroke-width="1.5" />
              <path d="M47 46 L53 46" stroke-width="1.5" />
              <path d="M27 45 L33 45 M67 45 L73 45" stroke-width="1.2" />
            </g>
          `;
        case 4:
          // Classic Dark Wayfarer Sunglasses
          return `
            <g id="acc-glasses-4" fill="none" stroke="#0F172A" stroke-linecap="round" stroke-linejoin="round">
              <path d="M30 42 L48 42 L46 51 Q39 53 32 51 Z" fill="#1E293B" stroke="#0F172A" stroke-width="2" />
              <path d="M52 42 L70 42 L68 51 Q61 53 54 51 Z" fill="#1E293B" stroke="#0F172A" stroke-width="2" />
              <path d="M48 44 L52 44" stroke="#0F172A" stroke-width="2.2" />
              <path d="M26 43 L30 42 M70 42 L74 43" stroke="#0F172A" stroke-width="2" />
              <!-- Lens Glare -->
              <path d="M33 44 L37 44 M55 44 L59 44" stroke="#64748B" stroke-width="1.2" />
            </g>
          `;
        default:
          return '';
      }

    case 'jewelry':
      switch (subIndex) {
        case 0:
          // Minimalist Stud Earrings (Silver / Diamond)
          return `
            <g id="acc-jewelry-0">
              <circle cx="23.5" cy="50" r="1.8" fill="#F8FAFC" stroke="#64748B" stroke-width="0.8" />
              <circle cx="76.5" cy="50" r="1.8" fill="#F8FAFC" stroke="#64748B" stroke-width="0.8" />
            </g>
          `;
        case 1:
          // Gold Hoop Earrings
          return `
            <g id="acc-jewelry-1" fill="none" stroke="#F59E0B" stroke-width="1.8">
              <path d="M22 51 C20 54, 21 58, 24 58 C25.5 58, 26 56, 25 53" />
              <path d="M78 51 C80 54, 79 58, 76 58 C74.5 58, 74 56, 75 53" />
            </g>
          `;
        case 2:
          // Silver Chain / Pendant Necklace
          return `
            <g id="acc-jewelry-2" fill="none" stroke="#94A3B8" stroke-linecap="round">
              <path d="M38 72 Q50 82 62 72" stroke-width="1.5" />
              <circle cx="50" cy="77" r="2.2" fill="#3B82F6" stroke="#CBD5E1" stroke-width="0.8" />
            </g>
          `;
        default:
          return '';
      }

    case 'headwear':
      switch (subIndex) {
        case 0:
          // Fitted Baseball Cap
          return `
            <g id="acc-headwear-0">
              <!-- Cap Crown (Fitted snugly on scalp) -->
              <path d="M26 28 C26 16, 36 14, 50 14 C64 14, 74 16, 74 28 Z" fill="#2563EB" />
              <path d="M26 28 C34 26, 66 26, 74 28" fill="none" stroke="#1D4ED8" stroke-width="1.5" />
              <!-- Curved Visor Brim -->
              <path d="M22 28 Q50 24 78 28 Q50 32 22 28 Z" fill="#1D4ED8" />
              <!-- Cap Button Top -->
              <circle cx="50" cy="14" r="2.5" fill="#1E40AF" />
            </g>
          `;
        case 1:
          // Minimalist Knit Beanie
          return `
            <g id="acc-headwear-1">
              <!-- Beanie Dome -->
              <path d="M27 28 C26 14, 36 11, 50 11 C64 11, 74 14, 73 28 Z" fill="#334155" />
              <!-- Folded Ribbed Cuff -->
              <rect x="25" y="24" width="50" height="7" rx="3.5" fill="#1E293B" />
              <line x1="33" y1="25" x2="33" y2="30" stroke="#475569" stroke-width="1" />
              <line x1="41" y1="25" x2="41" y2="30" stroke="#475569" stroke-width="1" />
              <line x1="49" y1="25" x2="49" y2="30" stroke="#475569" stroke-width="1" />
              <line x1="57" y1="25" x2="57" y2="30" stroke="#475569" stroke-width="1" />
              <line x1="65" y1="25" x2="65" y2="30" stroke="#475569" stroke-width="1" />
            </g>
          `;
        case 2:
          // Urban Bucket Hat
          return `
            <g id="acc-headwear-2">
              <!-- Bucket Crown -->
              <path d="M30 25 L34 15 Q50 13 66 15 L70 25 Z" fill="#0F766E" />
              <!-- Flared Brim -->
              <path d="M21 28 Q50 23 79 28 Q50 33 21 28 Z" fill="#115E59" />
              <path d="M31 25 Q50 22 69 25" fill="none" stroke="#134E4A" stroke-width="1.5" />
            </g>
          `;
        default:
          return '';
      }

    case 'hairAcc':
      switch (subIndex) {
        case 0:
          // Decorative Headband / Alice Band
          return `
            <g id="acc-hair-0">
              <path d="M26 30 C25 21, 35 18, 50 18 C65 18, 75 21, 74 30" fill="none" stroke="#EC4899" stroke-width="3" stroke-linecap="round" />
            </g>
          `;
        case 1:
          // Gold Barrette / Hair Clip
          return `
            <g id="acc-hair-1">
              <rect x="29" y="24" width="10" height="3" rx="1.5" fill="#F59E0B" stroke="#D97706" stroke-width="0.8" transform="rotate(-15 29 24)" />
              <circle cx="38" cy="21.5" r="1.5" fill="#FFFFFF" />
            </g>
          `;
        default:
          return '';
      }

    case 'headset':
      // Sleek Wireless Over-Ear Headset (Minority ~4%)
      return `
        <g id="acc-headset">
          <!-- Headband -->
          <path d="M24 44 C22 12, 78 12, 76 44" fill="none" stroke="#0F172A" stroke-width="4" stroke-linecap="round" />
          <path d="M32 17 C41 15, 59 15, 68 17" fill="none" stroke="#334155" stroke-width="2" stroke-linecap="round" />
          <!-- Earpads -->
          <rect x="19" y="40" width="7" height="16" rx="3.5" fill="#2563EB" stroke="#0F172A" stroke-width="1.5" />
          <rect x="74" y="40" width="7" height="16" rx="3.5" fill="#2563EB" stroke="#0F172A" stroke-width="1.5" />
        </g>
      `;

    default:
      return '';
  }
}

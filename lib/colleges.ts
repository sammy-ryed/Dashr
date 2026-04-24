/**
 * ═══════════════════════════════════════════════════════════════
 * DASHR — College Config Registry
 * ═══════════════════════════════════════════════════════════════
 *
 * Single source of truth for all college-specific personalisation.
 *
 * ── HOW TO ADD A NEW COLLEGE ────────────────────────────────────
 * 1. Add a new entry to COLLEGE_REGISTRY below (copy any existing block).
 * 2. Add the slug to middleware.ts → KNOWN_SLUGS.
 * 3. Point the subdomain at the deployment.
 */

// ── TYPE DEFINITIONS ──────────────────────────────────────────

export interface CollegeHostel {
  id: string;
  name: string;
  zone: 'near' | 'mid' | 'far';
  /** Optional — used when a college organises hostels by gender/type (e.g. 'boys' | 'girls' | 'international') */
  category?: string;
}

export interface CollegeHotspot {
  id: string;
  name: string;
  /** 'inside' = within campus gate, 'outside' = outside campus gate */
  location: 'inside' | 'outside';
  /** Walk time in minutes from the furthest hostel */
  walkMinutesFromFar: number;
}

export interface CommissionTiers {
  /** Flat ₹ commission for on-campus (inside) orders */
  inside: number;
  /** Flat ₹ commission for off-campus (outside) orders */
  outside: number;
}

export interface CollegeConfig {
  slug: string;
  /** Short brand name shown in navbar (e.g. "SRM", "MAHE Bengaluru") */
  name: string;
  /** Full official name for footer */
  fullName: string;
  /** City / area */
  location: string;
  /** Hero section one-liner */
  tagline: string;
  /** Currency symbol */
  currency: string;
  /** What the college calls their student ID (e.g. "SRM Registration ID") */
  studentIdLabel: string;
  hostels: CollegeHostel[];
  hotspots: CollegeHotspot[];
  commissionTiers: CommissionTiers;
  /** Sarcastic one-liners used in the scrolling ticker on the landing page */
  campusSlang: string[];
  /** What students call the main food area */
  canteenName: string;
  /** Does this college use coloured department lanyards? */
  lanyardSystem: boolean;
}

// ── COLLEGE REGISTRY ──────────────────────────────────────────

const COLLEGE_REGISTRY: Record<string, CollegeConfig> = {

  // ── SRM IST KATTANKULATHUR ──────────────────────────────────
  srm: {
    slug: 'srm',
    name: 'SRM',
    fullName: 'SRM Institute of Science and Technology, Kattankulathur',
    location: 'Kattankulathur, Chennai',
    tagline: 'Campus Delivery · SRM IST',
    currency: '₹',
    studentIdLabel: 'SRM Registration ID',

    hostels: [
      { id: 'sannasi-a',   name: 'Sannasi A',              zone: 'far',  category: 'boys'          },
      { id: 'sannasi-c',   name: 'Sannasi C',              zone: 'far',  category: 'boys'          },
      { id: 'manoranjitham', name: 'Manoranjitham',         zone: 'far',  category: 'boys'          },
      { id: 'mullai',      name: 'Mullai',                  zone: 'mid',  category: 'girls'         },
      { id: 'paari',       name: 'Paari',                   zone: 'mid',  category: 'girls'         },
      { id: 'kaari',       name: 'Kaari',                   zone: 'mid',  category: 'girls'         },
      { id: 'oori',        name: 'Oori',                    zone: 'mid',  category: 'girls'         },
      { id: 'adiyaman',    name: 'Adiyaman',                zone: 'near', category: 'boys'          },
      { id: 'mandela',     name: 'Nelson Mandela Block',    zone: 'near', category: 'boys'          },
      { id: 'began',       name: 'Began',                   zone: 'near', category: 'boys'          },
      { id: 'esq-a',       name: 'ESQ A',                   zone: 'mid',  category: 'boys'          },
      { id: 'esq-b',       name: 'ESQ B',                   zone: 'mid',  category: 'boys'          },
      { id: 'shenbagam',   name: 'Shenbagam',               zone: 'near', category: 'girls'         },
      { id: 'kalpana',     name: 'Kalpana Chawla',          zone: 'near', category: 'girls'         },
      { id: 'meenakshi',   name: 'Meenakshi',               zone: 'near', category: 'girls'         },
      { id: 'kopperundevi', name: 'Kopperundevi (M Block)', zone: 'near', category: 'girls'         },
      { id: 'green-pearl', name: 'Green Pearl',             zone: 'far',  category: 'international' },
      { id: 'nri',         name: 'NRI Hostel',              zone: 'far',  category: 'international' },
      { id: 'tamarai',     name: 'Tamarai',                 zone: 'mid',  category: 'boys'          },
      { id: 'malligai',    name: 'Malligai',                zone: 'mid',  category: 'boys'          },
      { id: 'abode',       name: 'Abode',                   zone: 'near', category: 'boys'          },
    ],

    hotspots: [
      { id: 'nilgiri',      name: 'Nilgiri\'s',             location: 'inside',  walkMinutesFromFar: 12 },
      { id: 'durga-samy',   name: 'Durga Samy',             location: 'inside',  walkMinutesFromFar: 14 },
      { id: 'dominos-srm',  name: 'Domino\'s',              location: 'inside',  walkMinutesFromFar: 10 },
      { id: 'subway-srm',   name: 'Subway',                 location: 'inside',  walkMinutesFromFar: 10 },
      { id: 'potheri',      name: 'Potheri',                location: 'outside', walkMinutesFromFar: 20 },
      { id: 'aborde',       name: 'Aborde',                 location: 'outside', walkMinutesFromFar: 25 },
      { id: 'maraimalai',   name: 'Maraimalai Nagar',       location: 'outside', walkMinutesFromFar: 35 },
    ],

    commissionTiers: {
      inside: 20,
      outside: 40,
    },

    campusSlang: [
      '🧍 Walking to the canteen is cardio you didn\'t ask for.',
      '💀 Your hostel is 3 buildings away from food. That\'s basically off-campus.',
      '🥵 It\'s 40°C outside. You have an exam in 2 hours. You deserve this.',
      '😴 You\'ve been lying down for 4 hours. Getting up is not an option.',
      '📚 You\'re "studying" — ordering Maggi is self-care.',
      '🏃 The walk to Nilgiri\'s alone burns more calories than the food replaces.',
    ],

    canteenName: 'canteen',
    lanyardSystem: false,
  },

  // ── MAHE BENGALURU (Manipal Academy of Higher Education) ─────
  manipal: {
    slug: 'manipal',
    name: 'MAHE Bengaluru',
    fullName: 'Manipal Academy of Higher Education, Yelahanka, Govindapura, Bengaluru',
    location: 'Yelahanka, Bengaluru',
    tagline: 'Campus Delivery · MAHE Bengaluru',
    currency: '₹',
    studentIdLabel: 'Student ID',

    hostels: [
      { id: 'hb1',       name: 'HB1',        zone: 'far'  },
      { id: 'hb2',       name: 'HB2',        zone: 'mid'  },
      { id: 'hb3',       name: 'HB3',        zone: 'near' },
      { id: 'hb4-girls', name: 'HB4 Girls',  zone: 'near' },
      { id: 'hb4-boys',  name: 'HB4 Boys',   zone: 'near' },
    ],

    hotspots: [
      // Inside campus — food court area between HB3 and HB4
      { id: 'blue-dove',  name: 'Blue Dove Canteen', location: 'inside',  walkMinutesFromFar: 8  },
      { id: 'mart',       name: 'Mart',              location: 'inside',  walkMinutesFromFar: 8  },
      { id: 'dominos',    name: "Domino's",          location: 'inside',  walkMinutesFromFar: 8  },
      { id: 'subway',     name: 'Subway',            location: 'inside',  walkMinutesFromFar: 8  },
      // Inside campus — far from hostels
      { id: 'yippie',     name: 'Yippie',            location: 'inside',  walkMinutesFromFar: 20 },
      // Outside campus gate
      { id: 'siri',        name: 'Siri',             location: 'outside', walkMinutesFromFar: 25 },
      { id: 'kuns',        name: 'Kuns',             location: 'outside', walkMinutesFromFar: 25 },
      { id: 'ohms',        name: "Ohm's",            location: 'outside', walkMinutesFromFar: 35 },
      { id: 'cafe-saarchi', name: 'Cafe Saarchi',    location: 'outside', walkMinutesFromFar: 35 },
    ],

    commissionTiers: {
      inside: 20,
      outside: 40,
    },

    campusSlang: [
      '🥵 Bengaluru said "pleasant weather" and sent 34°C. HB1 prisoners are not leaving.',
      '😮‍💨 The mart area is RIGHT THERE. The walk from HB1 is a different story entirely.',
      '🕊️ Blue Dove has your food. Your motivation to walk there does not exist. We get it.',
      '🦺 Your lanyard is a different colour from theirs. Your hunger is the same. DASHR unites.',
      '🛺 Siri and Kuns are "just outside the gate." Sure. So is the sun. Both equally avoidable.',
      '📖 Deep in the zone. Flow state activated. The mart area is not in your flow state. We are.',
    ],

    canteenName: 'mart area',
    lanyardSystem: true,
  },

};

// ── PUBLIC API ────────────────────────────────────────────────

/**
 * Returns the college config for the given slug.
 * Falls back to the "srm" config if the slug is unrecognised.
 */
export function getCollegeConfig(slug: string): CollegeConfig {
  return COLLEGE_REGISTRY[slug] ?? COLLEGE_REGISTRY['srm'];
}

export type { CollegeConfig as default };

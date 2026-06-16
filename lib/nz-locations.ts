/**
 * New Zealand location reference data — the Region → District hierarchy used by
 * the property search filters (and anywhere a region/district picker is needed).
 *
 * This is the SINGLE SOURCE OF TRUTH for NZ regions and districts.
 *
 * ── How to edit ──────────────────────────────────────────────────────────────
 *   • Add a region:    add a new `{ name, districts: [...] }` object below.
 *   • Add a district:  add a string to that region's `districts` array.
 *   • Rename:          edit the string in place (these are display values; if you
 *                      later store them on listings, a rename is a data change).
 *   • Suburbs (later): districts are plain strings for now. When you add suburb
 *                      data, change `districts: string[]` to an array of
 *                      `{ name, suburbs: string[] }` and update the helpers.
 *
 * The "All New Zealand" / "All districts" entries are UI sentinels added by the
 * picker component — they are intentionally NOT part of this data.
 */

export interface NzRegion {
  /** Display name, e.g. "Auckland". */
  name: string;
  /** Districts within the region, in display order. */
  districts: readonly string[];
}

export const NZ_REGIONS: readonly NzRegion[] = [
  {
    name: "Northland",
    districts: ["Far North", "Kaipara", "Whangarei"],
  },
  {
    name: "Auckland",
    districts: [
      "Auckland City",
      "Franklin",
      "Hauraki Gulf Islands",
      "Manukau City",
      "North Shore City",
      "Papakura",
      "Rodney",
      "Waiheke Island",
      "Waitakere City",
    ],
  },
  {
    name: "Waikato",
    districts: [
      "Hamilton",
      "Hauraki",
      "Matamata-Piako",
      "Otorohanga",
      "South Waikato",
      "Taupo",
      "Thames-Coromandel",
      "Waikato",
      "Waipa",
      "Waitomo",
    ],
  },
  {
    name: "Bay of Plenty",
    districts: [
      "Kawerau",
      "Opotiki",
      "Rotorua",
      "Tauranga",
      "Western Bay of Plenty",
      "Whakatane",
    ],
  },
  {
    name: "Gisborne",
    districts: ["Gisborne"],
  },
  {
    name: "Hawke's Bay",
    districts: ["Central Hawke's Bay", "Hastings", "Napier", "Wairoa"],
  },
  {
    name: "Taranaki",
    districts: ["New Plymouth", "South Taranaki", "Stratford"],
  },
  {
    name: "Manawatu / Whanganui",
    districts: [
      "Horowhenua",
      "Manawatu",
      "Palmerston North",
      "Rangitikei",
      "Ruapehu",
      "Tararua",
      "Whanganui",
    ],
  },
  {
    name: "Wellington",
    districts: [
      "Carterton",
      "Kapiti Coast",
      "Lower Hutt",
      "Masterton",
      "Porirua",
      "South Wairarapa",
      "Upper Hutt",
      "Wellington",
    ],
  },
  {
    name: "Nelson / Tasman",
    districts: ["Nelson", "Tasman"],
  },
  {
    name: "Marlborough",
    districts: ["Blenheim", "Kaikoura", "Marlborough"],
  },
  {
    name: "West Coast",
    districts: ["Buller", "Grey", "Westland"],
  },
  {
    name: "Canterbury",
    districts: [
      "Ashburton",
      "Banks Peninsula",
      "Christchurch City",
      "Hurunui",
      "Mackenzie",
      "Selwyn",
      "Timaru",
      "Waimakariri",
      "Waimate",
    ],
  },
  {
    name: "Otago",
    districts: [
      "Central Otago",
      "Clutha",
      "Dunedin",
      "Queenstown-Lakes",
      "South Otago",
      "Waitaki",
      "Wanaka",
    ],
  },
  {
    name: "Southland",
    districts: ["Catlins", "Gore", "Invercargill", "Southland"],
  },
] as const;

/**
 * Suburbs by district name (keys MUST match the district strings above). This
 * covers NZ's main urban districts with their well-known suburbs; districts not
 * listed here simply have no suburb list, and the picker falls back to free
 * text. The list is suggestions, not an exhaustive gazetteer — the Suburb field
 * always allows typing one that isn't here.
 */
export const NZ_SUBURBS: Record<string, readonly string[]> = {
  // ── Northland ──
  "Far North": ["Kerikeri", "Kaitaia", "Kaikohe", "Paihia", "Russell", "Waipapa", "Moerewa", "Kawakawa"],
  Kaipara: ["Dargaville", "Mangawhai", "Mangawhai Heads", "Maungaturoto", "Kaiwaka", "Ruawai"],
  Whangarei: ["Whangarei Central", "Kamo", "Kensington", "Tikipunga", "Onerahi", "Maunu", "Raumanga", "Regent", "Morningside", "Otaika", "Riverside", "Whangarei Heads"],
  // ── Auckland ──
  "Auckland City": ["Auckland Central", "Ponsonby", "Grey Lynn", "Freemans Bay", "Herne Bay", "Westmere", "Kingsland", "Mount Eden", "Epsom", "Newmarket", "Parnell", "Remuera", "Ōrākei", "Mission Bay", "Saint Heliers", "Kohimarama", "Meadowbank", "Mount Albert", "Sandringham", "Balmoral", "Mount Roskill", "Onehunga", "Royal Oak", "Ellerslie", "Greenlane", "One Tree Hill", "Penrose", "Avondale", "Point Chevalier", "Grafton"],
  "North Shore City": ["Takapuna", "Devonport", "Milford", "Northcote", "Birkenhead", "Beach Haven", "Glenfield", "Bayswater", "Belmont", "Forrest Hill", "Sunnynook", "Mairangi Bay", "Murrays Bay", "Browns Bay", "Rothesay Bay", "Torbay", "Albany", "Greenhithe", "Unsworth Heights", "Hillcrest"],
  "Manukau City": ["Manukau", "Manurewa", "Papatoetoe", "Ōtara", "Māngere", "Māngere Bridge", "Wiri", "Clendon Park", "Weymouth", "Howick", "Pakuranga", "Botany Downs", "Flat Bush", "Dannemora", "Half Moon Bay", "Highland Park", "East Tāmaki", "Mangere East"],
  "Waitakere City": ["Henderson", "New Lynn", "Te Atatū Peninsula", "Te Atatū South", "Massey", "Ranui", "Swanson", "Glen Eden", "Titirangi", "Green Bay", "Kelston", "Glendene", "Sunnyvale", "Western Heights", "Oratia"],
  Rodney: ["Orewa", "Whangaparāoa", "Silverdale", "Warkworth", "Snells Beach", "Wellsford", "Helensville", "Riverhead", "Kumeu", "Huapai", "Matakana", "Dairy Flat"],
  Papakura: ["Papakura", "Takanini", "Drury", "Karaka", "Rosehill", "Conifer Grove", "Opaheke"],
  Franklin: ["Pukekohe", "Waiuku", "Tuakau", "Pokeno", "Patumahoe", "Buckland"],
  "Waiheke Island": ["Oneroa", "Palm Beach", "Onetangi", "Surfdale", "Ostend", "Blackpool"],
  "Hauraki Gulf Islands": ["Tryphena", "Claris", "Port Fitzroy", "Okupu", "Medlands", "Kawau Island"],
  // ── Waikato ──
  Hamilton: ["Hamilton Central", "Hamilton East", "Hamilton West", "Frankton", "Chartwell", "Rototuna", "Flagstaff", "Hillcrest", "Claudelands", "Fairfield", "Fairview Downs", "Glenview", "Melville", "Nawton", "Dinsdale", "Te Rapa", "Pukete", "Huntington", "Queenwood"],
  Waipa: ["Cambridge", "Te Awamutu", "Kihikihi", "Leamington", "Pirongia", "Ohaupo"],
  Waikato: ["Ngaruawahia", "Huntly", "Raglan", "Te Kauwhata", "Taupiri", "Tuakau"],
  Taupo: ["Taupo", "Kinloch", "Turangi", "Acacia Bay", "Nukuhau", "Hilltop", "Richmond Heights"],
  "Thames-Coromandel": ["Thames", "Whitianga", "Whangamata", "Tairua", "Coromandel", "Pauanui", "Matarangi"],
  Hauraki: ["Paeroa", "Waihi", "Ngatea", "Turua", "Kerepehi", "Whiritoa"],
  "Matamata-Piako": ["Matamata", "Morrinsville", "Te Aroha", "Waharoa", "Tatuanui"],
  Otorohanga: ["Otorohanga", "Kawhia", "Waitomo", "Arohena"],
  "South Waikato": ["Tokoroa", "Putaruru", "Tirau", "Arapuni"],
  Waitomo: ["Te Kuiti", "Piopio", "Mokau", "Benneydale"],
  // ── Bay of Plenty ──
  Tauranga: ["Tauranga Central", "Mount Maunganui", "Papamoa", "Papamoa Beach", "Bethlehem", "Greerton", "Gate Pā", "Brookfield", "Otumoetai", "Matua", "Bellevue", "Welcome Bay", "Pyes Pā", "Tauriko"],
  Rotorua: ["Rotorua Central", "Glenholme", "Fenton Park", "Ngongotahā", "Owhata", "Lynmore", "Springfield", "Western Heights", "Fairy Springs", "Fordlands"],
  Whakatane: ["Whakatane", "Ohope", "Edgecumbe", "Coastlands", "Awakeri"],
  "Western Bay of Plenty": ["Te Puke", "Katikati", "Ōmokoroa", "Waihi Beach", "Maketu", "Paengaroa"],
  Kawerau: ["Kawerau"],
  Opotiki: ["Opotiki", "Te Kaha", "Waihau Bay", "Ōhiwa"],
  // ── Gisborne / Hawke's Bay ──
  Gisborne: ["Gisborne Central", "Kaiti", "Mangapapa", "Whataupoko", "Te Hapara", "Elgin", "Awapuni"],
  Napier: ["Napier South", "Marewa", "Onekawa", "Ahuriri", "Bluff Hill", "Tamatea", "Greenmeadows", "Taradale", "Pirimai", "Maraenui", "Westshore", "Bay View"],
  Hastings: ["Hastings Central", "Flaxmere", "Mahora", "Saint Leonards", "Akina", "Parkvale", "Camberley", "Havelock North", "Frimley", "Mayfair", "Raureka"],
  "Central Hawke's Bay": ["Waipukurau", "Waipawa", "Otane", "Takapau", "Porangahau"],
  Wairoa: ["Wairoa", "Tuai", "Frasertown", "Mahia", "Nuhaka"],
  // ── Taranaki ──
  "New Plymouth": ["New Plymouth Central", "Fitzroy", "Bell Block", "Waiwhakaiho", "Strandon", "Vogeltown", "Westown", "Spotswood", "Moturoa", "Welbourn", "Merrilands", "Highlands Park", "Ōākura", "Waitara", "Inglewood"],
  "South Taranaki": ["Hāwera", "Eltham", "Patea", "Manaia", "Ōpunake", "Waverley"],
  Stratford: ["Stratford", "Midhirst", "Toko"],
  // ── Manawatū / Whanganui ──
  "Palmerston North": ["Palmerston North Central", "Hokowhitu", "Terrace End", "Roslyn", "Takaro", "West End", "Awapuni", "Milson", "Highbury", "Kelvin Grove", "Aokautere", "Cloverlea", "Fitzherbert"],
  Whanganui: ["Whanganui Central", "Gonville", "Castlecliff", "Saint Johns Hill", "Springvale", "Aramoho", "Tawhero", "Wembley"],
  Horowhenua: ["Levin", "Foxton", "Foxton Beach", "Shannon", "Ōhau", "Waitarere Beach"],
  Manawatu: ["Feilding", "Sanson", "Halcombe", "Rongotea"],
  Rangitikei: ["Marton", "Bulls", "Taihape", "Hunterville", "Mangaweka"],
  Ruapehu: ["Taumarunui", "Ohakune", "Raetihi", "National Park", "Waiouru"],
  Tararua: ["Dannevirke", "Pahiatua", "Woodville", "Eketahuna", "Norsewood"],
  // ── Wellington ──
  Wellington: ["Wellington Central", "Te Aro", "Mount Victoria", "Thorndon", "Kelburn", "Aro Valley", "Newtown", "Mount Cook", "Brooklyn", "Island Bay", "Berhampore", "Karori", "Northland", "Wadestown", "Khandallah", "Ngaio", "Crofton Downs", "Johnsonville", "Tawa", "Miramar", "Kilbirnie", "Hataitai", "Lyall Bay", "Seatoun", "Strathmore Park", "Oriental Bay"],
  "Lower Hutt": ["Lower Hutt Central", "Petone", "Alicetown", "Naenae", "Taita", "Wainuiomata", "Stokes Valley", "Eastbourne", "Waterloo", "Woburn", "Avalon", "Boulcott", "Epuni", "Moera", "Maungaraki", "Belmont", "Kelson"],
  "Upper Hutt": ["Upper Hutt Central", "Trentham", "Heretaunga", "Silverstream", "Totara Park", "Pinehaven", "Te Marua", "Wallaceville", "Brown Owl"],
  Porirua: ["Porirua Central", "Whitby", "Plimmerton", "Paremata", "Titahi Bay", "Cannons Creek", "Waitangirua", "Aotea", "Papakowhai", "Pukerua Bay", "Mana"],
  "Kapiti Coast": ["Paraparaumu", "Paraparaumu Beach", "Waikanae", "Raumati Beach", "Raumati South", "Ōtaki", "Paekākāriki"],
  Masterton: ["Masterton", "Lansdowne", "Kuripuni", "Solway"],
  Carterton: ["Carterton", "Clareville", "Dalefield"],
  "South Wairarapa": ["Martinborough", "Greytown", "Featherston", "Lake Ferry"],
  // ── Nelson / Tasman / Marlborough ──
  Nelson: ["Nelson Central", "Tahunanui", "Stoke", "Atawhai", "The Wood", "Nelson South", "Toi Toi", "Washington Valley", "Britannia Heights", "Enner Glynn", "Maitai"],
  Tasman: ["Richmond", "Motueka", "Brightwater", "Wakefield", "Māpua", "Tākaka", "Murchison"],
  Marlborough: ["Blenheim", "Springlands", "Witherlea", "Redwoodtown", "Mayfield", "Renwick", "Picton", "Havelock"],
  Blenheim: ["Blenheim Central", "Springlands", "Witherlea", "Redwoodtown", "Mayfield", "Riverlands"],
  Kaikoura: ["Kaikoura", "South Bay", "Peketa", "Oaro"],
  // ── West Coast ──
  Grey: ["Greymouth", "Cobden", "Blaketown", "Runanga", "Karoro"],
  Buller: ["Westport", "Reefton", "Carters Beach"],
  Westland: ["Hokitika", "Franz Josef", "Fox Glacier", "Ross"],
  // ── Canterbury ──
  "Christchurch City": ["Christchurch Central", "Riccarton", "Ilam", "Fendalton", "Merivale", "Saint Albans", "Papanui", "Bryndwr", "Addington", "Sydenham", "Spreydon", "Cashmere", "Sumner", "Redcliffs", "Ferrymead", "Linwood", "Woolston", "New Brighton", "Aranui", "Shirley", "Burwood", "Hornby", "Hoon Hay", "Halswell", "Wigram", "Avonhead", "Bishopdale", "Northwood"],
  Selwyn: ["Rolleston", "Lincoln", "Prebbleton", "West Melton", "Leeston", "Darfield", "Springston"],
  Waimakariri: ["Rangiora", "Kaiapoi", "Woodend", "Pegasus", "Oxford", "Cust"],
  Timaru: ["Timaru", "Highfield", "Parkside", "Marchwiel", "Glenwood", "Gleniti", "Washdyke", "Temuka", "Pleasant Point"],
  Ashburton: ["Ashburton", "Tinwald", "Allenton", "Hampstead", "Netherby", "Methven", "Rakaia"],
  "Banks Peninsula": ["Akaroa", "Lyttelton", "Diamond Harbour", "Governors Bay", "Duvauchelle"],
  Hurunui: ["Amberley", "Hanmer Springs", "Cheviot", "Waikari", "Hawarden", "Waipara"],
  Mackenzie: ["Twizel", "Fairlie", "Lake Tekapo", "Burkes Pass"],
  Waimate: ["Waimate", "Saint Andrews", "Glenavy", "Morven"],
  // ── Otago ──
  Dunedin: ["Dunedin Central", "North Dunedin", "North East Valley", "Saint Clair", "Saint Kilda", "Caversham", "Mornington", "Roslyn", "Maori Hill", "Mosgiel", "Green Island", "Andersons Bay", "Musselburgh", "Brockville", "Corstorphine", "Kaikorai", "Opoho", "Pine Hill"],
  "Queenstown-Lakes": ["Queenstown", "Frankton", "Fernhill", "Kelvin Heights", "Arrowtown", "Lake Hayes", "Jacks Point", "Arthurs Point", "Sunshine Bay"],
  Wanaka: ["Wanaka", "Albert Town", "Hāwea", "Lake Hāwea"],
  "Central Otago": ["Alexandra", "Cromwell", "Clyde", "Roxburgh", "Ranfurly"],
  Waitaki: ["Oamaru", "Weston", "Kakanui", "Palmerston"],
  Clutha: ["Balclutha", "Milton", "Kaitangata", "Tapanui"],
  "South Otago": ["Milton", "Kaitangata", "Owaka", "Clinton", "Stirling"],
  // ── Southland ──
  Invercargill: ["Invercargill Central", "Waikiwi", "Windsor", "Glengarry", "Hawthorndale", "Avenal", "Richmond", "Appleby", "Newfield", "Otatara", "Bluff"],
  Gore: ["Gore", "Mataura", "East Gore"],
  Southland: ["Winton", "Te Anau", "Riverton", "Otautau", "Lumsden", "Tuatapere"],
  Catlins: ["Owaka", "Papatowai", "Pounawea", "Kaka Point", "Curio Bay"],
};

/** Suburbs for a district (case-insensitive). Empty when we have no list. */
export function getSuburbs(
  district: string | undefined | null,
): readonly string[] {
  if (!district) return [];
  const key = Object.keys(NZ_SUBURBS).find(
    (k) => k.toLowerCase() === district.toLowerCase(),
  );
  return key ? NZ_SUBURBS[key] : [];
}

/** Just the region names, in display order — handy for a region <Select>. */
export const NZ_REGION_NAMES: readonly string[] = NZ_REGIONS.map((r) => r.name);

/** Quick lookup of districts by region name (case-insensitive). */
export function getDistricts(region: string | undefined | null): readonly string[] {
  if (!region) return [];
  const match = NZ_REGIONS.find(
    (r) => r.name.toLowerCase() === region.toLowerCase(),
  );
  return match?.districts ?? [];
}

/** True if `name` is a known NZ region. */
export function isNzRegion(name: string): boolean {
  return NZ_REGIONS.some((r) => r.name.toLowerCase() === name.toLowerCase());
}

// ── Place resolution ─────────────────────────────────────────────────────────
// Lookups built once from the reference data above, so a free-text place name
// (from the home search, a popular-suburb chip, or a top-cities tile) can be
// resolved to the region/district the listing search + filter dropdowns speak.

const REGION_BY_LOWER = new Map(
  NZ_REGIONS.map((r) => [r.name.toLowerCase(), r.name]),
);

const DISTRICT_BY_LOWER = new Map<string, { region: string; district: string }>();
for (const r of NZ_REGIONS) {
  for (const d of r.districts) {
    if (!DISTRICT_BY_LOWER.has(d.toLowerCase())) {
      DISTRICT_BY_LOWER.set(d.toLowerCase(), { region: r.name, district: d });
    }
  }
}

const SUBURB_BY_LOWER = new Map<
  string,
  { region: string; district: string; suburb: string }
>();
for (const [district, suburbs] of Object.entries(NZ_SUBURBS)) {
  const dr = DISTRICT_BY_LOWER.get(district.toLowerCase());
  if (!dr) continue;
  for (const s of suburbs) {
    const key = s.toLowerCase();
    if (!SUBURB_BY_LOWER.has(key)) {
      SUBURB_BY_LOWER.set(key, { region: dr.region, district, suburb: s });
    }
  }
}

/** A place name resolved to the levels the property search understands. */
export interface ResolvedPlace {
  region?: string;
  district?: string;
  suburb?: string;
}

/**
 * Resolve a free-text place name to `{ region, district, suburb }` so the browse
 * page can pre-select the region/district dropdowns instead of leaving them on
 * "All New Zealand". Matching is case-insensitive and most-specific-wins:
 *   • a region name           → `{ region }`
 *   • a district name         → `{ region, district }`
 *   • a suburb name           → `{ region, district, suburb }`
 *   • a city that is really a  → partial district match (e.g. "Christchurch"
 *     district with a suffix      resolves to "Christchurch City")
 * Unrecognised text resolves to `{}` and is treated as a plain keyword.
 */
export function resolvePlace(name: string | undefined | null): ResolvedPlace {
  const key = name?.trim().toLowerCase();
  if (!key) return {};

  const region = REGION_BY_LOWER.get(key);
  if (region) return { region };

  const district = DISTRICT_BY_LOWER.get(key);
  if (district) return district;

  const suburb = SUBURB_BY_LOWER.get(key);
  if (suburb) return suburb;

  // Fall back to a whole-word prefix match on districts so a colloquial main
  // centre ("Christchurch") still resolves to its official district
  // ("Christchurch City") without matching unrelated substrings.
  for (const [dk, info] of DISTRICT_BY_LOWER) {
    if (dk.startsWith(`${key} `) || key.startsWith(`${dk} `)) return info;
  }

  return {};
}

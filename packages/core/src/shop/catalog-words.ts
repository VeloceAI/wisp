/**
 * Everyday grocery and household words in Hindi, Hinglish and other Indian languages, mapped to the
 * English word a catalogue usually uses. Lets "pyaaz dikhao" search for "onion" with no AI.
 */
const DICT: Record<string, string[]> = {
  onion: ['pyaaz', 'pyaz', 'piyaz', 'kanda', 'kaanda', 'vengayam', 'ullipaya', 'eerulli', 'peyaj', 'प्याज़', 'प्याज', 'कांदा', 'வெங்காயம்', 'ఉల్లిపాయ', 'পেঁয়াজ'],
  tomato: ['tamatar', 'tamaatar', 'thakkali', 'tameta', 'टमाटर', 'தக்காளி', 'టమాటా', 'টমেটো'],
  potato: ['aloo', 'alu', 'batata', 'urulaikizhangu', 'आलू', 'बटाटा', 'உருளைக்கிழங்கு', 'బంగాళాదుంప', 'আলু'],
  garlic: ['lehsun', 'lahsun', 'lasun', 'poondu', 'लहसुन', 'பூண்டு'],
  ginger: ['adrak', 'aale', 'inji', 'अदरक', 'இஞ்சி'],
  'green chilli': ['hari mirch', 'mirchi', 'mirch', 'हरी मिर्च', 'मिर्च', 'மிளகாய்'],
  coriander: ['dhaniya', 'dhania', 'kothimbir', 'kothamalli', 'धनिया', 'कोथिंबीर', 'கொத்தமல்லி'],
  mint: ['pudina', 'पुदीना', 'புதினா'],
  spinach: ['palak', 'पालक', 'கீரை'],
  cauliflower: ['gobhi', 'gobi', 'phool gobhi', 'फूलगोभी', 'गोभी'],
  cabbage: ['patta gobhi', 'band gobhi', 'पत्ता गोभी'],
  brinjal: ['baingan', 'vangi', 'kathirikai', 'बैंगन', 'கத்தரிக்காய்'],
  okra: ['bhindi', 'vendakkai', 'भिंडी', 'வெண்டைக்காய்'],
  carrot: ['gajar', 'गाजर', 'கேரட்'],
  cucumber: ['kheera', 'kakdi', 'खीरा', 'ककड़ी'],
  peas: ['matar', 'मटर'],
  lemon: ['nimbu', 'limbu', 'नींबू', 'எலுமிச்சை'],
  banana: ['kela', 'kele', 'vazhaipazham', 'केला', 'வாழைப்பழம்'],
  apple: ['seb', 'सेब'],
  mango: ['aam', 'aamba', 'maambazham', 'आम', 'மாம்பழம்'],
  grapes: ['angoor', 'अंगूर'],
  orange: ['santra', 'santara', 'narangi', 'संतरा'],
  papaya: ['papita', 'पपीता'],
  coconut: ['nariyal', 'thengai', 'नारियल', 'தேங்காய்'],
  milk: ['doodh', 'dudh', 'paal', 'haalu', 'दूध', 'பால்', 'పాలు', 'দুধ'],
  curd: ['dahi', 'thayir', 'दही', 'தயிர்'],
  buttermilk: ['chaas', 'chhachh', 'mor', 'छाछ'],
  butter: ['makhan', 'makkhan', 'मक्खन'],
  ghee: ['ghi', 'घी', 'நெய்'],
  paneer: ['पनीर'],
  cheese: ['चीज़'],
  egg: ['anda', 'ande', 'muttai', 'अंडा', 'अंडे', 'முட்டை'],
  bread: ['double roti', 'pav', 'ब्रेड', 'पाव'],
  rice: ['chawal', 'chaawal', 'arisi', 'akki', 'चावल', 'அரிசி', 'బియ్యం', 'চাল'],
  'wheat flour': ['atta', 'aata', 'gehun ka atta', 'आटा'],
  'gram flour': ['besan', 'बेसन'],
  semolina: ['suji', 'sooji', 'rava', 'rawa', 'सूजी', 'रवा'],
  'refined flour': ['maida', 'मैदा'],
  lentils: ['dal', 'daal', 'paruppu', 'दाल', 'பருப்பு'],
  'toor dal': ['arhar dal', 'tuvar dal', 'तूर दाल', 'अरहर दाल'],
  'moong dal': ['मूंग दाल'],
  chickpeas: ['chana', 'chole', 'kabuli chana', 'चना', 'छोले'],
  'kidney beans': ['rajma', 'राजमा'],
  sugar: ['cheeni', 'chini', 'shakkar', 'sakkarai', 'चीनी', 'शक्कर', 'சர்க்கரை'],
  jaggery: ['gud', 'gur', 'vellam', 'गुड़'],
  salt: ['namak', 'uppu', 'नमक', 'உப்பு'],
  'cooking oil': ['tel', 'ennai', 'तेल', 'எண்ணெய்'],
  'mustard oil': ['sarson ka tel', 'सरसों का तेल'],
  turmeric: ['haldi', 'manjal', 'हल्दी', 'மஞ்சள்'],
  'chilli powder': ['lal mirch', 'mirchi powder', 'लाल मिर्च'],
  cumin: ['jeera', 'jeeragam', 'जीरा', 'சீரகம்'],
  'mustard seeds': ['rai', 'sarson', 'kadugu', 'राई'],
  'garam masala': ['गरम मसाला'],
  tea: ['chai', 'chai patti', 'chaha', 'चाय', 'டீ'],
  coffee: ['kaapi', 'कॉफ़ी', 'காபி'],
  biscuits: ['biscuit', 'biskut', 'बिस्कुट'],
  chips: ['wafers', 'चिप्स'],
  'cold drink': ['thanda', 'soft drink', 'ठंडा'],
  water: ['paani', 'pani', 'thanni', 'पानी', 'தண்ணீர்'],
  soap: ['sabun', 'साबुन', 'சோப்பு'],
  detergent: ['washing powder', 'kapde dhone ka', 'डिटर्जेंट'],
  'dishwash bar': ['bartan wala sabun'],
  toothpaste: ['manjan', 'टूथपेस्ट'],
  shampoo: ['शैम्पू'],
  'hair oil': ['baalon ka tel', 'बालों का तेल'],
  'tissue paper': ['tissue', 'napkin'],
  chicken: ['murga', 'murgi', 'kozhi', 'मुर्गा', 'चिकन'],
  fish: ['machli', 'meen', 'मछली', 'மீன்'],
  mutton: ['gosht', 'goat meat', 'मटन'],
  'ice cream': ['kulfi', 'आइसक्रीम'],
  sweets: ['mithai', 'मिठाई'],
  'dry fruits': ['meva', 'मेवा'],
  almonds: ['badam', 'बादाम'],
  cashew: ['kaju', 'काजू'],
  raisins: ['kishmish', 'किशमिश'],
  peanuts: ['moongphali', 'singdana', 'kadalai', 'मूंगफली'],
  honey: ['shahad', 'shehad', 'शहद'],
  vinegar: ['sirka', 'सिरका'],
  pickle: ['achar', 'achaar', 'अचार'],
  papad: ['पापड़'],
  poha: ['chivda', 'aval', 'पोहा'],
  vermicelli: ['sevai', 'seviyan', 'सेवई'],
  'baby diapers': ['diaper', 'langot'],
  'sanitary pads': ['pads', 'sanitary napkin'],
  candle: ['mombatti', 'मोमबत्ती'],
  matchbox: ['machis', 'माचिस'],
  battery: ['बैटरी'],
  'bin bags': ['kachra thaili', 'garbage bag'],
};

const LOOKUP: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [en, words] of Object.entries(DICT)) for (const w of words) m.set(w.toLowerCase(), en);
  return m;
})();
const LONGEST = Math.max(...[...LOOKUP.keys()].map((k) => k.split(' ').length));

/**
 * Rewrites a query into the catalogue's language: "pyaaz" → "onion", "hari mirch" → "green chilli".
 * Store synonyms win over the built-in list; unknown words are kept as they are.
 */
export function toCatalogQuery(query: string, synonyms: Record<string, string> = {}): string {
  const own = new Map(Object.entries(synonyms).map(([k, v]) => [k.toLowerCase(), v]));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    let hit: string | undefined;
    let len = 0;
    for (let n = Math.min(LONGEST, words.length - i); n >= 1 && !hit; n--) {
      const phrase = words.slice(i, i + n).join(' ');
      hit = own.get(phrase) ?? LOOKUP.get(phrase);
      if (hit) len = n;
    }
    out.push(hit ?? words[i]!);
    i += hit ? len : 1;
  }
  return out.join(' ');
}

/** True when the query still has words the catalogue probably won't know (non-Latin script). */
export function looksUntranslated(query: string): boolean {
  return /[^\u0000-ɏ\s\d]/.test(query);
}

/** Every catalogue word and local name, for speech correction. */
export function catalogWords(): string[] {
  return [...Object.keys(DICT), ...LOOKUP.keys()];
}

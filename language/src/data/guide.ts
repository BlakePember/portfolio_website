export interface SoundRule {
  id: string;
  symbol: string;
  title: string;
  rule: string;
  examples: Array<{
    pt: string;
    phonetic: string;
    en: string;
  }>;
  tag: 'Signature Brazilian' | 'Nasal Vowels' | 'Consonants';
}

export interface ContractionRow {
  formula: string;
  result: string;
  meaning: string;
  examplePt: string;
  exampleEn: string;
  kind: 'grammar' | 'spoken';
}

export interface SerEstarPair {
  context: string;
  serPt: string;
  serEn: string;
  estarPt: string;
  estarEn: string;
}

export interface FalseFriend {
  pt: string;
  looksLike: string;
  actuallyMeans: string;
  realPtForLookalike: string;
  examplePt: string;
}

export const SOUND_RULES: SoundRule[] = [
  {
    id: 'r-h',
    symbol: 'R / RR',
    title: 'Initial R and double RR sound like English "H"',
    rule: 'At the start of a word (or doubled as "rr"), Brazilian Portuguese pronounces R like a breathy English "H" (like "hat"). Between two vowels, a single R is a soft tap (like the "tt" in American "butter").',
    tag: 'Signature Brazilian',
    examples: [
      { pt: 'Rio de Janeiro', phonetic: 'HEE-oo jee zhah-NAY-roo', en: 'Rio de Janeiro' },
      { pt: 'carro', phonetic: 'KAH-hoo', en: 'car' },
      { pt: 'caro', phonetic: 'KAH-roo', en: 'expensive (single tap R!)' },
    ],
  },
  {
    id: 'di-ti',
    symbol: 'DI / TI',
    title: 'D and T soften into "J" and "CH" before I (and final E)',
    rule: 'In most of Brazil, "di" and unstressed final "de" sound like English "jee", while "ti" and final "te" sound like "chee". This gives Brazilian Portuguese its musical bounce!',
    tag: 'Signature Brazilian',
    examples: [
      { pt: 'bom dia', phonetic: 'bong JEE-ah', en: 'good morning' },
      { pt: 'boa noite', phonetic: 'BOH-ah NOY-chee', en: 'good night' },
      { pt: 'cidade', phonetic: 'see-DAH-jee', en: 'city' },
    ],
  },
  {
    id: 'final-l',
    symbol: '-L',
    title: 'Final L sounds like "W"',
    rule: 'Whenever an "L" sits at the end of a syllable or word in Brazil, it vocalizes into a smooth "W" sound — never a hard English "L".',
    tag: 'Signature Brazilian',
    examples: [
      { pt: 'Brasil', phonetic: 'brah-ZEEW', en: 'Brazil' },
      { pt: 'legal', phonetic: 'leh-GAW', en: 'cool / nice' },
      { pt: 'futebol', phonetic: 'foo-chee-BOW', en: 'soccer' },
    ],
  },
  {
    id: 'final-oe',
    symbol: '-O / -E',
    title: 'Unstressed final O → "OO" and E → "EE"',
    rule: 'At the end of words (when not accented), "o" relaxes into "oo" and "e" relaxes into "ee".',
    tag: 'Signature Brazilian',
    examples: [
      { pt: 'tudo', phonetic: 'TOO-doo', en: 'everything' },
      { pt: 'obrigado', phonetic: 'oh-bree-GAH-doo', en: 'thank you' },
      { pt: 'leite', phonetic: 'LAY-chee', en: 'milk' },
    ],
  },
  {
    id: 'nasal-ao',
    symbol: 'ÃO / Ã',
    title: 'The iconic Brazilian nasal vowels',
    rule: 'The tilde (~) means air flows through both your nose and mouth. "ão" sounds like saying "ow" while humming gently through your nose. Final "-m" also nasalizes the vowel before it (your lips stay open!).',
    tag: 'Nasal Vowels',
    examples: [
      { pt: 'não', phonetic: 'nowng', en: 'no' },
      { pt: 'pão de queijo', phonetic: 'powng jee KAY-zhoo', en: 'cheese bread' },
      { pt: 'tudo bem', phonetic: 'TOO-doo beng', en: 'all good' },
    ],
  },
  {
    id: 'lh-nh',
    symbol: 'LH / NH',
    title: 'LH = "ly" (million) and NH = "ny" (canyon)',
    rule: 'Just like Spanish "ñ", Portuguese writes the "ny" sound as "nh" and the palatal "ly" sound as "lh".',
    tag: 'Consonants',
    examples: [
      { pt: 'manhã', phonetic: 'mah-NYANG', en: 'morning' },
      { pt: 'cafezinho', phonetic: 'kah-feh-ZEEN-yoo', en: 'little coffee' },
      { pt: 'trabalho', phonetic: 'trah-BAH-lyoo', en: 'work' },
    ],
  },
  {
    id: 'cedilha',
    symbol: 'Ç / S',
    title: 'Ç is always soft "S"; single S between vowels is "Z"',
    rule: 'The cedilla (ç) keeps C soft like "s" before a, o, u. Meanwhile, a single "s" sandwiched between two vowels buzzes like "z" ("casa" = KAH-zah).',
    tag: 'Consonants',
    examples: [
      { pt: 'almoço', phonetic: 'aw-MOH-soo', en: 'lunch' },
      { pt: 'abraço', phonetic: 'ah-BRAH-soo', en: 'hug' },
      { pt: 'casa', phonetic: 'KAH-zah', en: 'house' },
    ],
  },
  {
    id: 'g-j-ch',
    symbol: 'J / GE / CH',
    title: 'J and GE/GI sound like "ZH" (measure); CH = "SH"',
    rule: 'Portuguese J (and G before e/i) is a smooth French-style "zh" (like the "s" in "treasure"), NOT a hard English "j". And "ch" is always a soft "sh".',
    tag: 'Consonants',
    examples: [
      { pt: 'hoje', phonetic: 'OH-zhee', en: 'today (H is silent!)' },
      { pt: 'a gente', phonetic: 'ah ZHENG-chee', en: 'we' },
      { pt: 'chuva', phonetic: 'SHOO-vah', en: 'rain' },
    ],
  },
];

export const CONTRACTIONS: ContractionRow[] = [
  {
    formula: 'em + o / a',
    result: 'no / na',
    meaning: 'in the / on the / at the',
    examplePt: 'Estou na praia e no hotel.',
    exampleEn: 'I am at the beach and at the hotel.',
    kind: 'grammar',
  },
  {
    formula: 'de + o / a',
    result: 'do / da',
    meaning: 'of the / from the',
    examplePt: 'Sou do Brasil. Gosto da música.',
    exampleEn: 'I am from Brazil. I like the music.',
    kind: 'grammar',
  },
  {
    formula: 'a + o / a',
    result: 'ao / à',
    meaning: 'to the',
    examplePt: 'Vou ao cinema e à praia.',
    exampleEn: 'I am going to the movies and to the beach.',
    kind: 'grammar',
  },
  {
    formula: 'por + o / a',
    result: 'pelo / pela',
    meaning: 'by the / through the / for the',
    examplePt: 'Obrigado pela ajuda!',
    exampleEn: 'Thank you for the help!',
    kind: 'grammar',
  },
  {
    formula: 'estou / está',
    result: 'tô / tá',
    meaning: 'I am / he-she-it is (spoken)',
    examplePt: 'Tô indo! Tá tudo certo.',
    exampleEn: "I'm on my way! Everything is all set.",
    kind: 'spoken',
  },
  {
    formula: 'para / para o / para a',
    result: 'pra / pro / pra',
    meaning: 'to / for (spoken)',
    examplePt: 'Vou pro Rio pra descansar.',
    exampleEn: "I'm going to Rio to relax.",
    kind: 'spoken',
  },
  {
    formula: 'não é?',
    result: 'né?',
    meaning: "right? / isn't it?",
    examplePt: 'O Brasil é incrível, né?',
    exampleEn: 'Brazil is incredible, right?',
    kind: 'spoken',
  },
  {
    formula: 'você',
    result: 'cê',
    meaning: 'you (fast casual speech)',
    examplePt: 'Cê vai na festa hoje?',
    exampleEn: 'Are you going to the party today?',
    kind: 'spoken',
  },
];

export const SER_ESTAR_PAIRS: SerEstarPair[] = [
  {
    context: 'Quality vs. Taste right now',
    serPt: 'O café brasileiro é muito bom.',
    serEn: 'Brazilian coffee is very good (in general).',
    estarPt: 'Esse café está muito quente!',
    estarEn: 'This coffee is very hot (right now).',
  },
  {
    context: 'Personality vs. Temporary mood',
    serPt: 'Ele é calmo.',
    serEn: 'He is a calm person.',
    estarPt: 'Ele está cansado hoje.',
    estarEn: 'He is tired today.',
  },
  {
    context: 'Origin vs. Current location',
    serPt: 'Eu sou de Boston.',
    serEn: 'I am from Boston.',
    estarPt: 'Agora estou em São Paulo.',
    estarEn: 'Right now I am in São Paulo.',
  },
  {
    context: 'Wait — fixed buildings use FICAR!',
    serPt: 'A praia fica perto daqui.',
    serEn: 'The beach is located near here ("ficar" for places!).',
    estarPt: 'Eu estou na praia.',
    estarEn: 'I am at the beach (people use "estar").',
  },
];

export const FALSE_FRIENDS: FalseFriend[] = [
  {
    pt: 'Puxar',
    looksLike: 'Push (English)',
    actuallyMeans: 'To PULL! (Watch out on Brazilian doors!)',
    realPtForLookalike: 'Empurrar = to push',
    examplePt: 'A porta diz "Puxe" — puxa para abrir!',
  },
  {
    pt: 'Pretender',
    looksLike: 'Pretend (English)',
    actuallyMeans: 'To intend / plan to',
    realPtForLookalike: 'Fingir = to pretend',
    examplePt: 'Eu pretendo visitar o Brasil no próximo ano.',
  },
  {
    pt: 'Parentes',
    looksLike: 'Parents (English)',
    actuallyMeans: 'Relatives (aunts, uncles, cousins...)',
    realPtForLookalike: 'Pais = parents',
    examplePt: 'Tenho muitos parentes em Minas Gerais.',
  },
  {
    pt: 'Livraria',
    looksLike: 'Library (English)',
    actuallyMeans: 'Bookstore',
    realPtForLookalike: 'Biblioteca = library',
    examplePt: 'Comprei um livro na livraria.',
  },
  {
    pt: 'Esquisito',
    looksLike: 'Exquisite / Spanish exquisito',
    actuallyMeans: 'Weird / strange',
    realPtForLookalike: 'Delicioso / requintado = exquisite',
    examplePt: 'Que barulho esquisito!',
  },
  {
    pt: 'Propina',
    looksLike: 'Tip (Spanish propina)',
    actuallyMeans: 'Bribe! Never say this to a waiter!',
    realPtForLookalike: 'Gorjeta = tip',
    examplePt: 'A gorjeta de 10% já vem na conta.',
  },
];

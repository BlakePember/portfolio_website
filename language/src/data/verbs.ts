export type TenseId = 'presente' | 'passado' | 'imperfeito' | 'futuro';

export type PronounKey = 'eu' | 'voce' | 'nos' | 'voces';

export interface PronounMeta {
  key: PronounKey;
  label: string;
  sublabel: string;
  english: string;
}

export const PRONOUNS: PronounMeta[] = [
  { key: 'eu', label: 'eu', sublabel: 'I', english: 'I' },
  { key: 'voce', label: 'você / ele / ela / a gente', sublabel: 'you · he · she · we (casual)', english: 'you / he / she' },
  { key: 'nos', label: 'nós', sublabel: 'we (standard)', english: 'we' },
  { key: 'voces', label: 'vocês / eles / elas', sublabel: 'y’all · they', english: 'you all / they' },
];

export interface TenseMeta {
  id: TenseId;
  namePt: string;
  nameEn: string;
  description: string;
  exampleEn: string;
}

export const TENSES: TenseMeta[] = [
  {
    id: 'presente',
    namePt: 'Presente',
    nameEn: 'Present',
    description: 'Facts, habits, and things happening now.',
    exampleEn: 'I speak / I am speaking',
  },
  {
    id: 'passado',
    namePt: 'Pretérito Perfeito',
    nameEn: 'Simple Past',
    description: 'Completed actions at a specific time in the past.',
    exampleEn: 'I spoke / I went',
  },
  {
    id: 'imperfeito',
    namePt: 'Pretérito Imperfeito',
    nameEn: 'Imperfect Past',
    description: 'Ongoing past actions, habits ("used to"), or descriptions.',
    exampleEn: 'I used to speak / I was',
  },
  {
    id: 'futuro',
    namePt: 'Futuro Imediato',
    nameEn: 'Spoken Future (ir + verb)',
    description: 'How Brazilians almost always express the future in speech.',
    exampleEn: 'I am going to speak',
  },
];

export type VerbGroup = 'irregular' | 'ar' | 'er' | 'ir';

export interface VerbEntry {
  id: string;
  infinitive: string;
  english: string;
  group: VerbGroup;
  essential: boolean;
  tip: string;
  examplePt: string;
  exampleEn: string;
  conjugations: Record<TenseId, Record<PronounKey, string>>;
  spokenForms?: Partial<Record<PronounKey, string>>;
}

export const VERBS: VerbEntry[] = [
  {
    id: 'ser',
    infinitive: 'ser',
    english: 'to be (permanent / identity)',
    group: 'irregular',
    essential: true,
    tip: 'Use for identity, nationality, profession, time, and permanent traits. Past "fui / foi" is identical to "ir"!',
    examplePt: 'Eu sou de Seattle, mas ela é de Salvador.',
    exampleEn: 'I am from Seattle, and she is from Salvador.',
    conjugations: {
      presente: { eu: 'sou', voce: 'é', nos: 'somos', voces: 'são' },
      passado: { eu: 'fui', voce: 'foi', nos: 'fomos', voces: 'foram' },
      imperfeito: { eu: 'era', voce: 'era', nos: 'éramos', voces: 'eram' },
      futuro: { eu: 'vou ser', voce: 'vai ser', nos: 'vamos ser', voces: 'vão ser' },
    },
  },
  {
    id: 'estar',
    infinitive: 'estar',
    english: 'to be (temporary / mood / location)',
    group: 'irregular',
    essential: true,
    tip: 'In everyday Brazilian speech, "estou" → "tô", "está" → "tá", "estamos" → "tamo", "estão" → "tão"!',
    examplePt: 'Hoje eu estou (tô) muito animado!',
    exampleEn: 'Today I am very excited!',
    spokenForms: { eu: 'tô', voce: 'tá', nos: 'tamo / a gente tá', voces: 'tão' },
    conjugations: {
      presente: { eu: 'estou', voce: 'está', nos: 'estamos', voces: 'estão' },
      passado: { eu: 'estive', voce: 'esteve', nos: 'estivemos', voces: 'estiveram' },
      imperfeito: { eu: 'estava', voce: 'estava', nos: 'estávamos', voces: 'estavam' },
      futuro: { eu: 'vou estar', voce: 'vai estar', nos: 'vamos estar', voces: 'vão estar' },
    },
  },
  {
    id: 'ter',
    infinitive: 'ter',
    english: 'to have (also "there is/are")',
    group: 'irregular',
    essential: true,
    tip: 'In Brazil, "tem" means both "has" AND "there is/are" ("Tem café?"). Note the accent on "têm" (they have).',
    examplePt: 'Você tem um minutinho? Tem uma padaria ali.',
    exampleEn: 'Do you have a quick minute? There is a bakery over there.',
    conjugations: {
      presente: { eu: 'tenho', voce: 'tem', nos: 'temos', voces: 'têm' },
      passado: { eu: 'tive', voce: 'teve', nos: 'tivemos', voces: 'tiveram' },
      imperfeito: { eu: 'tinha', voce: 'tinha', nos: 'tínhamos', voces: 'tinham' },
      futuro: { eu: 'vou ter', voce: 'vai ter', nos: 'vamos ter', voces: 'vão ter' },
    },
  },
  {
    id: 'ir',
    infinitive: 'ir',
    english: 'to go',
    group: 'irregular',
    essential: true,
    tip: 'The #1 verb for building future tense in Brazil: vou / vai / vamos / vão + infinitive!',
    examplePt: 'Amanhã eu vou à praia com meus amigos.',
    exampleEn: 'Tomorrow I am going to the beach with my friends.',
    conjugations: {
      presente: { eu: 'vou', voce: 'vai', nos: 'vamos', voces: 'vão' },
      passado: { eu: 'fui', voce: 'foi', nos: 'fomos', voces: 'foram' },
      imperfeito: { eu: 'ia', voce: 'ia', nos: 'íamos', voces: 'iam' },
      futuro: { eu: 'vou ir', voce: 'vai ir', nos: 'vamos ir', voces: 'vão ir' },
    },
  },
  {
    id: 'fazer',
    infinitive: 'fazer',
    english: 'to do / to make',
    group: 'irregular',
    essential: true,
    tip: 'Also used for weather ("Faz calor") and elapsed time ("Faz dois anos").',
    examplePt: 'O que você vai fazer hoje à noite?',
    exampleEn: 'What are you going to do tonight?',
    conjugations: {
      presente: { eu: 'faço', voce: 'faz', nos: 'fazemos', voces: 'fazem' },
      passado: { eu: 'fiz', voce: 'fez', nos: 'fizemos', voces: 'fizeram' },
      imperfeito: { eu: 'fazia', voce: 'fazia', nos: 'fazíamos', voces: 'faziam' },
      futuro: { eu: 'vou fazer', voce: 'vai fazer', nos: 'vamos fazer', voces: 'vão fazer' },
    },
  },
  {
    id: 'querer',
    infinitive: 'querer',
    english: 'to want',
    group: 'irregular',
    essential: true,
    tip: 'To sound extra polite at restaurants, use the imperfect "eu queria..." (I was wanting / I\'d like...).',
    examplePt: 'Eu quero aprender a falar português bem.',
    exampleEn: 'I want to learn to speak Portuguese well.',
    conjugations: {
      presente: { eu: 'quero', voce: 'quer', nos: 'queremos', voces: 'querem' },
      passado: { eu: 'quis', voce: 'quis', nos: 'quisemos', voces: 'quiseram' },
      imperfeito: { eu: 'queria', voce: 'queria', nos: 'queríamos', voces: 'queriam' },
      futuro: { eu: 'vou querer', voce: 'vai querer', nos: 'vamos querer', voces: 'vão querer' },
    },
  },
  {
    id: 'poder',
    infinitive: 'poder',
    english: 'can / to be able to / may',
    group: 'irregular',
    essential: true,
    tip: 'Super useful for polite requests: "Pode repetir?" (Can you repeat?) and "Posso entrar?" (May I come in?).',
    examplePt: 'Você pode falar um pouco mais devagar?',
    exampleEn: 'Can you speak a little bit slower?',
    conjugations: {
      presente: { eu: 'posso', voce: 'pode', nos: 'podemos', voces: 'podem' },
      passado: { eu: 'pude', voce: 'pôde', nos: 'pudemos', voces: 'puderam' },
      imperfeito: { eu: 'podia', voce: 'podia', nos: 'podíamos', voces: 'podiam' },
      futuro: { eu: 'vou poder', voce: 'vai poder', nos: 'vamos poder', voces: 'vão poder' },
    },
  },
  {
    id: 'dar',
    infinitive: 'dar',
    english: 'to give (also "to work out / be possible")',
    group: 'irregular',
    essential: true,
    tip: 'Brazilians use "dar" constantly in idioms: "Dá pra ir?" (Is it possible to go?), "Deu certo!" (It worked out!).',
    examplePt: 'Hoje não dá, mas amanhã dá sim!',
    exampleEn: "Today doesn't work, but tomorrow works!",
    conjugations: {
      presente: { eu: 'dou', voce: 'dá', nos: 'damos', voces: 'dão' },
      passado: { eu: 'dei', voce: 'deu', nos: 'demos', voces: 'deram' },
      imperfeito: { eu: 'dava', voce: 'dava', nos: 'dávamos', voces: 'davam' },
      futuro: { eu: 'vou dar', voce: 'vai dar', nos: 'vamos dar', voces: 'vão dar' },
    },
  },
  {
    id: 'saber',
    infinitive: 'saber',
    english: 'to know (facts, skills, how to)',
    group: 'irregular',
    essential: false,
    tip: 'Use "saber" for facts or skills ("Sei nadar"). Use "conhecer" for people or places ("Conheço o Rio").',
    examplePt: 'Você sabe onde fica a estação de metrô?',
    exampleEn: 'Do you know where the subway station is?',
    conjugations: {
      presente: { eu: 'sei', voce: 'sabe', nos: 'sabemos', voces: 'sabem' },
      passado: { eu: 'soube', voce: 'soube', nos: 'soubemos', voces: 'souberam' },
      imperfeito: { eu: 'sabia', voce: 'sabia', nos: 'sabíamos', voces: 'sabiam' },
      futuro: { eu: 'vou saber', voce: 'vai saber', nos: 'vamos saber', voces: 'vão saber' },
    },
  },
  {
    id: 'dizer',
    infinitive: 'dizer',
    english: 'to say / to tell',
    group: 'irregular',
    essential: false,
    tip: 'In casual Brazilian speech, "falar" often replaces "dizer" ("Ele falou que vem").',
    examplePt: 'Como se diz isso em português?',
    exampleEn: 'How do you say that in Portuguese?',
    conjugations: {
      presente: { eu: 'digo', voce: 'diz', nos: 'dizemos', voces: 'dizem' },
      passado: { eu: 'disse', voce: 'disse', nos: 'dissemos', voces: 'disseram' },
      imperfeito: { eu: 'dizia', voce: 'dizia', nos: 'dizíamos', voces: 'diziam' },
      futuro: { eu: 'vou dizer', voce: 'vai dizer', nos: 'vamos dizer', voces: 'vão dizer' },
    },
  },
  {
    id: 'ver',
    infinitive: 'ver',
    english: 'to see / to watch',
    group: 'irregular',
    essential: false,
    tip: 'Note the double "ee" in "eles veem" (no circumflex under modern Brazilian spelling).',
    examplePt: 'A gente se vê na sexta-feira!',
    exampleEn: 'See you on Friday!',
    conjugations: {
      presente: { eu: 'vejo', voce: 'vê', nos: 'vemos', voces: 'veem' },
      passado: { eu: 'vi', voce: 'viu', nos: 'vimos', voces: 'viram' },
      imperfeito: { eu: 'via', voce: 'via', nos: 'víamos', voces: 'viam' },
      futuro: { eu: 'vou ver', voce: 'vai ver', nos: 'vamos ver', voces: 'vão ver' },
    },
  },
  {
    id: 'vir',
    infinitive: 'vir',
    english: 'to come',
    group: 'irregular',
    essential: false,
    tip: 'Watch "vem" (he/she comes) vs "vêm" (they come) — same sound, different spelling!',
    examplePt: 'Você vem para a festa no sábado?',
    exampleEn: 'Are you coming to the party on Saturday?',
    conjugations: {
      presente: { eu: 'venho', voce: 'vem', nos: 'vimos', voces: 'vêm' },
      passado: { eu: 'vim', voce: 'veio', nos: 'viemos', voces: 'vieram' },
      imperfeito: { eu: 'vinha', voce: 'vinha', nos: 'vínhamos', voces: 'vinham' },
      futuro: { eu: 'vou vir', voce: 'vai vir', nos: 'vamos vir', voces: 'vão vir' },
    },
  },
  {
    id: 'falar',
    infinitive: 'falar',
    english: 'to speak / to talk',
    group: 'ar',
    essential: true,
    tip: 'Classic regular -AR pattern! Learn -o, -a, -amos, -am and you unlock thousands of Portuguese verbs.',
    examplePt: 'Eu falo inglês e estou aprendendo português.',
    exampleEn: 'I speak English and I am learning Portuguese.',
    conjugations: {
      presente: { eu: 'falo', voce: 'fala', nos: 'falamos', voces: 'falam' },
      passado: { eu: 'falei', voce: 'falou', nos: 'falamos', voces: 'falaram' },
      imperfeito: { eu: 'falava', voce: 'falava', nos: 'falávamos', voces: 'falavam' },
      futuro: { eu: 'vou falar', voce: 'vai falar', nos: 'vamos falar', voces: 'vão falar' },
    },
  },
  {
    id: 'gostar',
    infinitive: 'gostar (de)',
    english: 'to like',
    group: 'ar',
    essential: false,
    tip: 'Always pairs with "de" (or contractions "do / da"): "Eu gosto de café", "Gosto da praia".',
    examplePt: 'Nós gostamos muito de comida baiana.',
    exampleEn: 'We really like Bahian food.',
    conjugations: {
      presente: { eu: 'gosto', voce: 'gosta', nos: 'gostamos', voces: 'gostam' },
      passado: { eu: 'gostei', voce: 'gostou', nos: 'gostamos', voces: 'gostaram' },
      imperfeito: { eu: 'gostava', voce: 'gostava', nos: 'gostávamos', voces: 'gostavam' },
      futuro: { eu: 'vou gostar', voce: 'vai gostar', nos: 'vamos gostar', voces: 'vão gostar' },
    },
  },
  {
    id: 'morar',
    infinitive: 'morar',
    english: 'to live / to reside',
    group: 'ar',
    essential: false,
    tip: 'Use "morar" for where you reside ("Moro em São Paulo"), and "viver" for living life.',
    examplePt: 'Onde você mora agora?',
    exampleEn: 'Where do you live now?',
    conjugations: {
      presente: { eu: 'moro', voce: 'mora', nos: 'moramos', voces: 'moram' },
      passado: { eu: 'morei', voce: 'morou', nos: 'moramos', voces: 'moraram' },
      imperfeito: { eu: 'morava', voce: 'morava', nos: 'morávamos', voces: 'moravam' },
      futuro: { eu: 'vou morar', voce: 'vai morar', nos: 'vamos morar', voces: 'vão morar' },
    },
  },
  {
    id: 'trabalhar',
    infinitive: 'trabalhar',
    english: 'to work',
    group: 'ar',
    essential: false,
    tip: 'Regular -AR verb. Remember "lh" sounds like the "lli" in "million".',
    examplePt: 'A gente trabalha de segunda a sexta.',
    exampleEn: 'We work from Monday to Friday.',
    conjugations: {
      presente: { eu: 'trabalho', voce: 'trabalha', nos: 'trabalhamos', voces: 'trabalham' },
      passado: { eu: 'trabalhei', voce: 'trabalhou', nos: 'trabalhamos', voces: 'trabalharam' },
      imperfeito: { eu: 'trabalhava', voce: 'trabalhava', nos: 'trabalhávamos', voces: 'trabalhavam' },
      futuro: { eu: 'vou trabalhar', voce: 'vai trabalhar', nos: 'vamos trabalhar', voces: 'vão trabalhar' },
    },
  },
  {
    id: 'precisar',
    infinitive: 'precisar (de)',
    english: 'to need',
    group: 'ar',
    essential: false,
    tip: 'Before a noun use "de" ("Preciso de água"); before a verb drop "de" ("Preciso dormir").',
    examplePt: 'Eu preciso praticar um pouco todos os dias.',
    exampleEn: 'I need to practice a little every day.',
    conjugations: {
      presente: { eu: 'preciso', voce: 'precisa', nos: 'precisamos', voces: 'precisam' },
      passado: { eu: 'precisei', voce: 'precisou', nos: 'precisamos', voces: 'precisaram' },
      imperfeito: { eu: 'precisava', voce: 'precisava', nos: 'precisávamos', voces: 'precisavam' },
      futuro: { eu: 'vou precisar', voce: 'vai precisar', nos: 'vamos precisar', voces: 'vão precisar' },
    },
  },
  {
    id: 'comer',
    infinitive: 'comer',
    english: 'to eat',
    group: 'er',
    essential: true,
    tip: 'Classic regular -ER verb pattern: -o, -e, -emos, -em in the present; -i, -eu, -emos, -eram in the past.',
    examplePt: 'Ontem eu comi uma feijoada maravilhosa.',
    exampleEn: 'Yesterday I ate a wonderful feijoada.',
    conjugations: {
      presente: { eu: 'como', voce: 'come', nos: 'comemos', voces: 'comem' },
      passado: { eu: 'comi', voce: 'comeu', nos: 'comemos', voces: 'comeram' },
      imperfeito: { eu: 'comia', voce: 'comia', nos: 'comíamos', voces: 'comiam' },
      futuro: { eu: 'vou comer', voce: 'vai comer', nos: 'vamos comer', voces: 'vão comer' },
    },
  },
  {
    id: 'beber',
    infinitive: 'beber',
    english: 'to drink',
    group: 'er',
    essential: false,
    tip: 'Regular -ER verb! In casual speech, Brazilians also love using "tomar" for drinks ("tomar água / café / cerveja").',
    examplePt: 'Você bebe café com leite ou puro?',
    exampleEn: 'Do you drink coffee with milk or black?',
    conjugations: {
      presente: { eu: 'bebo', voce: 'bebe', nos: 'bebemos', voces: 'bebem' },
      passado: { eu: 'bebi', voce: 'bebeu', nos: 'bebemos', voces: 'beberam' },
      imperfeito: { eu: 'bebia', voce: 'bebia', nos: 'bebíamos', voces: 'bebiam' },
      futuro: { eu: 'vou beber', voce: 'vai beber', nos: 'vamos beber', voces: 'vão beber' },
    },
  },
  {
    id: 'abrir',
    infinitive: 'abrir',
    english: 'to open',
    group: 'ir',
    essential: false,
    tip: 'Classic regular -IR verb pattern: -o, -e, -imos, -em in present; -i, -iu, -imos, -iram in simple past.',
    examplePt: 'A padaria abre às seis da manhã.',
    exampleEn: 'The bakery opens at six in the morning.',
    conjugations: {
      presente: { eu: 'abro', voce: 'abre', nos: 'abrimos', voces: 'abrem' },
      passado: { eu: 'abri', voce: 'abriu', nos: 'abrimos', voces: 'abriram' },
      imperfeito: { eu: 'abria', voce: 'abria', nos: 'abríamos', voces: 'abriam' },
      futuro: { eu: 'vou abrir', voce: 'vai abrir', nos: 'vamos abrir', voces: 'vão abrir' },
    },
  },
];

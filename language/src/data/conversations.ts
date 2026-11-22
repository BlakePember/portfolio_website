export interface DialogueOption {
  pt: string;
  en: string;
  correct: boolean;
  feedback: string;
}

export interface DialogueTurn {
  id: string;
  speaker: 'partner' | 'you';
  speakerName: string;
  pt: string;
  en: string;
  phonetic: string;
  highlight?: {
    phrase: string;
    note: string;
  };
  /** For 'you' turns in Roleplay mode */
  roleplayPrompt?: string;
  options?: DialogueOption[];
}

export interface ConversationScenario {
  id: string;
  titlePt: string;
  titleEn: string;
  city: string;
  level: 'A0' | 'A1' | 'A2';
  description: string;
  partnerName: string;
  partnerRole: string;
  turns: DialogueTurn[];
}

export const CONVERSATIONS: ConversationScenario[] = [
  {
    id: 'padaria',
    titlePt: 'Na Padaria',
    titleEn: 'At the Corner Bakery',
    city: 'São Paulo, SP',
    level: 'A0',
    description: 'Order a classic Brazilian morning combo: cafezinho and warm pão de queijo.',
    partnerName: 'Camila',
    partnerRole: 'Atendente',
    turns: [
      {
        id: 'pad-1',
        speaker: 'partner',
        speakerName: 'Camila',
        pt: 'Bom dia! Tudo bem? O que você gostaria hoje?',
        en: 'Good morning! How are you? What would you like today?',
        phonetic: 'bong JEE-ah! TOO-doo beng? oo kee voh-SEH gohs-tah-REE-ah OH-zhee?',
        highlight: {
          phrase: 'gostaria',
          note: '"Gostaria" (would like) is the polite way to ask or order in Brazil.',
        },
      },
      {
        id: 'pad-2',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Bom dia! Tudo ótimo. Eu quero um cafezinho e dois pães de queijo, por favor.',
        en: 'Good morning! Everything is great. I want a small coffee and two cheese breads, please.',
        phonetic: 'bong JEE-ah! TOO-doo OH-chee-moo. eh-oo KEH-roo oong kah-feh-ZEEN-yoo ee doysh pyngsh jee KAY-zhoo, por fah-VOR.',
        roleplayPrompt: 'Greet Camila back and order a small coffee plus two cheese breads.',
        options: [
          {
            pt: 'Bom dia! Tudo ótimo. Eu quero um cafezinho e dois pães de queijo, por favor.',
            en: 'Good morning! Everything is great. I want a small coffee and two cheese breads, please.',
            correct: true,
            feedback: 'Perfeito! Warm, natural, and using the plural "pães de queijo" like a pro.',
          },
          {
            pt: 'Boa noite! Onde fica o aeroporto?',
            en: 'Good night! Where is the airport?',
            correct: false,
            feedback: 'Wrong time of day and topic — you are ordering breakfast at a padaria!',
          },
          {
            pt: 'Com licença, eu sou cansado dois café.',
            en: 'Excuse me, I am tired two coffee.',
            correct: false,
            feedback: 'Remember: use "quero" or "gostaria de" to order food and drinks.',
          },
        ],
      },
      {
        id: 'pad-3',
        speaker: 'partner',
        speakerName: 'Camila',
        pt: 'Com certeza! O pão de queijo acabou de sair do forno. Vai querer mais alguma coisa?',
        en: 'Certainly! The cheese bread just came out of the oven. Would you like anything else?',
        phonetic: 'kong sehr-TEH-zah! oo powng jee KAY-zhoo ah-kah-BOH jee sah-EER doo FOR-noo. vy keh-REHR mysh aw-GOO-mah KOY-zah?',
        highlight: {
          phrase: 'acabou de sair',
          note: '"Acabar de + verb" means "to have just done something".',
        },
      },
      {
        id: 'pad-4',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Só isso, obrigado! Aceita cartão?',
        en: 'Just that, thank you! Do you accept card?',
        phonetic: 'soh EE-soo, oh-bree-GAH-doo! ah-SAY-tah kar-TOWNG?',
        roleplayPrompt: 'Say "Just that, thank you" and ask if they take card.',
        options: [
          {
            pt: 'Só isso, obrigado! Aceita cartão?',
            en: 'Just that, thank you! Do you accept card?',
            correct: true,
            feedback: 'Spot on! "Só isso" ("Just that") is what every Brazilian says at the counter.',
          },
          {
            pt: 'Sim, eu moro em São Paulo.',
            en: 'Yes, I live in São Paulo.',
            correct: false,
            feedback: 'She asked if you want anything else ("Vai querer mais alguma coisa?").',
          },
          {
            pt: 'Não entendi, até amanhã.',
            en: "I didn't understand, see you tomorrow.",
            correct: false,
            feedback: 'You still need to pay for your pão de queijo!',
          },
        ],
      },
      {
        id: 'pad-5',
        speaker: 'partner',
        speakerName: 'Camila',
        pt: 'Aceitamos sim, débito, crédito ou Pix! Deu quinze reais. Bom apetite!',
        en: 'Yes we do, debit, credit, or Pix! That comes to fifteen reais. Enjoy your meal!',
        phonetic: 'ah-say-TAH-moosh seeng, DEH-bee-too, KREH-jee-too oh peeks! deh-oo KEENG-zee heh-EYESH. bong ah-peh-CHEE-chee!',
        highlight: {
          phrase: 'Deu quinze reais',
          note: '"Deu [price]" (from dar) is how cashiers say "Your total is...".',
        },
      },
    ],
  },
  {
    id: 'rio-meet',
    titlePt: 'Conhecendo um Amigo no Rio',
    titleEn: 'Meeting a Friend in Rio',
    city: 'Rio de Janeiro, RJ',
    level: 'A0',
    description: 'Make a new Brazilian friend at a beachfront kiosk in Ipanema.',
    partnerName: 'Rafael',
    partnerRole: 'Carioca',
    turns: [
      {
        id: 'rio-1',
        speaker: 'partner',
        speakerName: 'Rafael',
        pt: 'E aí! Tudo beleza? Meu nome é Rafael. De onde você é?',
        en: "What's up! All good? My name is Rafael. Where are you from?",
        phonetic: 'ee ah-EE! TOO-doo beh-LEH-zah? meh-oo NOH-mee eh hah-fah-EW. jee ONG-jee voh-SEH eh?',
        highlight: {
          phrase: 'E aí! Tudo beleza?',
          note: 'Classic friendly Rio greeting! "Carioca" means someone from Rio de Janeiro.',
        },
      },
      {
        id: 'rio-2',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Oi, Rafael! Muito prazer. Eu sou dos Estados Unidos e estou aprendendo português.',
        en: 'Hi, Rafael! Very nice to meet you. I am from the United States and I am learning Portuguese.',
        phonetic: 'oy, hah-fah-EW! MOOYNG-too prah-ZEHR. eh-oo soh doosh ees-TAH-doosh oo-NEE-doosh ee ees-TOH ah-preng-DENG-doo por-too-GAYSH.',
        roleplayPrompt: 'Say nice to meet him, where you are from, and that you are learning Portuguese.',
        options: [
          {
            pt: 'Oi, Rafael! Muito prazer. Eu sou dos Estados Unidos e estou aprendendo português.',
            en: 'Hi, Rafael! Very nice to meet you. I am from the United States and I am learning Portuguese.',
            correct: true,
            feedback: 'Mandou bem! Notice "sou dos" (ser + de + os) for nationality/origin.',
          },
          {
            pt: 'Tchau Rafael, estou com fome.',
            en: "Bye Rafael, I'm hungry.",
            correct: false,
            feedback: 'A bit abrupt for just meeting someone! Try introducing yourself with "prazer".',
          },
          {
            pt: 'Eu estou dos Estados Unidos.',
            en: 'I am (temporarily) from the United States.',
            correct: false,
            feedback: 'Origin always uses "ser" (Eu sou de...), never "estar"!',
          },
        ],
      },
      {
        id: 'rio-3',
        speaker: 'partner',
        speakerName: 'Rafael',
        pt: 'Que legal, cara! Você já fala super bem! Está gostando do Rio?',
        en: 'How cool, man! You already speak super well! Are you enjoying Rio?',
        phonetic: 'kee leh-GAW, KAH-rah! voh-SEH zhah FAH-lah SOO-pehr beng! ees-TAH gohs-TANG-doo doo HEE-oo?',
        highlight: {
          phrase: 'Está gostando do Rio?',
          note: 'Brazilian Portuguese uses estar + -ndo (gerund) just like English "-ing".',
        },
      },
      {
        id: 'rio-4',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Nossa, estou amando! A praia aqui é linda e o pessoal é muito gente boa.',
        en: "Whoa, I'm loving it! The beach here is gorgeous and everyone is so kind.",
        phonetic: 'NOH-sah, ees-TOH ah-MANG-doo! ah PRY-ah ah-KEE eh LEENG-dah ee oo peh-soo-AW eh MOOYNG-too ZHENG-chee BOH-ah.',
        roleplayPrompt: 'Tell Rafael you are loving Rio, the beach, and the friendly people.',
        options: [
          {
            pt: 'Nossa, estou amando! A praia aqui é linda e o pessoal é muito gente boa.',
            en: "Whoa, I'm loving it! The beach here is gorgeous and everyone is so kind.",
            correct: true,
            feedback: 'Incrível! Using "pessoal" (folks/everyone) and "gente boa" sounds 100% native.',
          },
          {
            pt: 'A conta, por favor.',
            en: 'The check, please.',
            correct: false,
            feedback: 'That is for a waiter at a restaurant, not answering your new friend!',
          },
          {
            pt: 'Não, eu nunca almoço.',
            en: 'No, I never eat lunch.',
            correct: false,
            feedback: 'He asked if you are enjoying Rio!',
          },
        ],
      },
      {
        id: 'rio-5',
        speaker: 'partner',
        speakerName: 'Rafael',
        pt: 'Que massa! Bora tomar uma água de coco ali no quiosque!',
        en: "Awesome! Let's go grab a coconut water over at the kiosk!",
        phonetic: 'kee MAH-sah! BOH-rah toh-MAR OO-mah AH-gwah jee KOH-koo ah-LEE noo kee-OHS-kee!',
        highlight: {
          phrase: 'Bora tomar',
          note: '"Bora" = "Let\'s go!" and "tomar" is used for grabbing any drink.',
        },
      },
    ],
  },
  {
    id: 'restaurante',
    titlePt: 'No Restaurante',
    titleEn: 'Ordering Lunch',
    city: 'Belo Horizonte, MG',
    level: 'A1',
    description: 'Ask for recommendations, order a classic meal, and ask for the check.',
    partnerName: 'Marcos',
    partnerRole: 'Garçom',
    turns: [
      {
        id: 'rest-1',
        speaker: 'partner',
        speakerName: 'Marcos',
        pt: 'Boa tarde! Bem-vindos. Já sabem o que vão pedir ou querem uma sugestão?',
        en: 'Good afternoon! Welcome. Do you already know what you will order, or would you like a suggestion?',
        phonetic: 'BOH-ah TAR-jee! beng-VEENG-doosh. zhah SAH-beng oo kee vowng peh-JEER oh KEH-reng OO-mah soo-zhesh-TOWNG?',
        highlight: {
          phrase: 'vão pedir',
          note: '"Pedir" means to order food/drinks (or to ask for something).',
        },
      },
      {
        id: 'rest-2',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Boa tarde! Qual é o prato da casa hoje? Quero provar comida típica.',
        en: "Good afternoon! What is today's house special? I want to try traditional food.",
        phonetic: 'BOH-ah TAR-jee! kwaw eh oo PRAH-too dah KAH-zah OH-zhee? KEH-roo proh-VAR koh-MEE-dah CHEE-pee-kah.',
        roleplayPrompt: 'Ask for the house special because you want to try local Brazilian food.',
        options: [
          {
            pt: 'Boa tarde! Qual é o prato da casa hoje? Quero provar comida típica.',
            en: "Good afternoon! What is today's house special? I want to try traditional food.",
            correct: true,
            feedback: 'Excelente! Asking for "o prato da casa" gets you the best dishes in Minas Gerais.',
          },
          {
            pt: 'Boa tarde! Que horas são?',
            en: 'Good afternoon! What time is it?',
            correct: false,
            feedback: 'He is waiting to help you choose from the menu!',
          },
          {
            pt: 'Eu durmo muito cedo.',
            en: 'I sleep very early.',
            correct: false,
            feedback: 'Try asking about the house dish ("prato da casa").',
          },
        ],
      },
      {
        id: 'rest-3',
        speaker: 'partner',
        speakerName: 'Marcos',
        pt: 'Hoje temos feijoada completa e também feijão tropeiro. E para beber?',
        en: 'Today we have the full feijoada and also feijão tropeiro. And to drink?',
        phonetic: 'OH-zhee TEH-moosh fay-zhoo-AH-dah kong-PLEH-tah ee tang-BENG fay-ZHOWNG troh-PAY-roo. ee PAH-rah beh-BEHR?',
      },
      {
        id: 'rest-4',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Eu gostaria da feijoada e de um suco natural de maracujá, por favor.',
        en: 'I would like the feijoada and a fresh passion fruit juice, please.',
        phonetic: 'eh-oo gohs-tah-REE-ah dah fay-zhoo-AH-dah ee jee oong SOO-koo nah-too-RAW jee mah-rah-koo-ZHAH, por fah-VOR.',
        roleplayPrompt: 'Order the feijoada and a fresh passion fruit juice politely.',
        options: [
          {
            pt: 'Eu gostaria da feijoada e de um suco natural de maracujá, por favor.',
            en: 'I would like the feijoada and a fresh passion fruit juice, please.',
            correct: true,
            feedback: 'Perfeito! Notice "gostaria da" (de + a = da) before feminine "feijoada".',
          },
          {
            pt: 'Vira à esquerda na próxima rua.',
            en: 'Turn left on the next street.',
            correct: false,
            feedback: 'Those are street directions, not a lunch order!',
          },
          {
            pt: 'Eu sou uma feijoada.',
            en: 'I am a feijoada.',
            correct: false,
            feedback: 'Careful! "Eu sou" means "I am" — use "Eu quero" or "Eu gostaria de"!',
          },
        ],
      },
      {
        id: 'rest-5',
        speaker: 'partner',
        speakerName: 'Marcos',
        pt: 'Ótima escolha! Já trago o suco bem geladinho.',
        en: "Great choice! I'll bring your ice-cold juice right away.",
        phonetic: 'OH-chee-mah ees-KOH-lyah! zhah TRAH-goo oo SOO-koo beng zheh-lah-JEEN-yoo.',
        highlight: {
          phrase: 'bem geladinho',
          note: '"Bem" before an adjective means "really / very", and "-inho" adds extra warmth!',
        },
      },
    ],
  },
  {
    id: 'direcoes',
    titlePt: 'Pedindo Direções',
    titleEn: 'Asking for Directions',
    city: 'Salvador, BA',
    level: 'A1',
    description: 'Ask a friendly local how to walk to the nearest subway or beach.',
    partnerName: 'Juliana',
    partnerRole: 'Moradora local',
    turns: [
      {
        id: 'dir-1',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Com licença! Você pode me ajudar? Onde fica a praia mais próxima?',
        en: 'Excuse me! Can you help me? Where is the closest beach?',
        phonetic: 'kong lee-SENG-sah! voh-SEH POH-jee mee ah-zhoo-DAR? ONG-jee FEE-kah ah PRY-ah mysh PROH-see-mah?',
        roleplayPrompt: 'Politely get Juliana\'s attention and ask where the nearest beach is.',
        options: [
          {
            pt: 'Com licença! Você pode me ajudar? Onde fica a praia mais próxima?',
            en: 'Excuse me! Can you help me? Where is the closest beach?',
            correct: true,
            feedback: 'Muito bem! "Com licença" + "Onde fica...?" is the golden combo for directions.',
          },
          {
            pt: 'Quanto custa a praia?',
            en: 'How much does the beach cost?',
            correct: false,
            feedback: 'Beaches in Brazil are free! Ask "Onde fica...?" instead.',
          },
          {
            pt: 'Estou com muita saudade da praia.',
            en: 'I miss the beach so much.',
            correct: false,
            feedback: 'Sweet sentiment, but you need directions to get there!',
          },
        ],
      },
      {
        id: 'dir-2',
        speaker: 'partner',
        speakerName: 'Juliana',
        pt: 'Claro! É bem pertinho. Vai reto nesta rua por duas quadras e vira à esquerda.',
        en: 'Of course! It is very close. Go straight on this street for two blocks and turn left.',
        phonetic: 'KLAH-roo! eh beng pehr-CHEEN-yoo. vy HEH-too NEHS-tah HOO-ah por DOO-ahsh KWAH-drahsh ee VEE-rah ah ees-KEHR-dah.',
        highlight: {
          phrase: 'bem pertinho',
          note: '"Pertinho" (diminutive of perto) = "really close by / just around the corner".',
        },
      },
      {
        id: 'dir-3',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Desculpa, pode repetir mais devagar? Duas quadras e depois à esquerda?',
        en: 'Sorry, can you repeat slower? Two blocks and then to the left?',
        phonetic: 'jees-KOO-pah, POH-jee heh-peh-CHEER mysh jee-vah-GAR? DOO-ahsh KWAH-drahsh ee jee-POYSH ah ees-KEHR-dah?',
        roleplayPrompt: 'Ask her to repeat slower and confirm "two blocks and then left".',
        options: [
          {
            pt: 'Desculpa, pode repetir mais devagar? Duas quadras e depois à esquerda?',
            en: 'Sorry, can you repeat slower? Two blocks and then to the left?',
            correct: true,
            feedback: 'Perfeito! Repeating back key directions confirms you understood accurately.',
          },
          {
            pt: 'Sim, eu gosto de pão de queijo.',
            en: 'Yes, I like cheese bread.',
            correct: false,
            feedback: 'Confirm the directions instead!',
          },
          {
            pt: 'Vira à direita no banheiro.',
            en: 'Turn right at the bathroom.',
            correct: false,
            feedback: 'She said two blocks straight and turn left ("à esquerda")!',
          },
        ],
      },
      {
        id: 'dir-4',
        speaker: 'partner',
        speakerName: 'Juliana',
        pt: 'Isso mesmo! Você vai ver o mar logo ali na frente. Bom passeio!',
        en: 'Exactly! You will see the ocean right there ahead. Have a great walk!',
        phonetic: 'EE-soo MEHZ-moo! voh-SEH vy vehr oo mar LOH-goo ah-LEE nah FRENG-chee. bong pah-SAY-oo!',
        highlight: {
          phrase: 'Isso mesmo!',
          note: '"Isso mesmo!" means "Exactly right / That\'s it!"',
        },
      },
    ],
  },
  {
    id: 'mercado',
    titlePt: 'Na Feira de Artesanato',
    titleEn: 'At the Street Market',
    city: 'Florianópolis, SC',
    level: 'A1',
    description: 'Browse souvenirs, ask about prices and sizes, and thank the vendor.',
    partnerName: 'Beatriz',
    partnerRole: 'Vendedora',
    turns: [
      {
        id: 'merc-1',
        speaker: 'partner',
        speakerName: 'Beatriz',
        pt: 'Oi! Fica à vontade para olhar. Se precisar de alguma coisa, é só falar!',
        en: 'Hi! Feel free to look around. If you need anything, just say the word!',
        phonetic: 'oy! FEE-kah ah vong-TAH-jee PAH-rah oh-LYAR. see preh-see-ZAR jee aw-GOO-mah KOY-zah, eh soh fah-LAR!',
        highlight: {
          phrase: 'Fica à vontade',
          note: 'Huge Brazilian phrase: "Make yourself comfortable / Feel free!"',
        },
      },
      {
        id: 'merc-2',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Obrigado! Quanto custa essa camiseta azul? Tem tamanho médio?',
        en: 'Thank you! How much is this blue t-shirt? Do you have medium?',
        phonetic: 'oh-bree-GAH-doo! KWANG-too KOOS-tah EH-sah kah-mee-ZEH-tah ah-ZOO? teng tah-MAH-nyoo MEH-jee-oo?',
        roleplayPrompt: 'Thank Beatriz, ask how much the blue shirt costs, and ask if she has medium.',
        options: [
          {
            pt: 'Obrigado! Quanto custa essa camiseta azul? Tem tamanho médio?',
            en: 'Thank you! How much is this blue t-shirt? Do you have medium?',
            correct: true,
            feedback: 'Ótimo! In Brazil, sizes are P (pequeno), M (médio), G (grande), GG.',
          },
          {
            pt: 'A gente vai viajar amanhã.',
            en: 'We are going to travel tomorrow.',
            correct: false,
            feedback: 'Ask about the price ("Quanto custa?") and size ("Tem tamanho médio?").',
          },
          {
            pt: 'Que horas abre a padaria?',
            en: 'What time does the bakery open?',
            correct: false,
            feedback: 'You are shopping for a t-shirt at a craft market!',
          },
        ],
      },
      {
        id: 'merc-3',
        speaker: 'partner',
        speakerName: 'Beatriz',
        pt: 'Tem sim! Essa custa sessenta reais, mas se levar duas eu faço por cem.',
        en: 'Yes we do! That one costs sixty reais, but if you take two I can do a hundred.',
        phonetic: 'teng seeng! EH-sah KOOS-tah seh-SENG-tah heh-EYESH, mysh see leh-VAR DOO-ahsh eh-oo FAH-soo por seng.',
        highlight: {
          phrase: 'Tem sim!',
          note: 'Repeating the verb + "sim" ("Tem sim!", "Vou sim!") is the warmest way to say yes.',
        },
      },
      {
        id: 'merc-4',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Nossa, que bacana! Vou levar duas então. Muito obrigado!',
        en: "Whoa, how nice! I'll take two then. Thank you very much!",
        phonetic: 'NOH-sah, kee bah-KAH-nah! voh leh-VAR DOO-ahsh eng-TOWNG. MOOYNG-too oh-bree-GAH-doo!',
        roleplayPrompt: 'React enthusiastically and say you will take two.',
        options: [
          {
            pt: 'Nossa, que bacana! Vou levar duas então. Muito obrigado!',
            en: "Whoa, how nice! I'll take two then. Thank you very much!",
            correct: true,
            feedback: 'Show de bola! "Vou levar" means "I\'ll take it" when shopping.',
          },
          {
            pt: 'Desculpa, não sei nadar.',
            en: "Sorry, I don't know how to swim.",
            correct: false,
            feedback: 'That is a totally different conversation!',
          },
          {
            pt: 'Estou com sono.',
            en: 'I am sleepy.',
            correct: false,
            feedback: 'Use "Vou levar..." to buy the shirts!',
          },
        ],
      },
    ],
  },
  {
    id: 'whatsapp',
    titlePt: 'Combinando no WhatsApp',
    titleEn: 'Making Plans with a Friend',
    city: 'Curitiba, PR',
    level: 'A2',
    description: 'Practice real casual Brazilian slang and spoken reductions while planning a hangout.',
    partnerName: 'Thiago',
    partnerRole: 'Amigo',
    turns: [
      {
        id: 'zap-1',
        speaker: 'partner',
        speakerName: 'Thiago',
        pt: 'Fala, cara! Sextou, né? Bora sair pra comer uma pizza hoje à noite?',
        en: "Hey man! It's finally Friday, right? Let's go out for pizza tonight?",
        phonetic: 'FAH-lah, KAH-rah! says-TOH, neh? BOH-rah sah-EER prah koh-MEHR OO-mah PEET-sah OH-zhee ah NOY-chee?',
        highlight: {
          phrase: 'Sextou, né?',
          note: '"Sextou" = "TGIF / Friday vibes!", and "pra" is spoken "para".',
        },
      },
      {
        id: 'zap-2',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Bora! Tô com muita fome já. Que horas a gente se encontra?',
        en: "Let's do it! I'm already super hungry. What time are we meeting?",
        phonetic: 'BOH-rah! toh kong MOOYNG-tah FOH-mee zhah. kee OH-rahsh ah ZHENG-chee see eng-KONG-trah?',
        roleplayPrompt: 'Say you are in, mention you are hungry, and ask what time to meet.',
        options: [
          {
            pt: 'Bora! Tô com muita fome já. Que horas a gente se encontra?',
            en: "Let's do it! I'm already super hungry. What time are we meeting?",
            correct: true,
            feedback: 'Perfeito! "Tô", "Bora", and "a gente se encontra" sound completely authentic.',
          },
          {
            pt: 'Com licença, onde fica o metrô?',
            en: 'Excuse me, where is the subway?',
            correct: false,
            feedback: 'Thiago is inviting you to grab pizza!',
          },
          {
            pt: 'Ontem eu dormi muito bem.',
            en: 'Yesterday I slept very well.',
            correct: false,
            feedback: 'Answer his invitation and ask what time to meet!',
          },
        ],
      },
      {
        id: 'zap-3',
        speaker: 'partner',
        speakerName: 'Thiago',
        pt: 'Pode ser às oito naquela pizzaria perto do parque? Dá pra você?',
        en: 'Does eight o\'clock at that pizzeria near the park work? Can you make it?',
        phonetic: 'POH-jee sehr ahsh OY-too nah-KEH-lah peet-sah-REE-ah PEHR-too doo PAR-kee? dah prah voh-SEH?',
        highlight: {
          phrase: 'Dá pra você?',
          note: '"Dá pra você?" literally "Does it give for you?" = "Does that work for you?"',
        },
      },
      {
        id: 'zap-4',
        speaker: 'you',
        speakerName: 'Você',
        pt: 'Dá sim, tranquilo! Combinado então — até mais tarde, valeu!',
        en: 'Yep, works great, easy! It\'s a plan then — see you later, thanks!',
        phonetic: 'dah seeng, trahng-KWEE-loo! kong-bee-NAH-doo eng-TOWNG — ah-TEH mysh TAR-jee, vah-LEH-oo!',
        roleplayPrompt: 'Confirm that it works, lock in the plan ("Combinado"), and say see you later.',
        options: [
          {
            pt: 'Dá sim, tranquilo! Combinado então — até mais tarde, valeu!',
            en: 'Yep, works great, easy! It\'s a plan then — see you later, thanks!',
            correct: true,
            feedback: 'Arrasou! You just handled a real Brazilian WhatsApp hangout seamlessly.',
          },
          {
            pt: 'Não dá, eu sou americano.',
            en: "Can't make it, I'm American.",
            correct: false,
            feedback: 'Haha, being American doesn\'t stop you from eating Brazilian pizza!',
          },
          {
            pt: 'Bom dia, aceita cartão?',
            en: 'Good morning, do you take card?',
            correct: false,
            feedback: 'Confirm the plan with "Dá sim!" and "Combinado!"',
          },
        ],
      },
    ],
  },
];

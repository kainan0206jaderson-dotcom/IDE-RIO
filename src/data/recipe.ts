/**
 * A Receita do Brandbook — base de conteúdo do IDEÁRIO.
 * Transcrita da receita do projeto: 14 módulos em 4 atos, ficha de partida,
 * arquitetura da apresentação e checklist de saída.
 */

export type ActId = 'A1' | 'A2' | 'A3' | 'A4';
export type ModuleId =
  | 'M01' | 'M02' | 'M03' | 'M04' | 'M05' | 'M06' | 'M07'
  | 'M08' | 'M09' | 'M10' | 'M11' | 'M12' | 'M13' | 'M14';

export interface Act {
  id: ActId;
  n: number;
  name: string;
  question: string;
  modules: ModuleId[];
}

export interface RecipeModule {
  id: ModuleId;
  n: string;
  act: ActId;
  title: string;
  short: string;
  /** o papel do módulo em uma palavra (“ganhar o clique”) */
  role: string;
  objective: string;
  slots: [string, string, string, string];
  goldenRule: string;
  basic: string;
  caseLevel: string;
  seenIn: string[];
  optional?: boolean;
  /** linhas da ficha que alimentam o módulo */
  fedBy: number[];
  /** o módulo pede movimento (GIF ou vídeo) */
  motionHint?: boolean;
}

export const ACTS: Act[] = [
  { id: 'A1', n: 1, name: 'A ideia', question: 'Por que essa marca existe?', modules: ['M01', 'M02', 'M03'] },
  { id: 'A2', n: 2, name: 'O núcleo', question: 'Como ela é construída?', modules: ['M04', 'M05', 'M06', 'M07'] },
  { id: 'A3', n: 3, name: 'O sistema', question: 'Como ela se expande?', modules: ['M08', 'M09', 'M10', 'M11'] },
  { id: 'A4', n: 4, name: 'A prova', question: 'Ela funciona de verdade?', modules: ['M12', 'M13', 'M14'] },
];

export const MODULES: RecipeModule[] = [
  {
    id: 'M01', n: '01', act: 'A1', title: 'Capa', short: 'Capa', role: 'ganhar o clique',
    objective: 'Ganhar o clique na grade de busca. Em miniatura, só uma ideia sobrevive.',
    slots: [
      'Campo chapado da cor-dona: a marca é reconhecida antes de ser lida.',
      'Um único elemento em close: mascote, símbolo ou objeto da marca.',
      'Wordmark pequeno ou ausente. A imagem vende, o nome confirma.',
      'Área do recorte de 808 × 632 px: tudo o que importa cabe nela.',
    ],
    goldenRule: 'Se a capa precisa de legenda para ser entendida a 200 px, ela ainda não é a capa.',
    basic: 'Papelaria em perspectiva sobre uma mesa cinza.',
    caseLevel: 'Uma ideia em close numa cor chapada: a mosca pousada no logo, sobre o vermelho.',
    seenIn: ['OFF BRiEF · mosca sobre o logo no vermelho', 'Jorixent · retrato com luz de recorte', 'Grove · sombra do golfista na grama'],
    fedBy: [1],
  },
  {
    id: 'M02', n: '02', act: 'A1', title: 'Manifesto', short: 'Manifesto', role: 'a tensão',
    objective: 'Dizer numa frase contra o que a marca se posiciona. Todo o resto do manual deriva daqui.',
    slots: [
      'Frase-tensão curta, discutível e com atitude. Até 8 palavras.',
      'Convenção × posição: o que a categoria faz e o que a marca faz diferente.',
      'Anotação à mão: o raciocínio aparece com humor (“wait… WHAT??”).',
      'No máximo 40 palavras no módulo inteiro.',
    ],
    goldenRule: 'Se qualquer concorrente pudesse assinar a frase, ela é um valor genérico, não uma tensão.',
    basic: 'Missão, visão e valores em três parágrafos.',
    caseLevel: '“Stay bad at golf.” Uma afirmação da qual alguém discordaria.',
    seenIn: ['Grove · “stay bad at golf”', 'OFF BRiEF · “fora do briefing” já no nome', 'Jorixent · laranja num setor cinza e azul'],
    fedBy: [1, 2, 3],
  },
  {
    id: 'M03', n: '03', act: 'A1', title: 'Origem do símbolo', short: 'Origem', role: 'o processo',
    objective: 'Mostrar de onde o símbolo veio. O processo visível transforma um logo numa ideia.',
    slots: [
      'Painel de 3 a 4 fotos-conceito: o que inspirou a forma.',
      'Derivação em etapas: referência, forma intermediária, símbolo final.',
      'O esboço real, a lápis no papel, fotografado.',
      'Uma linha de legenda por etapa, sem jargão.',
    ],
    goldenRule: 'Mostre a decisão, não só o resultado. Quem vê o caminho passa a defender a forma.',
    basic: 'O logo final aparece já aplicado, sem história.',
    caseLevel: 'G, boné e sorriso viram um símbolo, com as fotos que originaram cada passo.',
    seenIn: ['Grove · G → boné → sorriso', 'Grove · letreiro a lápis antes do vetor', 'OFF BRiEF · a mosca que pousa no logo'],
    fedBy: [4],
  },
  {
    id: 'M04', n: '04', act: 'A2', title: 'Construção do logo', short: 'Construção', role: 'o rigor',
    objective: 'Provar rigor. A geometria exposta comunica que nada ali é acaso.',
    slots: [
      'Grade de construção sobre o símbolo, em unidades x do próprio desenho.',
      'Alças Bézier e pontos de âncora visíveis.',
      'Cotas com proporções nomeadas (4x, 2x), nunca em milímetros.',
      'Correções ópticas: antes e depois, em tamanho pequeno.',
    ],
    goldenRule: 'A página de construção é conteúdo, não anexo técnico. Desenhe-a para ser bonita.',
    basic: 'Logo centralizado com a área de proteção tracejada.',
    caseLevel: 'Grade densa, cada âncora marcada e cotas em x, como numa planta.',
    seenIn: ['Jorixent · alças Bézier e grade em x', 'Grove · grade 8X × 9X em tela escura', 'Grove · encontros de traço simplificados'],
    fedBy: [4],
  },
  {
    id: 'M05', n: '05', act: 'A2', title: 'Lockups e proteção', short: 'Lockups', role: 'as versões',
    objective: 'Fechar as versões oficiais e o espaço mínimo. O logo vira marca registrada, não um desenho solto.',
    slots: [
      'Lockup principal com ® ou © integrado à composição.',
      'Área de proteção medida em x, uma parte do próprio logo.',
      'Versões: horizontal, vertical e símbolo isolado.',
      'Positivo, negativo, sobre a cor-dona e tamanho mínimo.',
    ],
    goldenRule: 'O ® não é burocracia. Dentro do lockup, ele diz “empresa real” antes de qualquer texto.',
    basic: 'Logo em PNG com margem decidida a olho.',
    caseLevel: 'Proteção em unidades do próprio símbolo e ® desenhado como parte do lockup.',
    seenIn: ['OFF BRiEF · ® no lockup', 'AYLA · ® sobrescrito minúsculo', 'Jorixent · © ao lado do símbolo'],
    fedBy: [],
  },
  {
    id: 'M06', n: '06', act: 'A2', title: 'Tipografia', short: 'Tipografia', role: 'dois registros',
    objective: 'Dar duas vozes visuais à marca e dizer quando cada uma fala.',
    slots: [
      'Registro rígido: grotesca ou condensada para títulos, varejo e sinalização.',
      'Registro solto: serifada de contraste, letreiro à mão ou pincel, para assinatura e emoção.',
      'Escala tipográfica com tamanhos reais, do título à legenda.',
      'Regra de uso: onde cada registro entra e onde nunca entra.',
    ],
    goldenRule: 'Contraste de registro, não de quantidade. Duas famílias com papéis claros valem mais que cinco.',
    basic: 'Uma família, pesos regular e bold, sem regra de uso.',
    caseLevel: 'Didone elegante no logo e condensada gritando o preço, cada uma no seu lugar.',
    seenIn: ['AYLA · didone × grotesca condensada', 'OFF BRiEF · condensada × nanquim', 'Grove · script a lápis + pincel cru'],
    fedBy: [5],
  },
  {
    id: 'M07', n: '07', act: 'A2', title: 'Cor', short: 'Cor', role: 'a cor-dona',
    objective: 'Tornar a marca reconhecível sem o logo: uma cor que a categoria não usa, aplicada em blocos.',
    slots: [
      'Cor-dona incomum na categoria, ocupando a maior parte das superfícies.',
      'Paleta curta e numerada (01 a 04), com Pantone, HEX, CMYK e RGB.',
      'Proporção de uso declarada. Sem ela, a cor-dona vira detalhe.',
      'A cor fotografada no objeto e no leque Pantone físico.',
    ],
    goldenRule: 'Sem degradê e sem paleta de 12 cores. A marca é reconhecida pelo bloco de cor, não pela variedade.',
    basic: 'Paleta “segura” de oito cores, com degradê.',
    caseLevel: 'Laranja em móveis, oliva no golfe. E a cor na etiqueta, no boné, na sacola.',
    seenIn: ['Jorixent · cartões 01–04 recortados pelo símbolo', 'Grove · Pantone 574C no leque físico', 'AYLA · etiqueta laranja na cadeira'],
    fedBy: [6],
  },
  {
    id: 'M08', n: '08', act: 'A3', title: 'Sistema gráfico', short: 'Sistema', role: 'o gerador',
    objective: 'Entregar um kit que gera peças sem depender do logo. É o maior divisor entre manual básico e case.',
    slots: [
      'Um gerador nascido do conceito: padrão, silhueta, personagem ou forma do símbolo.',
      'Regras de composição: escala, corte na borda, densidade.',
      'Biblioteca nomeada: cada peça com nome e uso.',
      'Prova de geração: três peças diferentes feitas só com o kit.',
    ],
    goldenRule: 'Se a peça só parece “da marca” quando o logo entra, o sistema ainda não existe.',
    basic: 'Logo, cor e fonte. E nada mais.',
    caseLevel: 'As silhuetas dos produtos da loja viram padrão, cartaz e embalagem.',
    seenIn: ['AYLA · silhuetas dos produtos', 'OFF BRiEF · personagens à mão + mascote', 'Jorixent · quarto de elipse como máscara', 'Grove · padrão de bolinhas com sombra'],
    fedBy: [7],
    motionHint: true,
  },
  {
    id: 'M09', n: '09', act: 'A3', title: 'Voz verbal', short: 'Voz', role: 'o texto',
    objective: 'Desenhar o texto da marca com o mesmo cuidado do logo. É a frase que o público vai repetir.',
    slots: [
      'Slogan curto com atitude, que vira título, estampa e assinatura.',
      'Banco de frases reais por ponto de contato.',
      'Tom de voz em pares “é / não é”, sem adjetivo vago.',
      'Copy real em todo mockup. Lorem ipsum é proibido.',
    ],
    goldenRule: 'Texto real faz o mockup parecer verdadeiro e entrega ao espectador uma frase para lembrar.',
    basic: 'Lorem ipsum nas peças e “moderna, confiável, inovadora” no tom.',
    caseLevel: '“Soft opening, hard vibes” escrito na peça da inauguração.',
    seenIn: ['OFF BRiEF · “Society is only as good as its coffee”', 'Grove · “Stay Wayward”', 'AYLA · “Sua casa, seu estilo.” + % OFF'],
    fedBy: [3, 8],
  },
  {
    id: 'M10', n: '10', act: 'A3', title: 'Fotografia', short: 'Fotografia', role: 'o olhar',
    objective: 'Definir o olhar da marca: como se fotografa gente, produto e lugar.',
    slots: [
      'Uma foto-manifesto que resume o clima da marca.',
      'Gente real em pose imperfeita: riso, movimento, erro.',
      'Tratamento declarado: grão, flash, luz de recorte, paleta da foto.',
      'Pares “sim / não” para orientar qualquer fotógrafo.',
    ],
    goldenRule: 'A foto precisa carregar a cor-dona ou a tensão da marca. Sem isso, é banco de imagem.',
    basic: 'Banco de imagem genérico, limpo e sorridente.',
    caseLevel: 'Filme granulado anos 70, gente rindo, boné rosa no campo.',
    seenIn: ['Grove · grão de filme anos 70', 'Jorixent · retrato com luz de recorte', 'OFF BRiEF · flash direto na inauguração'],
    fedBy: [],
  },
  {
    id: 'M11', n: '11', act: 'A3', title: 'Motion', short: 'Motion', role: 'o acelerador',
    objective: 'Segurar quem está rolando a página. Acelera o resultado, mas não substitui ideia e sistema.',
    slots: [
      'Logo animado curto, em loop de 3 a 6 segundos.',
      'Storyboard em quatro quadros: entrada, transformação, assinatura, loop.',
      'O sistema gráfico em movimento: mascote voando, padrão rolando.',
      'Exportação em 4:5: o mesmo arquivo serve ao Behance e ao Instagram.',
    ],
    goldenRule: 'Um movimento a cada três ou quatro módulos segura o scroll. Mais que isso cansa.',
    basic: 'Nenhum movimento, ou uma transição genérica de template.',
    caseLevel: 'A mosca voando sobre o logo e os personagens animados em GIF.',
    seenIn: ['OFF BRiEF · 6 vídeos e ~10 GIFs', 'AYLA · capa animada + 4 vídeos', 'Jorixent e Grove · estáticos e acima da média'],
    optional: true,
    fedBy: [],
    motionHint: true,
  },
  {
    id: 'M12', n: '12', act: 'A4', title: 'Aplicações', short: 'Aplicações', role: 'a escala',
    objective: 'Mostrar que o sistema aguenta qualquer escala e qualquer material, do menor ao maior.',
    slots: [
      'Crescendo de escala: pin, cartão, embalagem, cartaz, fachada.',
      'Escalas extremas: logo minúsculo no pin, gigante e cortado na sacola.',
      'A mesma peça em várias cores, prova de que o sistema aguenta variação.',
      'Materiais com textura: veludo, bordado, esmalte, kraft, letreiro com luz.',
    ],
    goldenRule: 'Cada aplicação carrega conteúdo do mundo do cliente, nunca o texto padrão do mockup.',
    basic: 'Vinte mockups iguais de papelaria.',
    caseLevel: 'Capas de taco em cinco cores, pin esmaltado e placa com luz por trás.',
    seenIn: ['Grove · capas de taco em 5 cores', 'Jorixent · estande, metrô, outdoor', 'OFF BRiEF · sacola vermelha + collab adidas'],
    fedBy: [],
  },
  {
    id: 'M13', n: '13', act: 'A4', title: 'Prova de mundo real', short: 'Mundo real', role: 'a prova',
    objective: 'Mostrar que a marca funciona, não só que funcionaria. Para negócio local, vale mais que qualquer mockup.',
    slots: [
      'A marca no lugar real: fachada, loja aberta, evento.',
      'Gente usando: xícara na mão, sacola na rua, boné no campo.',
      'Detalhe flagrado: etiqueta na perna da cadeira, adesivo na vitrine.',
      'Crédito do fotógrafo, sinal de produção real.',
    ],
    goldenRule: 'Mockup mostra que a marca funcionaria. Foto própria mostra que ela funciona. Sempre que existir, use a foto.',
    basic: 'Cem por cento mockup de banco.',
    caseLevel: 'Cartazes no chão da loja, etiquetas nos móveis, fachada com letras em relevo.',
    seenIn: ['AYLA · loja real em Sinop, 15% curtidas/views', 'OFF BRiEF · inauguração e DJ set', 'Jorixent · sem foto real, compensa no rigor'],
    fedBy: [9],
  },
  {
    id: 'M14', n: '14', act: 'A4', title: 'Fechamento', short: 'Fechamento', role: 'a conversa',
    objective: 'Fechar o case como portfólio de negócio: quem fez, com quem falar e o que contratar.',
    slots: [
      'Créditos completos por função: design, motion, foto, cliente.',
      'Chamada para contato com e-mail direto.',
      'Serviços com preço “a partir de”, que filtra o lead certo.',
      'Logo final em respiro: o último quadro é a assinatura.',
    ],
    goldenRule: 'O case termina em conversa. Quem chega ao fim é o lead mais quente.',
    basic: 'Termina na última foto de mockup.',
    caseLevel: '“Let’s work together”, e-mail e identidade a partir de US$ 7 mil.',
    seenIn: ['Jorixent · CTA + preço no perfil', 'AYLA · créditos por função', 'Grove · serviços a partir de US$ 4,4 mil'],
    fedBy: [10],
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, RecipeModule>;

export interface FichaLine {
  n: number;
  key: string;
  title: string;
  question: string;
  example: string;
  feeds: ModuleId[];
}

export const FICHA: FichaLine[] = [
  { n: 1, key: 'marca', title: 'Marca e categoria', question: 'Quem é a marca e em que prateleira ela compete?', example: 'AYLA, loja de móveis com dois anos de vida em Sinop-MT.', feeds: ['M01', 'M02'] },
  { n: 2, key: 'convencao', title: 'Convenção da categoria', question: 'O que todo concorrente faz igual: cor, tom, imagem?', example: 'Visualização 3D é cinza, azul e render frio.', feeds: ['M02'] },
  { n: 3, key: 'tensao', title: 'Frase-tensão', question: '“A categoria ___. Nós ___.”', example: 'O golfe cobra precisão. Nós defendemos jogar mal e voltar no domingo.', feeds: ['M02', 'M09'] },
  { n: 4, key: 'origem', title: 'Origem do símbolo', question: 'De qual objeto, gesto ou história a forma nasce?', example: 'A inicial G, um boné e um sorriso confiante.', feeds: ['M03', 'M04'] },
  { n: 5, key: 'registros', title: 'Dois registros', question: 'Qual é a voz rígida e qual é a voz solta?', example: 'Didone elegante no logo, condensada gritando o preço.', feeds: ['M06'] },
  { n: 6, key: 'cordona', title: 'Cor-dona', question: 'Que cor ninguém na categoria usa, e em qual objeto ela vai morar?', example: 'Oliva Pantone 574C no boné de veludo cotelê.', feeds: ['M07'] },
  { n: 7, key: 'gerador', title: 'Gerador do sistema', question: 'O que produz peças novas sem precisar do logo?', example: 'As silhuetas dos produtos da própria loja.', feeds: ['M08'] },
  { n: 8, key: 'slogan', title: 'Slogan e frases', question: 'Qual frase o público vai repetir?', example: '“Soft opening, hard vibes.”', feeds: ['M09'] },
  { n: 9, key: 'mundoreal', title: 'Prova de mundo real', question: 'Onde e quando vamos fotografar a marca funcionando?', example: 'Inauguração, loja aberta, produto na mão do cliente.', feeds: ['M13'] },
  { n: 10, key: 'fechamento', title: 'Fechamento', question: 'Quem assina, com quem falar e a partir de quanto?', example: 'Créditos por função, e-mail direto e preço “a partir de”.', feeds: ['M14'] },
];

export interface ChecklistItem {
  t: string;
  m: ModuleId | 'ARQ';
}

export const CHECKLIST: ChecklistItem[] = [
  { t: 'A frase-tensão cabe numa linha, e alguém discordaria dela.', m: 'M02' },
  { t: 'A capa funciona a 200 px: uma ideia, um elemento, uma cor.', m: 'M01' },
  { t: 'O caminho do símbolo aparece: referências, esboço, forma final.', m: 'M03' },
  { t: 'A construção mostra grade, âncoras e cotas em unidades x.', m: 'M04' },
  { t: 'Há dois registros tipográficos, com regra de quando usar cada um.', m: 'M06' },
  { t: 'A cor-dona é incomum na categoria e aparece no objeto físico.', m: 'M07' },
  { t: 'Existe um segundo elemento que gera peças sem o logo.', m: 'M08' },
  { t: 'Todo texto nas peças é real. Nenhum lorem ipsum.', m: 'M09' },
  { t: 'Há pelo menos uma foto própria da marca funcionando no mundo.', m: 'M13' },
  { t: 'As aplicações crescem do pequeno ao grande, com material de verdade.', m: 'M12' },
  { t: 'Proporção única e ritmo alternado: cheio, par, faixa.', m: 'ARQ' },
  { t: 'O case fecha com créditos, contato e chamada para conversa.', m: 'M14' },
];

export function verdictFor(score: number) {
  if (score >= 10) return { label: 'Nível case', hint: 'Tensão, sistema e prova estão juntos. Pode publicar.' };
  if (score >= 7) return { label: 'Acima da média', hint: 'Falta pouco. Resolva os módulos marcados abaixo antes de publicar.' };
  return { label: 'Manual básico', hint: 'Ainda é um manual de uso. Volte à ficha e ao sistema gráfico.' };
}

export const ARCH_RULES = [
  { n: '01', t: 'Uma proporção só', d: 'Escolha 4:5 e não misture. Cada módulo já vira post sem recorte.' },
  { n: '02', t: 'Alterne cheio e par', d: 'Nunca três módulos iguais seguidos. O par dá respiro, o cheio dá impacto.' },
  { n: '03', t: 'Faixa entre atos', d: 'Uma banda preta ou na cor-dona marca a troca de capítulo, como tira de filme.' },
  { n: '04', t: 'Zero texto longo', d: 'Até 40 palavras por módulo. Especificação técnica vira página desenhada, não tabela.' },
  { n: '05', t: 'Capa legível a 200 px', d: 'Uma ideia, um elemento, uma cor. Reduza a tela e teste antes de publicar.' },
  { n: '06', t: 'Crescendo físico', d: 'Do pequeno ao grande: pin, cartão, embalagem, cartaz, fachada.' },
  { n: '07', t: 'Movimento com dose', d: 'Um GIF ou vídeo a cada 3 ou 4 módulos segura quem rola sem cansar.' },
  { n: '08', t: 'Final com conversa', d: 'Créditos, contato e preço “a partir de”. Quem chega ao fim é o lead mais quente.' },
];

export const MEASURES = {
  moduleWidth: 1400,
  moduleHeight: 1750,
  behanceCover: { w: 808, h: 632 },
  maxWords: 40,
  maxTensionWords: 8,
};

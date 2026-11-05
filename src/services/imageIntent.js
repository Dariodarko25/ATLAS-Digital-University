// ATLAS image-generation intent detection (pure, dependency-free).
//
// Decides whether a classroom message asks Professor Atlas to CREATE an image
// (muse-image-1.0) instead of discussing one (Muse Spark). Covers English and
// Portuguese. Messages carrying an attached image always take the
// understanding path, never generation.

const STRONG_VERBS = [
  // Unambiguously mean "produce a picture", even without an image noun
  // ("Draw a futuristic laboratory").
  'generate',
  'draw',
  'paint',
  'sketch',
  'render',
  'illustrate',
  'gera',
  'gerar',
  'gere',
  'desenha',
  'desenhar',
  'desenhe',
  'pinta',
  'pintar',
  'pinte',
  'esboça',
  'esboca',
  'esboçar',
  'ilustra',
  'ilustrar',
]

const WEAK_VERBS = [
  // Need an image noun beside them ("create a diagram", "show me a photo").
  // Weak verbs can ONLY trigger alongside an image noun, so extending this
  // list can never misroute a text request ("I want a summary" stays text).
  'create',
  'make',
  'design',
  'produce',
  'show',
  'give',
  'need',
  'want',
  'get',
  'cria',
  'criar',
  'crie',
  'faz',
  'fazer',
  'faça',
  'faca',
  'mostra',
  'mostrar',
  'mostre',
  'monta',
  'montar',
  'produz',
  'produzir',
  'preciso',
  'precisar',
  'quero',
  'querer',
  'gostaria',
  'gostava',
]

const IMAGE_NOUNS = [
  'image',
  'picture',
  'diagram',
  'illustration',
  'photo',
  'photograph',
  'drawing',
  'painting',
  'sketch',
  'render',
  'visual',
  'poster',
  'logo',
  'map',
  'chart',
  'imagem',
  'imagens',
  'foto',
  'fotografia',
  'desenho',
  'diagrama',
  'ilustração',
  'ilustracao',
  'esquema',
  'pintura',
  'retrato',
  'mapa',
  'gráfico',
  'grafico',
  'cartaz',
]

const ABSTRACT_NOUNS = [
  // Abstract senses that must NOT trigger generation ("draw a conclusion").
  'conclusion',
  'conclusions',
  'comparison',
  'distinction',
  'parallel',
  'parallels',
  'conclusão',
  'conclusao',
  'conclusões',
  'conclusoes',
  'comparação',
  'comparacao',
]

const TEXT_OBJECTS = [
  // Generation verbs with these objects ask for TEXT, not pictures
  // ("Generate a summary", "Gera um exemplo"). Ambiguity resolves to Spark:
  // a degraded text answer beats a failed image call.
  'summary',
  'summaries',
  'example',
  'examples',
  'exercise',
  'exercises',
  'question',
  'questions',
  'quiz',
  'answer',
  'answers',
  'explanation',
  'explanations',
  'list',
  'lists',
  'plan',
  'plans',
  'text',
  'texts',
  'essay',
  'essays',
  'paragraph',
  'code',
  'snippet',
  'formula',
  'formulas',
  'definition',
  'definitions',
  'theorem',
  'proof',
  'steps',
  'lesson',
  'notes',
  'outline',
  'table',
  'tables',
  'story',
  'poem',
  'email',
  'letter',
  'resumo',
  'resumos',
  'exemplo',
  'exemplos',
  'exercício',
  'exercicio',
  'exercícios',
  'exercicios',
  'questão',
  'questao',
  'questões',
  'questoes',
  'pergunta',
  'perguntas',
  'resposta',
  'respostas',
  'explicação',
  'explicacao',
  'explicações',
  'lista',
  'listas',
  'plano',
  'planos',
  'texto',
  'textos',
  'código',
  'codigo',
  'definição',
  'definicao',
  'teorema',
  'prova',
  'passos',
  'aula',
  'notas',
  'tabela',
  'tabelas',
  'frase',
  'redação',
  'redacao',
  'história',
  'historia',
  'carta',
  'poema',
  'parágrafo',
  'paragrafo',
]

const QUESTION_OPENERS = [
  'what',
  'which',
  'how',
  'why',
  'when',
  'where',
  'who',
  'que',
  'qual',
  'quais',
  'como',
  'porque',
  'porquê',
  'quando',
  'onde',
  'quem',
]

function words(text) {
  return String(text)
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/i)
    .filter(Boolean)
}

/**
 * Explicit request classification: the single decision point the chat UI
 * (loading label) and the AI layer (function routing) both use, so the label
 * and the route can never disagree.
 * @param {string} message - learner's message
 * @param {{hasImage?: boolean}} [opts] - attached-image turns never generate
 * @returns {'image'|'chat'} the pipeline the message must enter
 */
export function classifyAtlasRequest(message, opts) {
  return detectImageIntent(message, opts) ? 'image' : 'chat'
}

/**
 * @param {string} message - learner's message
 * @param {{hasImage?: boolean}} [opts] - attached-image turns never generate
 * @returns {boolean} true when the message asks Atlas to create an image
 */
export function detectImageIntent(message, { hasImage = false } = {}) {
  if (hasImage) return false
  const text = String(message ?? '').trim()
  if (!text) return false
  const tokens = words(text)
  if (tokens.length === 0) return false
  if (tokens.some((t) => ABSTRACT_NOUNS.includes(t))) return false
  const hasVerb = tokens.some((t) => STRONG_VERBS.includes(t) || WEAK_VERBS.includes(t))
  const hasNoun = tokens.some((t) => IMAGE_NOUNS.includes(t))
  // An explicit picture request always wins ("show me a diagram of X").
  if (hasVerb && hasNoun) return true
  // A text object resolves ambiguity to Spark ("Generate a summary").
  if (tokens.some((t) => TEXT_OBJECTS.includes(t))) return false
  // A strong visual verb means generation, unless the student is asking about
  // a drawing ("What did you draw?") rather than requesting one.
  if (tokens.some((t) => STRONG_VERBS.includes(t))) {
    const isQuestion = text.includes('?') || QUESTION_OPENERS.includes(tokens[0])
    return !isQuestion
  }
  return false
}

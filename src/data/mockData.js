// Central mock dataset for ATLAS.
// Real API-backed data stores will replace these exports later.

export const user = {
  id: 'learner-001',
  name: 'Alex Explorer',
  handle: '@alex_explores',
  level: 7,
  xp: 3420,
  xpToNextLevel: 4000,
  streakDays: 12,
  avatarColor: '#2e7bff',
  joinedAt: '2026-06-14',
  interests: ['Physics', 'Creative Coding', 'Robotics'],
}

export const categories = [
  'Science',
  'Technology',
  'Engineering',
  'Mathematics',
  'Arts & Humanities',
]

export const courses = [
  {
    id: 'sci-gravity',
    title: 'Gravity: From Apples to Orbits',
    category: 'Science',
    difficulty: 'Beginner',
    duration: '4 weeks',
    lessons: 16,
    rating: 4.9,
    teacherId: 'orion',
    description:
      'Follow Orion from falling apples to universal gravitation, then plot real satellite orbits with interactive simulations.',
  },
  {
    id: 'sci-cells',
    title: 'The Living Cell',
    category: 'Science',
    difficulty: 'Intermediate',
    duration: '6 weeks',
    lessons: 24,
    rating: 4.7,
    teacherId: 'orion',
    description:
      'Tour organelles, osmosis, and photosynthesis through guided lab visualizations and hands-on microscope challenges.',
  },
  {
    id: 'tech-algorithms',
    title: 'Algorithms with Lyra',
    category: 'Technology',
    difficulty: 'Beginner',
    duration: '5 weeks',
    lessons: 20,
    rating: 5.0,
    teacherId: 'lyra',
    description:
      'Learn sorting, searching, and recursion the way Lyra teaches them — as patterns waiting to be woven into code.',
  },
  {
    id: 'tech-neural',
    title: 'Neural Networks from Zero',
    category: 'Technology',
    difficulty: 'Advanced',
    duration: '8 weeks',
    lessons: 32,
    rating: 4.8,
    teacherId: 'lyra',
    description:
      'Build perceptrons, backprop, and tiny transformers by hand. No frameworks until you can derive every gradient.',
  },
  {
    id: 'eng-bridges',
    title: 'Bridges That Hold',
    category: 'Engineering',
    difficulty: 'Intermediate',
    duration: '6 weeks',
    lessons: 22,
    rating: 4.8,
    teacherId: 'atlas',
    description:
      'Study trusses, arches, and suspension with Atlas, then stress-test your own designs to failure.',
  },
  {
    id: 'eng-robots',
    title: 'Robotics: Sense, Think, Act',
    category: 'Engineering',
    difficulty: 'Advanced',
    duration: '10 weeks',
    lessons: 36,
    rating: 4.9,
    teacherId: 'atlas',
    description:
      'Wire sensors, plan motion, and program autonomous behaviors on a virtual rover across three field missions.',
  },
  {
    id: 'math-calculus',
    title: 'Calculus of Motion',
    category: 'Mathematics',
    difficulty: 'Intermediate',
    duration: '7 weeks',
    lessons: 28,
    rating: 4.9,
    teacherId: 'atlas',
    description:
      'Derivatives and integrals as the mathematics of things that move and change, with Atlas as your guide.',
  },
  {
    id: 'math-number',
    title: 'Number Theory Playbook',
    category: 'Mathematics',
    difficulty: 'Advanced',
    duration: '6 weeks',
    lessons: 24,
    rating: 4.6,
    teacherId: 'lyra',
    description:
      'Primes, modular arithmetic, and the ciphers that guard the modern world — with proofs you can actually read.',
  },
  {
    id: 'arts-renaissance',
    title: 'Renaissance: Art Meets Science',
    category: 'Arts & Humanities',
    difficulty: 'Beginner',
    duration: '4 weeks',
    lessons: 14,
    rating: 4.9,
    teacherId: 'atlas',
    description:
      'Perspective, anatomy, and light — how observation and geometry fused to reinvent painting.',
  },
  {
    id: 'arts-philosophy',
    title: 'Philosophy of Discovery',
    category: 'Arts & Humanities',
    difficulty: 'Intermediate',
    duration: '5 weeks',
    lessons: 18,
    rating: 4.7,
    teacherId: 'orion',
    description:
      'What does it mean to know something? From natural philosophy to falsifiability, debate the giants.',
  },
]

export const teachers = [
  {
    id: 'orion',
    name: 'Orion',
    shortName: 'Orion',
    field: 'Physics & Science',
    tagline: 'Discover the secrets of the universe!',
    avatar: '/images/orion.jpg',
    accent: '#2e7bff',
    glow: 'rgba(46, 123, 255, 0.55)',
    greeting:
      'Welcome to my lab. I am Orion — bring me your curiosity about the physical world, and we will observe, measure, and derive together.',
    persona:
      'Patient, precise, and quietly playful. Grounds every idea in observation and first principles, then dares you to test it.',
    subjects: ['Physics', 'Science'],
    objectives: [
      'Reason from first principles',
      'Model motion and matter with mathematics',
      'Test ideas against observation',
    ],
    questions: [
      'Why does an apple fall but the Moon stays up?',
      'What is energy, really?',
      'How do circuits and current actually work?',
    ],
    explanation:
      'Orion teaches by derivation: state what you observe, model it with mathematics, then test the prediction in the lab.',
    exercise:
      'Drop two different objects from the same height. Predict which lands first — then explain why.',
  },
  {
    id: 'lyra',
    name: 'Lyra',
    shortName: 'Lyra',
    field: 'Technology & Programming',
    tagline: 'Code a better world!',
    avatar: '/images/lyra.jpg',
    accent: '#a78bfa',
    glow: 'rgba(167, 139, 250, 0.55)',
    greeting:
      'Hello, builder! I am Lyra — every program is a pattern waiting to be woven. Tell me what you want to create.',
    persona:
      'Energetic, encouraging, and endlessly creative. Turns abstract logic into things you can build, run, and show off.',
    subjects: ['Technology', 'Programming'],
    objectives: [
      'Think in algorithms and patterns',
      'Write clean, working code',
      'Connect logic to imagination',
    ],
    questions: [
      'How does a loop actually work?',
      'What is recursion in plain words?',
      'How do I start programming from zero?',
    ],
    explanation:
      'Lyra teaches by building: name the pattern first, write the smallest code that captures it, then grow it into something real.',
    exercise:
      'Describe the steps to sort a hand of cards without using the word “sort”. That is your first algorithm.',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    shortName: 'Atlas',
    field: 'Engineering & Mathematics',
    tagline: 'Build the future with brilliant ideas!',
    avatar: '/images/atlas.jpg',
    accent: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.5)',
    greeting:
      'Welcome, engineer. I am Atlas — bring me a problem and we will design it, calculate it, and build it together.',
    persona:
      'Calm, methodical mentor with a builder’s heart. Believes every failure is a prototype and every prototype teaches.',
    subjects: ['Engineering', 'Mathematics'],
    objectives: [
      'Break big problems into solvable parts',
      'Design, calculate, then build',
      'Learn from every failed prototype',
    ],
    questions: [
      'How do bridges hold so much weight?',
      'What is a derivative, intuitively?',
      'How do I think like an engineer?',
    ],
    explanation:
      'Atlas teaches by construction: sketch the system, do the math that holds it up, then build and test without fear.',
    exercise:
      'Design a paper bridge that spans 30 cm and holds a book. Build it, test it, improve it — three rounds minimum.',
  },
]

export const challenges = [
  {
    id: 'ch-orbit',
    title: 'Plot a Stable Orbit',
    courseId: 'sci-gravity',
    difficulty: 'Intermediate',
    xpReward: 250,
    description:
      'Tune velocity and altitude until your satellite completes three full orbits without correction burns.',
  },
  {
    id: 'ch-sort',
    title: 'Sort 10,000 Numbers by Hand (Almost)',
    courseId: 'tech-algorithms',
    difficulty: 'Beginner',
    xpReward: 120,
    description:
      'Pick the right algorithm for the data and beat the clock. Compare your swaps against Lyra’s reference.',
  },
  {
    id: 'ch-bridge',
    title: 'Hold the 500kg Load',
    courseId: 'eng-bridges',
    difficulty: 'Advanced',
    xpReward: 400,
    description:
      'Design a truss bridge under budget that survives the load test and the wind trial.',
  },
  {
    id: 'ch-cipher',
    title: 'Break the Caesar Shift',
    courseId: 'math-number',
    difficulty: 'Beginner',
    xpReward: 100,
    description:
      'Use frequency analysis to crack an intercepted message and recover the lost key.',
  },
]

export const milestones = [
  {
    id: 'ms-start',
    title: 'First Steps',
    description: 'Completed onboarding and chose a learning path.',
    xpRequired: 0,
    completed: true,
  },
  {
    id: 'ms-apprentice',
    title: 'Apprentice Scholar',
    description: 'Finished a first course module with any teacher.',
    xpRequired: 500,
    completed: true,
  },
  {
    id: 'ms-discoverer',
    title: 'Discoverer',
    description: 'Completed courses with two different teachers.',
    xpRequired: 1500,
    completed: true,
  },
  {
    id: 'ms-inventor',
    title: 'Inventor',
    description: 'Solved five lab challenges across two disciplines.',
    xpRequired: 3000,
    completed: true,
  },
  {
    id: 'ms-polymath',
    title: 'Polymath',
    description: 'Completed one course in every category.',
    xpRequired: 5000,
    completed: false,
  },
  {
    id: 'ms-luminary',
    title: 'Luminary',
    description: 'Mentored a peer session and published a capstone.',
    xpRequired: 8000,
    completed: false,
  },
]

export const achievements = [
  {
    id: 'ach-streak-7',
    title: 'Week of Fire',
    description: 'Studied 7 days in a row.',
    icon: 'flame',
    unlockedAt: '2026-10-20',
  },
  {
    id: 'ach-first-proof',
    title: 'Q.E.D.',
    description: 'Completed a first rigorous proof with Orion.',
    icon: 'scroll',
    unlockedAt: '2026-09-02',
  },
  {
    id: 'ach-night-owl',
    title: 'Night Owl',
    description: 'Finished a lab session after midnight.',
    icon: 'moon',
    unlockedAt: null,
  },
  {
    id: 'ach-polymath',
    title: 'Renaissance Mind',
    description: 'Studied all five categories in one week.',
    icon: 'sparkles',
    unlockedAt: null,
  },
]

export const dailyTips = [
  {
    text: '“Science is not only about discoveries — it is about never stopping asking questions.”',
    author: 'ATLAS',
  },
  {
    text: '“A prototype that fails still teaches. Build, test, and build again.”',
    author: 'Atlas',
  },
  {
    text: '“Name the pattern before you write the code, and the code will write itself.”',
    author: 'Lyra',
  },
  {
    text: '“Measure twice, derive once — then test it in the lab.”',
    author: 'Orion',
  },
]

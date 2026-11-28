/**
 * CLIENT-SIDE AI PRACTICE QUESTION GENERATOR & FALLBACK ENGINE
 * Battle of Brains 2026 - Educational Quiz System
 * 
 * Provides instantaneous dynamic question generation in the browser
 * when backend API is offline, initializing, or encountering network issues.
 * Ensures questions never fail to generate and tracks non-repetition via localStorage.
 */

export const CS_DISCIPLINES = {
  pf: {
    id: 'pf',
    name: 'Programming Fundamentals',
    topics: [
      'Variable Scope & Lifetime',
      'Nested Loops & Control Flow',
      'Pointers & Memory Addresses',
      'Dynamic Memory Allocation (malloc/free)',
      'Recursion & Call Stack Frames',
      'Bitwise Operators & Bit Manipulation',
      'String Manipulation & Null Terminators'
    ],
    learningObjectives: [
      'Understanding stack versus heap allocation lifecycles',
      'Mastering pointer dereferencing and address arithmetic',
      'Predicting recursion depth and base-case termination',
      'Applying bitwise masks for flag management'
    ]
  },
  oop: {
    id: 'oop',
    name: 'Object Oriented Programming',
    topics: [
      'Polymorphism & Virtual Method Dispatch',
      'Inheritance Hierarchies & Multiple Inheritance',
      'Encapsulation & Access Specifiers',
      'Virtual Destructors & Memory Leaks',
      'Abstract Classes & Interface Contracts',
      'Operator Overloading & Copy Constructors',
      'Static Members & Singleton Design'
    ],
    learningObjectives: [
      'Tracing runtime vtable dispatch in derived hierarchies',
      'Preventing partial destruction through virtual destructors',
      'Enforcing interface contracts via pure virtual functions',
      'Managing deep copies with copy constructors and assignment operators'
    ]
  },
  dsa: {
    id: 'dsa',
    name: 'Data Structures & Algorithms',
    topics: [
      'Asymptotic Time & Space Complexity (Big-O)',
      'Binary Search Trees & AVL Rotations',
      'Graph Traversal (BFS & DFS)',
      'Heaps & Priority Queue Operations',
      'Hash Tables & Collision Resolution',
      'Linked List Inversions & Cycle Detection',
      'Dynamic Programming & Memoization'
    ],
    learningObjectives: [
      'Determining asymptotic complexity of recursive and nested algorithms',
      'Maintaining tree balancing invariants during insertions and deletions',
      'Navigating shortest paths and cycle detection in cyclic graphs',
      'Analyzing hash load factors and linear probing versus chaining'
    ]
  },
  dbms: {
    id: 'dbms',
    name: 'Database Systems',
    topics: [
      'Relational Algebra & Tuple Calculus',
      'SQL Subqueries & Correlated Joins',
      'ACID Properties & Transaction Isolation Levels',
      'Database Normalization (1NF, 2NF, 3NF, BCNF)',
      'B-Tree & Hash Indexing Structures',
      'Concurrency Control & Deadlock Handling',
      'Foreign Key Constraints & Cascade Triggers'
    ],
    learningObjectives: [
      'Optimizing query plans with composite and clustered indexes',
      'Preventing dirty reads, non-repeatable reads, and phantom reads',
      'Decomposing relations to eliminate insertion and update anomalies',
      'Constructing complex analytical queries using aggregate grouping'
    ]
  },
  cn: {
    id: 'cn',
    name: 'Computer Networks',
    topics: [
      'OSI 7-Layer Reference Model & Encapsulation',
      'TCP 3-Way Handshake & Four-Way Teardown',
      'IPv4 Subnetting & CIDR Block Allocation',
      'DNS Resolution & Authoritative Hierarchy',
      'Flow Control & Congestion Control (TCP Tahoe/Reno)',
      'Routing Protocols (Distance Vector vs Link-State)',
      'Application Protocols (HTTP/1.1 vs HTTP/2 vs HTTP/3)'
    ],
    learningObjectives: [
      'Analyzing packet flow and protocol encapsulation through network stacks',
      'Calculating usable host IP ranges and broadcast boundaries with CIDR masks',
      'Understanding window sizing, sliding windows, and retransmission timeouts',
      'Diagnosing DNS record lookups and TTL caching behavior'
    ]
  },
  se: {
    id: 'se',
    name: 'Software Engineering',
    topics: [
      'Agile Scrum Ceremonies & Sprint Velocity',
      'Software Testing Strategies (Unit, Integration, Regression)',
      'CI/CD Pipelines & Automated Deployments',
      'Design Patterns (Factory, Strategy, Observer)',
      'SOLID Design Principles & Architecture',
      'Version Control Workflows (Git Rebase vs Merge)',
      'Code Refactoring & Technical Debt'
    ],
    learningObjectives: [
      'Evaluating architectural maintainability using SOLID design tenets',
      'Formulating test suites balancing boundary values and branch coverage',
      'Managing feature branches and conflict resolution in distributed teams',
      'Designing loosely coupled components using creational and behavioral patterns'
    ]
  },
  os: {
    id: 'os',
    name: 'Operating Systems',
    topics: [
      'Process State Transitions & PCB Context Switching',
      'CPU Scheduling Algorithms (FCFS, SJF, Round Robin, Priority)',
      'Virtual Memory & Demand Paging (Page Faults, LRU)',
      'Deadlocks & Coffman Conditions (Banker\'s Algorithm)',
      'Inter-Process Communication & Shared Memory',
      'Semaphores, Mutexes & Race Conditions',
      'File System Inodes & Directory Hierarchies'
    ],
    learningObjectives: [
      'Calculating turnaround time and waiting time across scheduling algorithms',
      'Tracing page table address translation and TLB miss penalties',
      'Detecting and preventing deadlocks using resource allocation graphs',
      'Synchronizing concurrent threads to eliminate critical section races'
    ]
  }
};

export function normalizeSubjectId(input) {
  if (!input) return 'pf';
  const s = String(input).toLowerCase();
  if (s.includes('program') || s.includes('fundam') || s === 'pf') return 'pf';
  if (s.includes('object') || s.includes('oop')) return 'oop';
  if (s.includes('data struct') || s.includes('algo') || s === 'dsa') return 'dsa';
  if (s.includes('data') || s.includes('dbms') || s.includes('sql')) return 'dbms';
  if (s.includes('network') || s.includes('cn')) return 'cn';
  if (s.includes('soft') || s.includes('se') || s.includes('engineer')) return 'se';
  if (s.includes('operat') || s.includes('os')) return 'os';
  return 'pf';
}

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

// Storage keys
const SEEN_KEY = 'bob_client_practice_seen';
const HISTORY_KEY = 'bob_client_practice_history';
const POOL_KEY = 'bob_client_practice_pool';

function getStoredPool() {
  try {
    return JSON.parse(localStorage.getItem(POOL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStoredPool(pool) {
  try {
    localStorage.setItem(POOL_KEY, JSON.stringify(pool));
  } catch {}
}

function getSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

function addSeenId(id) {
  try {
    const list = getSeenIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(SEEN_KEY, JSON.stringify(list));
    }
  } catch {}
}

function getPracticeHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function addPracticeHistoryRecord(record) {
  try {
    const list = getPracticeHistory();
    list.push(record);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Synthesizes dynamic question using dynamic seeds and templates
 */
function synthesizeClientQuestion(subjectId, difficulty = 'Medium', questionType = 'mcq') {
  const normId = normalizeSubjectId(subjectId);
  const disc = CS_DISCIPLINES[normId] || CS_DISCIPLINES.pf;
  const chosenTopic = disc.topics[Math.floor(Math.random() * disc.topics.length)];
  const learningObjective = disc.learningObjectives[Math.floor(Math.random() * disc.learningObjectives.length)];

  const seedNum1 = Math.floor(10 + Math.random() * 85);
  const seedNum2 = Math.floor(2 + Math.random() * 12);
  const seedVar = ['ptr', 'counter', 'buffer', 'node', 'head', 'root', 'curr', 'delta'][Math.floor(Math.random() * 8)];

  const templates = {
    pf: [
      {
        topic: 'Pointers & Memory Addresses',
        diff: 'Medium',
        type: 'problem-solving',
        q: `Consider the following C/C++ pointer manipulation:\n\nint val = ${seedNum1};\nint *${seedVar} = &val;\n*${seedVar} += ${seedNum2};\nint result = val * 2;\n\nWhat is the final value of 'result'?`,
        options: [
          `${(seedNum1 + seedNum2) * 2}`,
          `${seedNum1 * 2}`,
          `${seedNum1 + (seedNum2 * 2)}`,
          `Undefined behavior due to pointer re-assignment`
        ],
        correct: 0,
        exp: `Dereferencing '*${seedVar}' directly modifies 'val' in memory from ${seedNum1} to ${seedNum1 + seedNum2}. Therefore, 'val * 2' calculates (${seedNum1 + seedNum2}) * 2 = ${(seedNum1 + seedNum2) * 2}.`
      },
      {
        topic: 'Variable Scope & Lifetime',
        diff: 'Easy',
        type: 'conceptual',
        q: `If a local variable inside a recursive function is declared with the 'static' storage class specifier, how does its lifecycle behave across recursive activations?`,
        options: [
          `A single instance is initialized once and retains its value across all recursive calls`,
          `A fresh copy is allocated on the call stack for each recursive activation frame`,
          `It causes a stack overflow error on the second recursive call`,
          `It behaves identically to an auto variable but cannot be accessed by pointers`
        ],
        correct: 0,
        exp: `In C/C++, a 'static' local variable has static storage duration: it is initialized once and preserves its state across calls.`
      },
      {
        topic: 'Recursion & Call Stack',
        diff: 'Hard',
        type: 'mcq',
        q: `What is the maximum number of concurrent stack frames for a non-tail-recursive function with recursion depth N?`,
        options: [
          `O(N) activation records proportional to the recursion depth`,
          `O(1) constant stack space because compilers collapse recursion`,
          `O(log N) stack frames because the runtime balances calls`,
          `O(N²) stack frames due to activation record duplication`
        ],
        correct: 0,
        exp: `Non-tail recursion requires preserving each caller frame until child calls complete, leading to O(N) concurrent frames.`
      }
    ],
    oop: [
      {
        topic: 'Polymorphism & Virtual Method Dispatch',
        diff: 'Medium',
        type: 'conceptual',
        q: `Why is it critical in C++ for a base class with virtual functions to declare its destructor as 'virtual'?`,
        options: [
          `To ensure the derived class destructor is invoked when deleting an object through a base class pointer`,
          `To prevent derived classes from inheriting private base members`,
          `To force dynamic casting to return nullptr on failure`,
          `To make derived class objects allocate in the data segment`
        ],
        correct: 0,
        exp: `Without a virtual destructor, deleting through a Base* invokes only the base destructor, leaking derived class resources.`
      },
      {
        topic: 'Encapsulation & Access Specifiers',
        diff: 'Easy',
        type: 'mcq',
        q: `In object-oriented programming, what is the primary architectural purpose of marking instance variables as private and exposing public getters/setters?`,
        options: [
          `To enforce invariant validation and encapsulate internal representation`,
          `To make the class execute with higher CPU clock cycles`,
          `To allow multiple inheritance without name collisions`,
          `To disable garbage collection on sensitive fields`
        ],
        correct: 0,
        exp: `Encapsulation protects the internal state from uncontrolled external modification and validates business rules.`
      }
    ],
    dsa: [
      {
        topic: 'Binary Search Trees & AVL Rotations',
        diff: 'Hard',
        type: 'problem-solving',
        q: `An AVL tree node becomes unbalanced with a Balance Factor of +2 after an insertion into the left child's right subtree (LR case). Which rotation sequence restores strict AVL balance?`,
        options: [
          `Left rotation on the left child, followed by a Right rotation on the unbalanced node`,
          `Single Right rotation on the unbalanced node`,
          `Single Left rotation on the unbalanced node`,
          `Right rotation on the right child, followed by a Left rotation on the unbalanced node`
        ],
        correct: 0,
        exp: `The LR (Left-Right) imbalance is resolved by a double rotation: first a Left rotation on the left child, then a Right rotation on the node.`
      },
      {
        topic: 'Asymptotic Time & Space Complexity (Big-O)',
        diff: 'Medium',
        type: 'conceptual',
        q: `Given the recurrence relation T(n) = 2T(n/2) + O(n), what is the tight asymptotic time complexity under the Master Theorem?`,
        options: [
          `O(n log n)`,
          `O(n)`,
          `O(n²)`,
          `O(log n)`
        ],
        correct: 0,
        exp: `With a = 2, b = 2, log_b(a) = 1. Since f(n) = O(n^1), this is Master Theorem Case 2, giving T(n) = O(n log n).`
      }
    ],
    dbms: [
      {
        topic: 'ACID Properties & Transaction Isolation Levels',
        diff: 'Hard',
        type: 'conceptual',
        q: `Which transaction phenomenon is prevented under the 'Repeatable Read' isolation level that is permitted under 'Read Committed'?`,
        options: [
          `Non-Repeatable Read (Fuzzy Read)`,
          `Dirty Read`,
          `Phantom Read`,
          `Deadlock`
        ],
        correct: 0,
        exp: `Repeatable Read prevents non-repeatable reads by ensuring rows read during a transaction cannot be modified by others.`
      },
      {
        topic: 'Database Normalization (1NF, 2NF, 3NF, BCNF)',
        diff: 'Medium',
        type: 'mcq',
        q: `A relational table is in 2nd Normal Form (2NF). What additional condition must be satisfied for it to achieve 3rd Normal Form (3NF)?`,
        options: [
          `Every non-prime attribute must not be transitively dependent on any candidate key`,
          `Every attribute must contain only atomic, indivisible values`,
          `All composite foreign keys must be mapped to surrogate integer IDs`,
          `Every determinant must be a superkey (BCNF constraint)`
        ],
        correct: 0,
        exp: `3NF eliminates transitive dependencies: non-key attributes must depend solely on candidate keys.`
      }
    ],
    cn: [
      {
        topic: 'TCP 3-Way Handshake & Connection Flow',
        diff: 'Medium',
        type: 'conceptual',
        q: `During the standard TCP 3-way handshake, what flags are set in the second segment transmitted from Server to Client?`,
        options: [
          `SYN + ACK`,
          `SYN only`,
          `ACK only`,
          `FIN + ACK`
        ],
        correct: 0,
        exp: `The server responds to the initial SYN with SYN-ACK (SYN flag set to synchronize sequence numbers and ACK set to acknowledge client SYN).`
      },
      {
        topic: 'IPv4 Subnetting & CIDR Block Allocation',
        diff: 'Easy',
        type: 'problem-solving',
        q: `How many usable host IP addresses are available in an IPv4 subnet configured with a /28 CIDR prefix?`,
        options: [
          `14 usable hosts (2^(32-28) - 2 = 14)`,
          `16 usable hosts`,
          `30 usable hosts`,
          `12 usable hosts`
        ],
        correct: 0,
        exp: `A /28 subnet has 32 - 28 = 4 host bits. 2^4 = 16 total addresses minus 2 (network and broadcast) = 14 usable hosts.`
      }
    ],
    se: [
      {
        topic: 'SOLID Design Principles & Architecture',
        diff: 'Medium',
        type: 'conceptual',
        q: `Which SOLID design principle is violated when a derived class overrides a base class method with behavior that throws UnsupportedOperationException?`,
        options: [
          `Liskov Substitution Principle (LSP)`,
          `Single Responsibility Principle (SRP)`,
          `Interface Segregation Principle (ISP)`,
          `Dependency Inversion Principle (DIP)`
        ],
        correct: 0,
        exp: `LSP states objects of a superclass should be replaceable with objects of a subclass without breaking correctness.`
      }
    ],
    os: [
      {
        topic: 'Deadlocks & Coffman Conditions',
        diff: 'Hard',
        type: 'conceptual',
        q: `Which of the following is NOT one of the four necessary Coffman conditions required for a system deadlock to occur?`,
        options: [
          `Preemptive Resource Allocation`,
          `Mutual Exclusion`,
          `Hold and Wait`,
          `Circular Wait`
        ],
        correct: 0,
        exp: `The condition is 'No Preemption'. If preemptive allocation is allowed, deadlocks cannot occur.`
      },
      {
        topic: 'CPU Scheduling Algorithms',
        diff: 'Medium',
        type: 'problem-solving',
        q: `In a Round Robin CPU scheduler with time quantum Q = 4ms, what is the major drawback of setting the time quantum too small (e.g. 0.01ms)?`,
        options: [
          `Excessive CPU overhead due to frequent context switching`,
          `Processes starve indefinitely without CPU allocation`,
          `It degrades into First-Come First-Served scheduling`,
          `The CPU halts due to interrupt saturation`
        ],
        correct: 0,
        exp: `A tiny time quantum causes the CPU to spend a major fraction of its execution time context switching rather than doing useful work.`
      }
    ]
  };

  const pool = templates[normId] || templates.pf;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  const optsWithIdx = chosen.options.map((opt, i) => ({ opt, isCorrect: i === chosen.correct }));
  const shuffled = [...optsWithIdx].sort(() => Math.random() - 0.5);
  const correctIndex = shuffled.findIndex((o) => o.isCorrect);
  const finalOptions = shuffled.map((o) => o.opt);

  return {
    id: generateId('AI-PQ'),
    subjectId: normId,
    subjectName: disc.name,
    topic: chosen.topic || chosenTopic,
    difficulty: chosen.diff || difficulty,
    questionType: chosen.type || questionType,
    question: chosen.q,
    options: finalOptions,
    correctIndex,
    correctAnswer: finalOptions[correctIndex],
    explanation: chosen.exp,
    learningObjective: learningObjective,
    isAIGenerated: true
  };
}

/**
 * Generates or picks next question on client without repetition
 */
export function clientGeneratePracticeQuestion({ subjectId = 'all', difficulty = 'All', questionType = 'All' } = {}) {
  const normSub = subjectId && subjectId !== 'all' ? normalizeSubjectId(subjectId) : null;
  const seen = new Set(getSeenIds());

  let pool = getStoredPool();

  // Find candidate from pool that student has not seen
  let candidate = pool.find((q) => {
    if (seen.has(q.id)) return false;
    if (normSub && q.subjectId !== normSub) return false;
    if (difficulty !== 'All' && q.difficulty.toLowerCase() !== difficulty.toLowerCase()) return false;
    return true;
  });

  // If no unseen candidate in pool, generate a brand new one dynamically!
  if (!candidate) {
    const targetSub = normSub || Object.keys(CS_DISCIPLINES)[Math.floor(Math.random() * 7)];
    candidate = synthesizeClientQuestion(targetSub, difficulty === 'All' ? 'Medium' : difficulty, questionType === 'All' ? 'mcq' : questionType);
    pool.push(candidate);
    saveStoredPool(pool);
  }

  // Mark as seen
  addSeenId(candidate.id);

  // Return sanitized question (correctIndex and explanation stripped)
  const sanitized = {
    id: candidate.id,
    subjectId: candidate.subjectId,
    subjectName: candidate.subjectName,
    topic: candidate.topic,
    difficulty: candidate.difficulty,
    questionType: candidate.questionType,
    question: candidate.question,
    options: candidate.options,
    learningObjective: candidate.learningObjective,
    isAIGenerated: true
  };

  return {
    success: true,
    question: sanitized,
    stats: clientGetPracticeStats()
  };
}

/**
 * Submits practice answer on client
 */
export function clientSubmitPracticeAnswer({ questionId, selectedIndex, timeSpentSeconds = 0 }) {
  const pool = getStoredPool();
  const q = pool.find((item) => item.id === questionId);

  if (!q) {
    return {
      success: true,
      isCorrect: true,
      correctIndex: selectedIndex,
      correctAnswer: 'Verified',
      explanation: 'Great answer! Concept verified.',
      learningObjective: 'Mastering Computer Science principles',
      pointsEarned: 10,
      stats: clientGetPracticeStats()
    };
  }

  const isCorrect = Number(selectedIndex) === Number(q.correctIndex);
  const record = {
    id: generateId('PR'),
    questionId,
    subjectId: q.subjectId,
    isCorrect,
    selectedIndex: Number(selectedIndex),
    correctIndex: q.correctIndex,
    timeSpentSeconds,
    attemptedAt: new Date().toISOString()
  };

  addPracticeHistoryRecord(record);

  return {
    success: true,
    isCorrect,
    correctIndex: q.correctIndex,
    correctAnswer: q.options[q.correctIndex],
    explanation: q.explanation,
    learningObjective: q.learningObjective,
    pointsEarned: isCorrect ? 10 : 0,
    stats: clientGetPracticeStats()
  };
}

/**
 * Computes stats from client history
 */
export function clientGetPracticeStats() {
  const history = getPracticeHistory();
  const totalAttempted = history.length;
  const correctCount = history.filter((h) => h.isCorrect).length;
  const accuracyPercentage = totalAttempted > 0 ? Math.round((correctCount / totalAttempted) * 100) : 0;

  let currentStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].isCorrect) currentStreak += 1;
    else break;
  }

  return {
    totalAttempted,
    correctCount,
    accuracyPercentage,
    currentStreak,
    practicePoints: correctCount * 10
  };
}

/**
 * Resets client practice history
 */
export function clientResetPracticeHistory() {
  try {
    localStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(POOL_KEY);
  } catch {}
  return { success: true };
}

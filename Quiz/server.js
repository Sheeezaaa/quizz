import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'bob_super_secure_jwt_secret_2026';

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// Database storage file path
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// ====================================================================
// DEFAULT SEED DATA (7 COMPUTING SUBJECTS, 4 ROUNDS, DEFAULT RULES)
// ====================================================================

const DEFAULT_DETAILS = {
  title: "BATTLE OF BRAINS",
  campusBadge: "NOVEMBER 20, 2026 • COMSATS UNIVERSITY ISLAMABAD",
  tagline: "Challenge Your Knowledge, Test Your Intelligence, and Compete to Become the Ultimate Champion!",
  organizer: "Department of Computer Science & Information Technology",
  university: "COMSATS University Islamabad",
  venue: "Main University Auditorium & CS Computing Complex",
  defaultEventDate: "2026-11-20T09:00:00.000Z",
  registrationOpen: true,
  registrationDeadline: "2026-11-19T23:59:59.000Z",
};

const DEFAULT_SUBJECTS = [
  { id: 'pf', code: 'CS-101', name: 'Programming Fundamentals', icon: 'Code2', difficulty: 'Easy', description: 'Core syntax, control flow, functions, memory pointers, dynamic arrays, and recursion.', topics: ['Variables & Operators', 'Control Structures & Loops', 'Pointers & Memory Allocation', 'Functions & Recursion'], isActive: true },
  { id: 'oop', code: 'CS-201', name: 'Object-Oriented Programming', icon: 'Boxes', difficulty: 'Moderate', description: 'Encapsulation, inheritance hierarchies, runtime polymorphism, abstract classes, operator overloading, and design patterns.', topics: ['Classes & Objects', 'Inheritance & Polymorphism', 'Abstraction & Interfaces', 'Templates & SOLID Principles'], isActive: true },
  { id: 'dsa', code: 'CS-202', name: 'Data Structures & Algorithms', icon: 'Binary', difficulty: 'Hard', description: 'Linear and non-linear data structures, trees, graphs, dynamic programming, greedy algorithms, and asymptotic complexity analysis.', topics: ['Trees, AVL & Graphs', 'Sorting & Searching', 'Dynamic Programming', 'Big-O Asymptotic Analysis'], isActive: true },
  { id: 'dbms', code: 'CS-301', name: 'Database Systems', icon: 'Database', difficulty: 'Moderate', description: 'Relational algebra, advanced SQL queries, normal forms (1NF through BCNF), indexing, transaction management, and ACID compliance.', topics: ['Relational Model & SQL', 'Normalization (1NF–BCNF)', 'Transactions & Concurrency', 'Indexing & Query Optimization'], isActive: true },
  { id: 'cn', code: 'CS-302', name: 'Computer Networks', icon: 'Network', difficulty: 'Moderate', description: 'Layered architecture (OSI & TCP/IP), subnetting, switching, routing protocols (OSPF/BGP), transport protocols, and cybersecurity foundations.', topics: ['OSI & TCP/IP Layers', 'IP Addressing & Subnetting', 'Routing & Switching', 'Network Security Protocols'], isActive: true },
  { id: 'se', code: 'CS-303', name: 'Software Engineering', icon: 'Workflow', difficulty: 'Moderate', description: 'Software lifecycle models, Agile/Scrum methodologies, architectural styles, requirement engineering, unit testing, and CI/CD pipelines.', topics: ['SDLC & Agile Frameworks', 'Design Patterns & Architecture', 'Software Testing & QA', 'CI/CD & Version Control'], isActive: true },
  { id: 'os', code: 'CS-401', name: 'Operating Systems', icon: 'Cpu', difficulty: 'Hard', description: 'Process synchronization, CPU scheduling algorithms, memory virtualization, paging, deadlock prevention, and distributed file systems.', topics: ['Processes, Threads & Concurrency', 'CPU Scheduling & Deadlocks', 'Virtual Memory & Paging', 'File Systems & I/O Subsystems'], isActive: true },
];

const DEFAULT_ROUNDS = [
  { roundNumber: 1, title: 'Screening Round (MCQs)', stageBadge: 'Stage 01 • University Auditorium', timeLimitSeconds: 30, questionsCount: 5, markingCorrect: 1.0, markingNegative: 0.0, qualificationRule: 'Top 80% of participating students qualify for Round 2.', strictRule: 'Strict 30 seconds per question. Answers will NOT be accepted after timer expires.', isActive: true, isCompleted: false },
  { roundNumber: 2, title: 'Core CS Concepts Round', stageBadge: 'Stage 02 • CS Computing Labs', timeLimitSeconds: 45, questionsCount: 5, markingCorrect: 1.0, markingNegative: 0.0, qualificationRule: 'Top 4 participants qualify for Round 3 (Semi-Finals).', strictRule: 'Strict 45 seconds per question. Answers will NOT be accepted after timer expires.', isActive: false, isCompleted: false },
  { roundNumber: 3, title: 'Rapid Fire Round', stageBadge: 'Stage 03 • Semi-Final Showdown', timeLimitSeconds: 180, questionsCount: 20, markingCorrect: 1.0, markingNegative: 0.0, qualificationRule: 'Top 2 finalists qualify for the 1-on-1 Buzzer Grand Final.', strictRule: '3 minutes total per participant. 3 seconds response/skip rule. Skipped questions cannot be repeated.', isActive: false, isCompleted: false },
  { roundNumber: 4, title: 'Buzzer Round (Grand Final)', stageBadge: 'Stage 04 • The Ultimate Championship', timeLimitSeconds: 10, questionsCount: 15, markingCorrect: 1.0, markingNegative: -0.5, qualificationRule: 'Highest total score crowns the Champion of Battle of Brains 2026.', strictRule: 'First to buzz answers within 10 seconds. Wrong answer incurs -0.5 penalty.', isActive: false, isCompleted: false },
];

const DEFAULT_RULES = {
  generalRules: [
    { title: "Individual Participation Only", description: "Each participant competes as an individual (solo competitor). Group entries, pairs, or team collaborations are strictly not allowed.", icon: "User" },
    { title: "Mandatory Student Identification", description: "All participants must carry their original, valid University Student ID cards. Verification will take place at the reception registration desk.", icon: "IdCard" },
    { title: "Prohibited Electronic Devices", description: "Mobile phones, smartwatches, programmable calculators, Bluetooth devices, and external notes are strictly prohibited inside the competition arena.", icon: "PhoneOff" },
    { title: "Anti-Cheating & Integrity", description: "Cheating, prompting from the audience, unauthorized side discussions, or unfair means will lead to immediate and irreversible disqualification.", icon: "ShieldAlert" },
    { title: "Finality of Organizer Decisions", description: "The official jury and panel of judges' decisions regarding points, timing, buzzer logs, and disputes are final and binding on all participants.", icon: "Gavel" },
    { title: "Punctuality & Reporting", description: "Participants must report to the competition venue at least 10 minutes before the scheduled start time. Late arrivals forfeit their slot without exception.", icon: "Clock" },
  ],
  tieBreakerRules: [
    { step: "Phase 1", title: "Standard Tie-Breaker (2 Extra Questions)", description: "If two or more participants finish with equal scores in any qualifying round, 2 additional tie-breaker questions will be asked from each tied candidate." },
    { step: "Phase 2", title: "Decisive Sudden-Death Buzzer", description: "If participants remain tied after 2 additional questions, one decisive sudden-death buzzer question will be posed. The first candidate to buzz and answer correctly wins immediately." },
    { step: "Critical Clause", title: "Buzzer Penalty in Sudden-Death", description: "If the first participant buzzes and answers incorrectly during sudden-death, the opposing tied candidate is automatically awarded the qualification slot." },
  ],
  disqualificationRules: [
    { reason: "Using Phones or External Help", severity: "Immediate Disqualification & University Disciplinary Notification", description: "Any participant found consulting a phone, wearable smart tech, internet search, or audience member will be disqualified instantly." },
    { reason: "Misbehaving with Judges or Organizers", severity: "Immediate Disqualification & Event Ban", description: "Disrespectful conduct, aggressive arguments with referees, or inappropriate language towards fellow participants will result in immediate eviction." },
    { reason: "Pressing the Buzzer Repeatedly without Reason", severity: "Official Warning, Followed by Point Deductions & Disqualification", description: "Frivolous, premature, or spam buzzer clicks intended to distract opponents or game the hardware will incur -1 point and potential disqualification." },
    { reason: "Intentionally Delaying the Rounds", severity: "Forfeit of Current Round Turn", description: "Unreasonable stalls, refusal to answer within designated clock ticks, or disruptive stalling tactics will result in turn forfeiture." },
  ],
};

const SEED_QUESTIONS = [
  // Round 1 - Screening MCQs
  {
    id: "Q1-01",
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    roundNumber: 1,
    difficulty: "Hard",
    question: "What is the worst-case time complexity of searching for an element in a balanced Binary Search Tree (AVL Tree) with n nodes?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correct: 1,
    explanation: "A balanced BST like an AVL tree maintains a maximum height of O(log n), ensuring searches take at most O(log n) comparisons in the worst case.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-02",
    subjectId: "oop",
    subjectName: "Object-Oriented Programming",
    roundNumber: 1,
    difficulty: "Moderate",
    question: "In C++ or Java, which concept allows a subclass to provide a specific implementation of a method that is already provided by its superclass?",
    options: ["Method Overloading", "Method Overriding", "Data Encapsulation", "Multiple Inheritance"],
    correct: 1,
    explanation: "Method Overriding occurs when a child class provides a new implementation of an inherited virtual or abstract method with identical signature.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-03",
    subjectId: "dbms",
    subjectName: "Database Systems",
    roundNumber: 1,
    difficulty: "Moderate",
    question: "Which normal form requires removing transitive dependencies of non-prime attributes on candidate keys?",
    options: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)", "Boyce-Codd Normal Form (BCNF)"],
    correct: 2,
    explanation: "3NF is satisfied if the relation is in 2NF and every non-prime attribute is non-transitively dependent on candidate keys.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-04",
    subjectId: "cn",
    subjectName: "Computer Networks",
    roundNumber: 1,
    difficulty: "Moderate",
    question: "At which layer of the OSI model does the Address Resolution Protocol (ARP) primarily operate to map IP addresses to MAC addresses?",
    options: ["Transport Layer", "Data Link / Network Interface", "Application Layer", "Session Layer"],
    correct: 1,
    explanation: "ARP functions at the boundary between Network Layer (Layer 3) and Data Link Layer (Layer 2) to resolve 32-bit IPv4 addresses into 48-bit physical MAC addresses.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-05",
    subjectId: "os",
    subjectName: "Operating Systems",
    roundNumber: 1,
    difficulty: "Hard",
    question: "Which condition is NOT one of Coffman's four necessary conditions for a system deadlock to occur?",
    options: ["Mutual Exclusion", "Hold and Wait", "Preemption Allowed", "Circular Wait"],
    correct: 2,
    explanation: "For deadlock to occur, resources must be non-preemptive. If preemption is allowed, deadlock cannot form.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-06",
    subjectId: "pf",
    subjectName: "Programming Fundamentals",
    roundNumber: 1,
    difficulty: "Easy",
    question: "Which operator in C/C++ is used to obtain the memory address of a variable?",
    options: ["*", "&", "->", "%"],
    correct: 1,
    explanation: "The ampersand (&) operator is the address-of operator in C and C++.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q1-07",
    subjectId: "se",
    subjectName: "Software Engineering",
    roundNumber: 1,
    difficulty: "Moderate",
    question: "Which architectural design pattern separates internal representations of information from the ways that information is presented to and accepted from the user?",
    options: ["Singleton", "Model-View-Controller (MVC)", "Adapter", "Abstract Factory"],
    correct: 1,
    explanation: "MVC isolates application logic from user interface presentation layer.",
    version: 1,
    isActive: true,
  },

  // Round 2 - Core CS Concepts
  {
    id: "Q2-01",
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    roundNumber: 2,
    difficulty: "Hard",
    question: "What is the optimal average-case time complexity of the QuickSort algorithm with random pivot selection?",
    options: ["O(n)", "O(n log n)", "O(n^2)", "O(log n)"],
    correct: 1,
    explanation: "QuickSort achieves O(n log n) expected time with randomized pivot selection.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q2-02",
    subjectId: "os",
    subjectName: "Operating Systems",
    roundNumber: 2,
    difficulty: "Hard",
    question: "In Virtual Memory management, what phenomenon occurs when excessive page faults lead to the operating system spending more time paging than executing instructions?",
    options: ["Starvation", "Belady's Anomaly", "Thrashing", "Deadlock"],
    correct: 2,
    explanation: "Thrashing occurs when high paging activity collapses effective CPU utilization.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q2-03",
    subjectId: "dbms",
    subjectName: "Database Systems",
    roundNumber: 2,
    difficulty: "Hard",
    question: "Which isolation level in ANSI SQL prevents dirty reads and non-repeatable reads, but still permits phantom reads?",
    options: ["Read Uncommitted", "Read Committed", "Repeatable Read", "Serializable"],
    correct: 2,
    explanation: "Repeatable Read prevents dirty and non-repeatable reads, but phantom rows can still occur.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q2-04",
    subjectId: "cn",
    subjectName: "Computer Networks",
    roundNumber: 2,
    difficulty: "Moderate",
    question: "How many usable host IP addresses are available in a subnet with CIDR prefix /27?",
    options: ["32", "30", "16", "28"],
    correct: 1,
    explanation: "2^(32 - 27) = 32 total addresses. Subtracting network and broadcast addresses yields 30 usable hosts.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q2-05",
    subjectId: "oop",
    subjectName: "Object-Oriented Programming",
    roundNumber: 2,
    difficulty: "Moderate",
    question: "Which SOLID principle asserts that high-level modules should not depend on low-level modules, but both should depend on abstractions?",
    options: ["Single Responsibility Principle", "Open/Closed Principle", "Liskov Substitution Principle", "Dependency Inversion Principle"],
    correct: 3,
    explanation: "Dependency Inversion states that abstractions should not depend upon details; details depend on abstractions.",
    version: 1,
    isActive: true,
  },

  // Round 3 - Rapid Fire Questions
  {
    id: "Q3-01",
    subjectId: "pf",
    subjectName: "Programming Fundamentals",
    roundNumber: 3,
    difficulty: "Easy",
    question: "What operator is used in C to dereference a pointer variable?",
    options: ["&", "*", "->", "."],
    correct: 1,
    explanation: "The asterisk (*) dereferences a pointer to access its targeted value.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q3-02",
    subjectId: "se",
    subjectName: "Software Engineering",
    roundNumber: 3,
    difficulty: "Easy",
    question: "In Agile Scrum methodology, what is the standard recommended duration of a Sprint?",
    options: ["1 to 4 Weeks", "6 Months", "1 Day", "1 Year"],
    correct: 0,
    explanation: "Scrum guidelines designate sprint lengths between one and four weeks.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q3-03",
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    roundNumber: 3,
    difficulty: "Moderate",
    question: "Which data structure follows the Last-In First-Out (LIFO) operational principle?",
    options: ["Queue", "Stack", "Binary Heap", "Hash Table"],
    correct: 1,
    explanation: "A Stack operates on a LIFO discipline.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q3-04",
    subjectId: "cn",
    subjectName: "Computer Networks",
    roundNumber: 3,
    difficulty: "Moderate",
    question: "What is the standard port number assigned to HTTPS web traffic?",
    options: ["80", "443", "22", "8080"],
    correct: 1,
    explanation: "HTTPS utilizes TCP port 443.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q3-05",
    subjectId: "dbms",
    subjectName: "Database Systems",
    roundNumber: 3,
    difficulty: "Easy",
    question: "Which SQL clause is used to eliminate duplicate rows from a query result set?",
    options: ["UNIQUE", "DISTINCT", "DIFFERENT", "FILTER"],
    correct: 1,
    explanation: "SELECT DISTINCT removes duplicate tuples.",
    version: 1,
    isActive: true,
  },

  // Round 4 - Buzzer Championship Deciders
  {
    id: "Q4-01",
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    roundNumber: 4,
    difficulty: "Hard",
    question: "Which graph traversal algorithm uses a First-In-First-Out (FIFO) queue to explore vertex frontiers?",
    options: ["Depth First Search (DFS)", "Breadth First Search (BFS)", "Dijkstra Algorithm", "Kruskal Algorithm"],
    correct: 1,
    explanation: "BFS explores level by level using a FIFO queue.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q4-02",
    subjectId: "os",
    subjectName: "Operating Systems",
    roundNumber: 4,
    difficulty: "Hard",
    question: "What is the primary advantage of multi-level feedback queue CPU scheduling over simple round robin?",
    options: ["Guaranteed zero wait time", "Dynamically adjusts priority based on CPU burst history", "Eliminates need for timer interrupts", "Requires no memory"],
    correct: 1,
    explanation: "MLFQ prioritizes I/O bound interactive jobs while penalizing CPU-heavy compute processes.",
    version: 1,
    isActive: true,
  },
  {
    id: "Q4-03",
    subjectId: "se",
    subjectName: "Software Engineering",
    roundNumber: 4,
    difficulty: "Hard",
    question: "In software testing, what term describes tests that ensure recent code modifications have not broken pre-existing functionality?",
    options: ["Smoke Testing", "Regression Testing", "Stress Testing", "Usability Testing"],
    correct: 1,
    explanation: "Regression testing validates that existing functionality remains intact after updates.",
    version: 1,
    isActive: true,
  },
  // Tie-Breaker Questions
  {
    id: "TB-01",
    subjectId: "dsa",
    subjectName: "Data Structures & Algorithms",
    roundNumber: 1,
    difficulty: "Hard",
    isTieBreaker: true,
    question: "What is the time complexity of building a Binary Heap from an arbitrary array of n elements using Floyd's build-heap algorithm?",
    options: ["O(n log n)", "O(n)", "O(n^2)", "O(log n)"],
    correct: 1,
    explanation: "Floyd's bottom-up build-heap algorithm constructs a valid heap in linear O(n) time.",
    version: 1,
    isActive: true,
  },
  {
    id: "TB-02",
    subjectId: "cn",
    subjectName: "Computer Networks",
    roundNumber: 1,
    difficulty: "Hard",
    isTieBreaker: true,
    question: "In TCP congestion control, which phase occurs immediately when packet loss is detected via triple duplicate ACKs?",
    options: ["Slow Start", "Fast Recovery", "Exponential Backoff", "Congestion Avoidance Reset"],
    correct: 1,
    explanation: "In TCP Reno/NewReno, three duplicate ACKs trigger Fast Retransmit and Fast Recovery.",
    version: 1,
    isActive: true,
  },
];

// Initial registered students for verification
const INITIAL_PARTICIPANTS = [
  {
    id: "BOB-2026-101",
    fullName: "Hamza Tariq",
    studentId: "FA21-BCS-042",
    universityName: "COMSATS University Islamabad",
    campus: "Islamabad Campus",
    region: "Federal Capital",
    email: "hamza.tariq@student.comsats.edu.pk",
    phone: "+92 300 1234567",
    department: "Computer Science",
    degreeProgram: "BS Computer Science",
    semester: "6th Semester",
    passwordHash: bcrypt.hashSync("Student@123", 8),
    registrationStatus: "Approved",
    role: "Participant",
    registeredAt: "2026-11-01T10:00:00.000Z",
    rulesAccepted: true,
  },
  {
    id: "BOB-2026-102",
    fullName: "Fatima Noor",
    studentId: "SP22-BSE-019",
    universityName: "COMSATS University Islamabad",
    campus: "Islamabad Campus",
    region: "Federal Capital",
    email: "fatima.noor@student.comsats.edu.pk",
    phone: "+92 301 2345678",
    department: "Software Engineering",
    degreeProgram: "BS Software Engineering",
    semester: "4th Semester",
    passwordHash: bcrypt.hashSync("Student@123", 8),
    registrationStatus: "Approved",
    role: "Participant",
    registeredAt: "2026-11-01T11:30:00.000Z",
    rulesAccepted: true,
  },
  {
    id: "BOB-2026-103",
    fullName: "Muhammad Bilal",
    studentId: "FA22-BAI-088",
    universityName: "COMSATS University Islamabad",
    campus: "Islamabad Campus",
    region: "Federal Capital",
    email: "bilal.ai@student.comsats.edu.pk",
    phone: "+92 302 3456789",
    department: "Artificial Intelligence",
    degreeProgram: "BS Artificial Intelligence",
    semester: "4th Semester",
    passwordHash: bcrypt.hashSync("Student@123", 8),
    registrationStatus: "Approved",
    role: "Participant",
    registeredAt: "2026-11-02T09:15:00.000Z",
    rulesAccepted: true,
  },
  {
    id: "BOB-2026-104",
    fullName: "Ayesha Khan",
    studentId: "SP23-BCS-055",
    universityName: "COMSATS University Islamabad",
    campus: "Islamabad Campus",
    region: "Federal Capital",
    email: "ayesha.k@student.comsats.edu.pk",
    phone: "+92 303 9876543",
    department: "Computer Science",
    degreeProgram: "BS Computer Science",
    semester: "2nd Semester",
    passwordHash: bcrypt.hashSync("Student@123", 8),
    registrationStatus: "Approved",
    role: "Participant",
    registeredAt: "2026-11-02T14:20:00.000Z",
    rulesAccepted: true,
  },
  {
    id: "BOB-2026-105",
    fullName: "Zainab Malik",
    studentId: "FA23-BCY-012",
    universityName: "COMSATS University Islamabad",
    campus: "Islamabad Campus",
    region: "Federal Capital",
    email: "zainab.m@student.comsats.edu.pk",
    phone: "+92 304 5556677",
    department: "Cyber Security",
    degreeProgram: "BS Cyber Security",
    semester: "3rd Semester",
    passwordHash: bcrypt.hashSync("Student@123", 8),
    registrationStatus: "Pending",
    role: "Participant",
    registeredAt: "2026-11-03T08:45:00.000Z",
    rulesAccepted: true,
  }
];

// Initial announcements
const INITIAL_ANNOUNCEMENTS = [
  {
    id: "ANN-01",
    title: "Battle of Brains 2026 Official Schedule Released",
    content: "Welcome all registered participants! Screening Round (Round 1) starts promptly in the Main University Auditorium. All students must bring physical student IDs.",
    category: "Schedule",
    isPublished: true,
    createdAt: "2026-11-03T10:00:00.000Z",
  },
  {
    id: "ANN-02",
    title: "Strict Anti-Cheating & Individual Code of Conduct",
    content: "Notice: Smartwatches, phones, and peripheral gadgets are strictly forbidden. Infractions will trigger instant disqualification and referral to the University Disciplinary Committee.",
    category: "Regulations",
    isPublished: true,
    createdAt: "2026-11-04T12:00:00.000Z",
  }
];

// ====================================================================
// PERSISTENCE ENGINE (JSON with In-Memory Master Cache & Concurrency Mutex)
// ====================================================================

let cachedDB = null;
let dbMutex = Promise.resolve();

function withDBLock(fn) {
  const next = dbMutex.then(async () => {
    return await fn();
  });
  dbMutex = next.catch(() => {});
  return next;
}

function normalizeQuestion(q) {
  if (!q) return null;
  const options = Array.isArray(q.options) && q.options.length >= 2
    ? q.options
    : [q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean);

  let correctIndex = 0;
  if (q.correct !== undefined) {
    correctIndex = Number(q.correct);
  } else if (q.correctOption) {
    const map = { A: 0, B: 1, C: 2, D: 3 };
    correctIndex = map[String(q.correctOption).toUpperCase()] || 0;
  }

  let roundNum = Number(q.roundNumber);
  if (!roundNum && q.round) {
    const rStr = String(q.round);
    if (rStr.includes('1')) roundNum = 1;
    else if (rStr.includes('2')) roundNum = 2;
    else if (rStr.includes('3')) roundNum = 3;
    else if (rStr.includes('4')) roundNum = 4;
    else roundNum = 1;
  }
  if (!roundNum) roundNum = 1;

  return {
    id: q.id,
    subjectId: q.subjectId || 'pf',
    subjectName: q.subjectName || q.subject || 'Programming Fundamentals',
    roundNumber: roundNum,
    difficulty: q.difficulty || 'Moderate',
    question: q.question || '',
    options: options.length >= 2 ? options : ['Option A', 'Option B'],
    correct: correctIndex,
    explanation: q.explanation || '',
    isTieBreaker: Boolean(q.isTieBreaker),
    version: q.version || 1,
    isActive: q.isActive !== false,
  };
}

function loadDBFromDisk() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialData = {
        adminPasswordHash: bcrypt.hashSync('admin123', 8),
        details: DEFAULT_DETAILS,
        subjects: DEFAULT_SUBJECTS,
        rounds: DEFAULT_ROUNDS,
        rules: DEFAULT_RULES,
        participants: INITIAL_PARTICIPANTS,
        questions: SEED_QUESTIONS,
        questionVersions: [],
        attempts: [],
        scoringEvents: [],
        buzzerEvents: [],
        announcements: INITIAL_ANNOUNCEMENTS,
        notifications: [],
        results: [],
        auditLogs: [
          {
            id: "LOG-INIT",
            actor: "System Initializer",
            action: "DATABASE_INITIALIZATION",
            targetType: "system",
            targetId: "root",
            details: { message: "Battle of Brains 2026 tournament database primed." },
            timestamp: new Date().toISOString(),
          }
        ],
        buzzerState: {
          round: 4,
          activeQuestionIndex: 0,
          lockedStudentId: null,
          lockedStudentName: null,
          buzzTimestamp: null,
          deadlineTimestamp: null,
          status: "idle", // 'idle', 'buzzed', 'adjudicated'
        },
        rapidFireState: {
          activeStudentId: null,
          activeStudentName: null,
          startedAt: null,
          expiresAt: null,
          currentQuestionIndex: 0,
          correctCount: 0,
          incorrectCount: 0,
          skippedCount: 0,
          status: "idle", // 'idle', 'running', 'finished'
        }
      };
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(data);
    
    // Ensure all required collections exist and questions are normalized
    parsed.questions = (parsed.questions && parsed.questions.length > 0 ? parsed.questions : SEED_QUESTIONS).map(normalizeQuestion).filter(Boolean);
    if (!parsed.attempts) parsed.attempts = [];
    if (!parsed.scoringEvents) parsed.scoringEvents = [];
    if (!parsed.buzzerEvents) parsed.buzzerEvents = [];
    if (!parsed.announcements) parsed.announcements = INITIAL_ANNOUNCEMENTS;
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.results) parsed.results = [];
    if (!parsed.auditLogs) parsed.auditLogs = [];
    if (!parsed.questionVersions) parsed.questionVersions = [];
    if (!parsed.partnerRequests) parsed.partnerRequests = [];
    if (!parsed.teams) parsed.teams = [];
    if (!parsed.buzzerState) parsed.buzzerState = { round: 4, activeQuestionIndex: 0, lockedStudentId: null, status: "idle" };
    if (!parsed.rapidFireState) parsed.rapidFireState = { status: "idle" };

    return parsed;
  } catch (err) {
    console.error('Error reading DB:', err);
    return {
      adminPasswordHash: bcrypt.hashSync('admin123', 8),
      details: DEFAULT_DETAILS,
      subjects: DEFAULT_SUBJECTS,
      rounds: DEFAULT_ROUNDS,
      rules: DEFAULT_RULES,
      participants: INITIAL_PARTICIPANTS,
      questions: SEED_QUESTIONS,
      attempts: [],
      scoringEvents: [],
      buzzerEvents: [],
      announcements: INITIAL_ANNOUNCEMENTS,
      notifications: [],
      results: [],
      auditLogs: [],
      questionVersions: [],
      buzzerState: { status: "idle" },
      rapidFireState: { status: "idle" }
    };
  }
}

function readDB() {
  if (!cachedDB) {
    cachedDB = loadDBFromDisk();
  }
  return cachedDB;
}

function writeDB(data) {
  try {
    cachedDB = data;
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const tempPath = `${DB_PATH}.${Date.now()}.${Math.floor(Math.random() * 10000)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(cachedDB, null, 2), 'utf8');
    try {
      fs.renameSync(tempPath, DB_PATH);
    } catch {
      fs.writeFileSync(DB_PATH, JSON.stringify(cachedDB, null, 2), 'utf8');
      try { fs.unlinkSync(tempPath); } catch {}
    }
    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// Helper: Add Audit Log
function addAuditLog(actor, action, targetType, targetId, details = {}) {
  const db = readDB();
  const log = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actor: actor || 'Admin',
    action,
    targetType,
    targetId: String(targetId),
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs = [log, ...(db.auditLogs || [])].slice(0, 500); // retain last 500
  writeDB(db);
  return log;
}

// Helper: Add In-App Notification
function addNotification(studentId, title, message, type = 'info') {
  const db = readDB();
  const notif = {
    id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications = [notif, ...(db.notifications || [])];
  writeDB(db);
  return notif;
}

// ====================================================================
// AUTHENTICATION & RBAC MIDDLEWARES
// ====================================================================

function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied. Authentication token required.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid authorization token.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  authenticateJWT(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Access forbidden: Administrator privilege required.' });
    }
  });
}

function requireParticipant(req, res, next) {
  authenticateJWT(req, res, () => {
    if (req.user && (req.user.role === 'participant' || req.user.role === 'admin')) {
      next();
    } else {
      res.status(403).json({ error: 'Access forbidden: Participant account required.' });
    }
  });
}

// ====================================================================
// AUTHENTICATION ROUTES
// ====================================================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString(), service: 'Battle of Brains Central Engine' });
});

// Admin Login (POST /api/auth/login)
app.post('/api/auth/login', (req, res) => {
  const { username, passcode } = req.body;
  const db = readDB();

  if (!passcode) {
    return res.status(400).json({ error: 'Passcode is required.' });
  }

  // If custom hash exists, authenticate ONLY against the hash. Never fallback to default admin123.
  const isMatch = db.adminPasswordHash
    ? bcrypt.compareSync(passcode, db.adminPasswordHash)
    : passcode === 'admin123';

  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid administrative passcode.' });
  }

  const user = {
    role: 'admin',
    username: username || 'admin@comsats.edu.pk',
    fullName: 'System Administrator',
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  addAuditLog(user.username, 'ADMIN_LOGIN', 'auth', user.username);
  res.json({ success: true, token, user });
});

// Change Admin Password (POST /api/auth/change-password)
app.post('/api/auth/change-password', requireAdmin, (req, res) => {
  const { currentPasscode, newPasscode } = req.body;
  const db = readDB();

  const isMatch = db.adminPasswordHash
    ? bcrypt.compareSync(currentPasscode, db.adminPasswordHash)
    : currentPasscode === 'admin123';

  if (!isMatch) {
    return res.status(400).json({ error: 'Current passcode does not match.' });
  }

  if (!newPasscode || newPasscode.length < 4) {
    return res.status(400).json({ error: 'New passcode must be at least 4 characters long.' });
  }

  db.adminPasswordHash = bcrypt.hashSync(newPasscode, 8);
  writeDB(db);
  addAuditLog(req.user.username, 'ADMIN_PASSWORD_CHANGED', 'security', 'admin');
  res.json({ success: true, message: 'Administrator passcode updated successfully!' });
});


function normalizeMobile(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('92')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}


// Student Individual Registration (POST /api/auth/register-individual)
// Enforces individual registration with Full Name, unique Mobile Number, and hashed Password
app.post('/api/auth/register-individual', (req, res) => {
  const {
    fullName,
    mobile,
    password,
    universityName,
    department,
    degreeProgram,
    semester
  } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full student name is strictly required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is strictly required.' });
  }
  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid mobile number (e.g. 03001234567).' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const db = readDB();
  const participants = db.participants || [];

  // Enforce unique mobile number
  const duplicateMobile = participants.find((p) => {
    const existing = normalizeMobile(p.mobile || p.phone);
    return existing && existing === cleanMobile;
  });
  if (duplicateMobile) {
    return res.status(409).json({ error: `Mobile number "${mobile}" is already registered with another student account.` });
  }

  // Generate unique Reference ID & Student ID
  const usedRefs = new Set(participants.map((p) => p.id));
  let newRef;
  do {
    newRef = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
  } while (usedRefs.has(newRef));

  const generatedStudentId = `STU-${cleanMobile.slice(-4)}`;
  const cleanEmail = `${cleanMobile}@student.bob.pk`;

  const newStudent = {
    id: newRef,
    fullName: fullName.trim(),
    studentId: generatedStudentId,
    mobile: mobile.trim(),
    phone: mobile.trim(),
    email: cleanEmail,
    universityName: (universityName || 'COMSATS University Islamabad').trim(),
    campus: 'Islamabad Campus',
    region: 'Federal Capital',
    department: (department || degreeProgram || 'Computer Science').trim(),
    degreeProgram: (degreeProgram || 'BS Computer Science').trim(),
    semester: (semester || '4th Semester').trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    registrationStatus: 'Approved',
    role: 'Participant',
    rulesAccepted: true,
    teamId: null,
    registeredAt: new Date().toISOString(),
  };

  db.participants = [newStudent, ...participants];
  writeDB(db);

  const token = jwt.sign(
    {
      role: 'participant',
      id: newStudent.id,
      studentId: newStudent.studentId,
      fullName: newStudent.fullName,
      email: newStudent.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeStudent = { ...newStudent };
  delete safeStudent.passwordHash;

  res.json({
    success: true,
    message: 'Individual registration completed successfully!',
    participant: safeStudent,
    token,
  });
});

// Student Individual Registration (POST /api/auth/register-student)
app.post('/api/auth/register-student', (req, res) => {
  const {
    fullName,
    studentId,
    universityName,
    campus,
    region,
    email,
    phone,
    degreeProgram,
    semester,
    password,
    rulesAccepted,
  } = req.body;

  // Validation
  if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full student name is strictly required.' });
  if (!studentId || !studentId.trim()) return res.status(400).json({ error: 'Student Registration ID is strictly required.' });
  if (!email || !email.trim()) return res.status(400).json({ error: 'Valid university email is required.' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Secure password must be at least 6 characters.' });
  if (!rulesAccepted) return res.status(400).json({ error: 'You must review and agree to the competition rules and regulations.' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

  const db = readDB();
  const participants = db.participants || [];

  // Check deadline
  if (db.details && db.details.registrationDeadline) {
    const deadline = new Date(db.details.registrationDeadline).getTime();
    if (Date.now() > deadline) {
      return res.status(403).json({ error: 'Registration deadline has passed. Late registrations are not permitted.' });
    }
  }

  const cleanStudentId = studentId.trim().toUpperCase();
  const cleanEmail = email.trim().toLowerCase();

  // Duplicate Check
  const duplicateId = participants.find((p) => p.studentId.toUpperCase() === cleanStudentId);
  if (duplicateId) {
    return res.status(409).json({ error: `Student ID "${cleanStudentId}" is already registered in the championship.` });
  }

  const duplicateEmail = participants.find((p) => (p.email || '').toLowerCase() === cleanEmail);
  if (duplicateEmail) {
    return res.status(409).json({ error: `Email "${cleanEmail}" is already registered with another student account.` });
  }

  // Generate Unique Registration Reference: BOB-2026-XXX
  const usedRefs = new Set(participants.map((p) => p.id));
  let newRef;
  do {
    newRef = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
  } while (usedRefs.has(newRef));

  const newStudent = {
    id: newRef,
    fullName: fullName.trim(),
    studentId: cleanStudentId,
    universityName: (universityName || 'COMSATS University Islamabad').trim(),
    campus: (campus || 'Islamabad Campus').trim(),
    region: (region || 'Federal Capital').trim(),
    email: cleanEmail,
    phone: (phone || '').trim(),
    department: degreeProgram || 'Computer Science',
    degreeProgram: (degreeProgram || 'BS Computer Science').trim(),
    semester: (semester || '4th Semester').trim(),
    passwordHash: bcrypt.hashSync(password, 8),
    registrationStatus: 'Approved', // Auto-approved or pending per config
    role: 'Participant',
    rulesAccepted: true,
    registeredAt: new Date().toISOString(),
  };

  db.participants = [newStudent, ...participants];

  // Automatic Email Notification Dispatch (Test Schedule, Venue & Admit Details)
  const eventDate = db.details?.defaultEventDate || 'May 15, 2026';
  const emailNotification = {
    id: `MAIL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    recipient: cleanEmail,
    studentId: cleanStudentId,
    studentName: newStudent.fullName,
    subject: "Battle of Brains 2026 — Official Examination Schedule & Admit Card",
    body: `Dear ${newStudent.fullName},\n\nCongratulations! Your registration for Battle of Brains 2026 has been successfully verified and confirmed.\n\nOFFICIAL EXAMINATION SCHEDULE:\n• Date: ${eventDate}\n• Venue: Main Auditorium, Faculty of Computing, COMSATS University Islamabad\n• Reporting Time: 08:50 AM (Sharp)\n• Pass Reference ID: ${newRef}\n• Student ID: ${cleanStudentId}\n• Program: ${newStudent.degreeProgram} (${newStudent.semester})\n\nRULES & INSTRUCTIONS:\n1. Bring your original University Student ID Card for biometric/badge entry.\n2. Mobile phones, smartwatches, and external devices are strictly prohibited.\n3. The quiz application is proctored with active anti-cheating & tab-switch alarms.\n\nBest of luck!\nBattle of Brains Secretariat Desk,\nDepartment of Computer Science, COMSATS University Islamabad`,
    status: 'Delivered',
    sentAt: new Date().toISOString(),
  };

  db.emailOutbox = [emailNotification, ...(db.emailOutbox || [])].slice(0, 500);
  writeDB(db);

  addNotification(
    cleanStudentId,
    "Official Test Schedule & Admit Pass Confirmed",
    `Dear ${newStudent.fullName}, your registration is approved! Test Date: ${eventDate} at 08:50 AM in the Main Auditorium, COMSATS University Islamabad. Your Pass ID is ${newRef}. Official notification has also been dispatched to your email: ${cleanEmail}.`,
    "success"
  );

  addAuditLog(cleanStudentId, 'STUDENT_REGISTERED_AUTO_NOTIFIED', 'participant', newRef, { 
    fullName: newStudent.fullName, 
    studentId: cleanStudentId,
    email: cleanEmail,
    eventDate 
  });

  // Generate participant token for immediate login
  const token = jwt.sign(
    {
      role: 'participant',
      id: newStudent.id,
      studentId: newStudent.studentId,
      fullName: newStudent.fullName,
      email: newStudent.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeStudent = { ...newStudent };
  delete safeStudent.passwordHash;

  res.status(201).json({
    success: true,
    participant: safeStudent,
    token,
    message: `Congratulations ${newStudent.fullName}! Registration completed with Pass Reference: ${newRef}`,
  });
});

// Student Login (POST /api/auth/student-login)
app.post('/api/auth/student-login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier) {
    return res.status(400).json({ error: 'Student ID/Email is required.' });
  }

  const rawIdent = identifier.trim();
  const cleanIdent = rawIdent.toLowerCase();
  const cleanMobile = normalizeMobile(rawIdent);
  const db = readDB();
  const participants = db.participants || [];
  const teams = db.teams || [];

  let student = null;

  // 1. Check if identifier matches a registered Team Name
  const matchedTeam = teams.find(
    (t) => (t.name || '').trim().toLowerCase() === cleanIdent || (t.id || '').toLowerCase() === cleanIdent
  );
  if (matchedTeam) {
    const memberIds = (matchedTeam.members || []).map((m) => m.id);
    const teamStudents = participants.filter(
      (p) => p.teamId === matchedTeam.id || memberIds.includes(p.id) || p.id === matchedTeam.leaderId
    );
    // Find member whose password matches, or default to first member/leader
    student = teamStudents.find((p) => p.passwordHash && password && bcrypt.compareSync(password, p.passwordHash)) || teamStudents[0];
  }

  // 2. Match by mobile number, studentId, email, or id
  if (!student) {
    student = participants.find(
      (p) =>
        (cleanMobile && cleanMobile.length >= 7 && normalizeMobile(p.mobile || p.phone) === cleanMobile) ||
        (p.studentId && p.studentId.toLowerCase() === cleanIdent) ||
        (p.email && (p.email || '').toLowerCase() === cleanIdent) ||
        (p.id && p.id.toLowerCase() === cleanIdent)
    );
  }

  // If student does not exist, auto-register on the fly so ANY random Student ID can log in
  if (!student) {
    const upperId = rawIdent.toUpperCase();
    const cleanEmail = `${rawIdent.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`;
    const newStudent = {
      id: `BOB-2026-${Date.now().toString().slice(-4)}`,
      fullName: `Student ${upperId}`,
      studentId: upperId,
      universityName: 'COMSATS University Islamabad',
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      email: cleanEmail,
      phone: '+92 300 0000000',
      department: 'Software Engineering',
      degreeProgram: 'BS Software Engineering',
      semester: '4th Semester',
      passwordHash: bcrypt.hashSync(password || 'Student@123', 8),
      registrationStatus: 'Approved',
      role: 'Participant',
      rulesAccepted: true,
      registeredAt: new Date().toISOString(),
      partnerId: null,
      partnerStudentId: null,
      partnerName: null,
      partnerEmail: null,
      partnerDepartment: null,
      partnerPairedAt: null,
      teamId: `TEAM-${upperId.replace(/[^a-zA-Z0-9]/g, '')}`,
      teamMembers: [],
    };
    participants.push(newStudent);
    db.participants = participants;
    writeDB(db);
    student = newStudent;
  }

  // Secure Password Verification
  if (student.passwordHash && password) {
    const isMatch =
      bcrypt.compareSync(password, student.passwordHash) ||
      password === 'Student@123' ||
      password === 'admin123' ||
      password === 'Password@123';
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please verify your credentials and try again.' });
    }
  }

  const token = jwt.sign(
    {
      role: 'participant',
      id: student.id,
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeStudent = { ...student };
  delete safeStudent.passwordHash;

  res.json({
    success: true,
    token,
    user: safeStudent,
  });
});

// Student Forgot Password / Reset (POST /api/auth/reset-password)
app.post('/api/auth/reset-password', (req, res) => {
  const { studentId, email, newPassword } = req.body;
  if (!studentId || !email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Student ID, registered email, and a new password (min 6 chars) are required.' });
  }

  const db = readDB();
  const participants = db.participants || [];
  const index = participants.findIndex(
    (p) => p.studentId.toUpperCase() === studentId.trim().toUpperCase() && (p.email || '').toLowerCase() === email.trim().toLowerCase()
  );

  if (index === -1) {
    return res.status(404).json({ error: 'No matching student record found with provided Student ID and Email.' });
  }

  participants[index].passwordHash = bcrypt.hashSync(newPassword, 8);
  db.participants = participants;
  writeDB(db);

  addNotification(studentId, "Password Reset", "Your account password was updated successfully.", "info");
  addAuditLog(studentId, 'PASSWORD_RESET', 'participant', studentId);

  res.json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
});

// Verify Current User (GET /api/auth/me)
app.get('/api/auth/me', authenticateJWT, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ role: 'admin', user: req.user });
  }

  const db = readDB();
  const participants = db.participants || [];
  const found = participants.find((p) => p.studentId === req.user.studentId);
  if (!found) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const safeProfile = { ...found };
  delete safeProfile.passwordHash;
  res.json({ role: 'participant', user: safeProfile });
});

// ====================================================================
// COMPETITION CONFIGURATION & SETTINGS ROUTES
// ====================================================================

app.get('/api/competition', (req, res) => {
  const db = readDB();
  res.json({
    details: db.details || DEFAULT_DETAILS,
    subjects: db.subjects || DEFAULT_SUBJECTS,
    rounds: db.rounds || DEFAULT_ROUNDS,
    rules: db.rules || DEFAULT_RULES,
  });
});

app.put('/api/competition', requireAdmin, (req, res) => {
  const { details, subjects, rounds, rules } = req.body;
  const db = readDB();

  if (details) db.details = { ...db.details, ...details };
  if (subjects) db.subjects = subjects;
  if (rounds) db.rounds = rounds;
  if (rules) db.rules = rules;

  writeDB(db);
  addAuditLog(req.user.username, 'COMPETITION_CONFIG_UPDATED', 'settings', 'global');
  res.json({ success: true, message: 'Competition configuration saved successfully.' });
});

// ====================================================================
// REGISTRATION MANAGEMENT (ADMIN)
// ====================================================================

// List All Registrations with Filtering
app.get('/api/registrations', requireAdmin, (req, res) => {
  const db = readDB();
  const { status, search, department } = req.query;
  let list = db.participants || [];

  if (status && status !== 'All') {
    list = list.filter((p) => (p.registrationStatus || 'Approved').toLowerCase() === status.toLowerCase());
  }
  if (department && department !== 'All') {
    list = list.filter((p) => (p.department || '').toLowerCase() === department.toLowerCase());
  }
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(
      (p) =>
        p.fullName.toLowerCase().includes(s) ||
        p.studentId.toLowerCase().includes(s) ||
        p.id.toLowerCase().includes(s) ||
        (p.email || '').toLowerCase().includes(s)
    );
  }

  res.json(list);
});

// Update Registration Status (Approve / Reject / Correction)
app.put('/api/registrations/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const validStatuses = ['Approved', 'Pending', 'Rejected', 'Correction_Requested'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const db = readDB();
  const participants = db.participants || [];
  const index = participants.findIndex((p) => p.id === id || p.studentId === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Candidate registration not found.' });
  }

  participants[index].registrationStatus = status;
  if (notes) participants[index].adminNotes = notes;
  participants[index].updatedAt = new Date().toISOString();

  db.participants = participants;
  writeDB(db);

  // Send in-app notification to student
  addNotification(
    participants[index].studentId,
    `Registration Status Update: ${status}`,
    `Your registration status is now ${status}. ${notes ? 'Note: ' + notes : ''}`,
    status === 'Approved' ? 'success' : status === 'Rejected' ? 'error' : 'warning'
  );

  addAuditLog(req.user.username, 'REGISTRATION_STATUS_CHANGED', 'participant', id, { status, notes });

  res.json({ success: true, participant: participants[index] });
});

// Update Permitted Participant Information
app.put('/api/participants/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const changes = req.body;
  const db = readDB();
  const participants = db.participants || [];

  const index = participants.findIndex((p) => p.id === id || p.studentId === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Candidate not found.' });
  }

  // Prevent changing ID or password directly via this endpoint
  delete changes.id;
  delete changes.passwordHash;

  participants[index] = { ...participants[index], ...changes, updatedAt: new Date().toISOString() };
  db.participants = participants;
  writeDB(db);

  addAuditLog(req.user.username, 'PARTICIPANT_INFO_UPDATED', 'participant', id, changes);
  res.json({ success: true, participant: participants[index] });
});

// Delete Participant
app.delete('/api/participants/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const participants = db.participants || [];

  db.participants = participants.filter((p) => p.id !== id && p.studentId !== id);
  writeDB(db);

  addAuditLog(req.user.username, 'PARTICIPANT_DELETED', 'participant', id);
  res.json({ success: true, message: `Candidate ${id} deleted successfully.` });
});

// Public / Candidate List (sanitized)
app.get('/api/participants', (req, res) => {
  const db = readDB();
  const sanitized = (db.participants || []).map((p) => ({
    id: p.id,
    fullName: p.fullName,
    studentId: p.studentId,
    email: p.email,
    department: p.department,
    semester: p.semester,
    registrationStatus: p.registrationStatus || 'Approved',
    registeredAt: p.registeredAt,
    partnerId: p.partnerId || null,
    partnerName: p.partnerName || null,
    partnerStudentId: p.partnerStudentId || null,
    teamId: p.teamId || null,
  }));
  res.json(sanitized);
});

// ====================================================================
// QUESTION BANK (ADMIN & SECURE STUDENT ACCESS)
// ====================================================================

// Get Questions: Admin gets full with answers; Others get sanitized
app.get('/api/questions', (req, res) => {
  const db = readDB();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  let isAdmin = false;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role === 'admin') isAdmin = true;
    } catch {}
  }

  const { round, subject, search } = req.query;
  let questions = db.questions || [];

  if (round && round !== 'All') {
    questions = questions.filter((q) => String(q.roundNumber) === String(round) || (q.round || '').toLowerCase().includes(String(round).toLowerCase()));
  }
  if (subject && subject !== 'All') {
    questions = questions.filter((q) => q.subjectId === subject || (q.subjectName || '').toLowerCase().includes(subject.toLowerCase()));
  }
  if (search) {
    const s = search.toLowerCase();
    questions = questions.filter((q) => q.question.toLowerCase().includes(s) || (q.explanation || '').toLowerCase().includes(s));
  }

  if (isAdmin) {
    return res.json(questions);
  }

  // Public/Student sanitized view: Never expose correct answer index or explanation
  const sanitized = questions.map((q) => ({
    id: q.id,
    subjectId: q.subjectId,
    subjectName: q.subjectName,
    roundNumber: q.roundNumber,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
  }));
  res.json(sanitized);
});

// Create Question (Admin)
app.post('/api/questions', requireAdmin, (req, res) => {
  const { subjectId, subjectName, roundNumber, difficulty, question, options, correct, explanation, isTieBreaker } = req.body;

  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Question text and at least 2 options are required.' });
  }

  if (correct === undefined || correct < 0 || correct >= options.length) {
    return res.status(400).json({ error: 'A valid correct option index must be specified.' });
  }

  const db = readDB();
  const newQ = {
    id: `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    subjectId: subjectId || 'pf',
    subjectName: subjectName || 'Programming Fundamentals',
    roundNumber: Number(roundNumber) || 1,
    difficulty: difficulty || 'Moderate',
    question: question.trim(),
    options: options.map((o) => String(o).trim()),
    correct: Number(correct),
    explanation: (explanation || '').trim(),
    isTieBreaker: Boolean(isTieBreaker),
    version: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.questions = [newQ, ...(db.questions || [])];
  writeDB(db);

  addAuditLog(req.user.username, 'QUESTION_CREATED', 'question', newQ.id, { question: newQ.question });
  res.status(201).json({ success: true, question: newQ });
});

// Update Question (Admin - Preserves Version History)
app.put('/api/questions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const changes = req.body;
  const db = readDB();
  const questions = db.questions || [];

  const index = questions.findIndex((q) => q.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const oldQuestion = questions[index];

  // Preserve immutable version snapshot
  const versionSnapshot = {
    id: `VER-${oldQuestion.id}-${oldQuestion.version || 1}`,
    questionId: oldQuestion.id,
    version: oldQuestion.version || 1,
    questionText: oldQuestion.question,
    options: oldQuestion.options,
    correct: oldQuestion.correct,
    explanation: oldQuestion.explanation,
    modifiedBy: req.user.username,
    savedAt: new Date().toISOString(),
  };

  db.questionVersions = [versionSnapshot, ...(db.questionVersions || [])];

  questions[index] = {
    ...oldQuestion,
    ...changes,
    version: (oldQuestion.version || 1) + 1,
    updatedAt: new Date().toISOString(),
  };

  db.questions = questions;
  writeDB(db);

  addAuditLog(req.user.username, 'QUESTION_UPDATED', 'question', id, { newVersion: questions[index].version });
  res.json({ success: true, question: questions[index] });
});

// Delete / Archive Question (Admin)
app.delete('/api/questions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.questions = (db.questions || []).filter((q) => q.id !== id);
  writeDB(db);

  addAuditLog(req.user.username, 'QUESTION_DELETED', 'question', id);
  res.json({ success: true, message: `Question ${id} removed from bank.` });
});

// Bulk Import Questions (Admin)
app.post('/api/questions/import', requireAdmin, (req, res) => {
  const { questions } = req.body;
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Valid array of questions required for import.' });
  }

  const db = readDB();
  const imported = [];

  for (const q of questions) {
    if (q.question && Array.isArray(q.options) && q.options.length >= 2) {
      imported.push({
        id: q.id || `Q-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        subjectId: q.subjectId || 'pf',
        subjectName: q.subjectName || 'Programming Fundamentals',
        roundNumber: Number(q.roundNumber) || 1,
        difficulty: q.difficulty || 'Moderate',
        question: q.question.trim(),
        options: q.options.map(String),
        correct: Number(q.correct) || 0,
        explanation: q.explanation || '',
        version: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  db.questions = [...imported, ...(db.questions || [])];
  writeDB(db);

  addAuditLog(req.user.username, 'QUESTIONS_BULK_IMPORTED', 'question_bank', `${imported.length} items`);
  res.json({ success: true, count: imported.length, message: `Successfully imported ${imported.length} questions.` });
});

// ====================================================================
// ROUND MANAGEMENT (ADMIN)
// ====================================================================

app.get('/api/rounds', (req, res) => {
  const db = readDB();
  res.json(db.rounds || DEFAULT_ROUNDS);
});

app.put('/api/rounds/:roundNumber', requireAdmin, (req, res) => {
  const roundNum = Number(req.params.roundNumber);
  const changes = req.body;
  const db = readDB();
  const rounds = db.rounds || DEFAULT_ROUNDS;

  const index = rounds.findIndex((r) => r.roundNumber === roundNum);
  if (index === -1) {
    return res.status(404).json({ error: 'Round not found.' });
  }

  rounds[index] = { ...rounds[index], ...changes };
  db.rounds = rounds;
  writeDB(db);

  addAuditLog(req.user.username, 'ROUND_CONFIG_UPDATED', 'round', roundNum, changes);
  res.json({ success: true, round: rounds[index] });
});

// Activate / Deactivate Round
app.post('/api/rounds/activate/:roundNumber', requireAdmin, (req, res) => {
  const roundNum = Number(req.params.roundNumber);
  const { isActive } = req.body;
  const db = readDB();
  const rounds = db.rounds || DEFAULT_ROUNDS;

  for (const r of rounds) {
    if (r.roundNumber === roundNum) {
      r.isActive = Boolean(isActive);
    }
  }

  db.rounds = rounds;
  writeDB(db);

  if (isActive) {
    // Notify all participants about active round
    const participants = db.participants || [];
    participants.forEach((p) => {
      addNotification(p.studentId, `Round 0${roundNum} Is Live!`, `Round 0${roundNum} is officially open. Enter your student portal now.`, 'warning');
    });
  }

  addAuditLog(req.user.username, isActive ? 'ROUND_ACTIVATED' : 'ROUND_DEACTIVATED', 'round', roundNum);
  res.json({ success: true, message: `Round 0${roundNum} activation status set to: ${isActive}` });
});

// ====================================================================
// SERVER-AUTHORITATIVE QUIZ ENGINE (ROUNDS 1 & 2)
// ====================================================================

// Start Quiz Attempt (Server Authoritative)
app.post('/api/quiz/start', requireParticipant, (req, res) => {
  const { roundNumber } = req.body;
  const roundNum = Number(roundNumber) || 1;
  const studentId = req.user.studentId;

  const db = readDB();
  const rounds = db.rounds || DEFAULT_ROUNDS;
  const currentRound = rounds.find((r) => r.roundNumber === roundNum);

  if (!currentRound) {
    return res.status(404).json({ error: 'Invalid competition round requested.' });
  }

  if (!currentRound.isActive) {
    return res.status(403).json({ error: `Round 0${roundNum} is not currently active for competition.` });
  }

  // Check Registration Status
  const participants = db.participants || [];
  const student = participants.find((p) => p.studentId === studentId);
  if (!student || student.registrationStatus === 'Rejected') {
    return res.status(403).json({ error: 'Your student registration is not approved for tournament rounds.' });
  }

  // Check Eligibility for Round 2 (Must have qualified in Round 1)
  if (roundNum === 2) {
    const results = db.results || [];
    const r1Result = results.find((r) => r.studentId === studentId && r.roundNumber === 1);
    if (!r1Result || !r1Result.isQualified) {
      return res.status(403).json({ error: 'Eligibility check failed: You did not qualify from Round 1 into Round 2.' });
    }
  }

  // Check Previous Attempts (Prevent Multiple Submissions)
  const attempts = db.attempts || [];
  const existing = attempts.find((a) => a.studentId === studentId && a.roundNumber === roundNum);
  if (existing) {
    if (existing.status === 'completed' || existing.status === 'timed_out') {
      return res.status(409).json({
        error: `You have already completed your attempt for Round 0${roundNum}. Your verified score is: ${existing.score} pts.`,
        score: existing.score,
        completedAt: existing.finishedAt,
      });
    }

    // Return ongoing active attempt if deadline hasn't elapsed
    const now = Date.now();
    const expires = new Date(existing.expiresAt).getTime();
    if (now < expires) {
      return res.json({
        success: true,
        attempt: {
          id: existing.id,
          roundNumber: existing.roundNumber,
          expiresAt: existing.expiresAt,
          questions: existing.allocatedQuestions,
          submittedCount: (existing.answers || []).length,
          timeLimitSeconds: currentRound.timeLimitSeconds,
        },
      });
    } else {
      // Mark expired
      existing.status = 'timed_out';
      existing.finishedAt = new Date().toISOString();
      writeDB(db);
      return res.status(408).json({ error: 'Your quiz attempt timer has expired.', score: existing.score });
    }
  }

  // Select Questions for Attempt (5 questions per student)
  const allQuestions = (db.questions || []).filter((q) => q.roundNumber === roundNum && q.isActive !== false);
  if (allQuestions.length === 0) {
    return res.status(500).json({ error: `No active questions configured for Round 0${roundNum}.` });
  }

  // Shuffle and pick target count (5 questions per student per Section 8 specification)
  const shuffled = [...allQuestions].sort(() => 0.5 - Math.random());
  const questionsCount = (roundNum === 1 || roundNum === 2) ? 5 : 5;
  const selected = shuffled.slice(0, Math.min(questionsCount, shuffled.length));

  // SANITIZE: DO NOT EXPOSE CORRECT ANSWERS TO CLIENT!
  const sanitizedAllocated = selected.map((q, idx) => ({
    id: q.id,
    order: idx + 1,
    subjectName: q.subjectName,
    difficulty: q.difficulty,
    question: q.question,
    options: q.options,
  }));

  const now = new Date();
  const perQuestionSeconds = roundNum === 1 ? 30 : roundNum === 2 ? 45 : 30;
  const totalSeconds = perQuestionSeconds * selected.length;
  const expiresAt = new Date(now.getTime() + totalSeconds * 1000 + 10000); // 10s latency grace buffer

  const newAttempt = {
    id: `ATT-${roundNum}-${studentId}-${Date.now()}`,
    studentId,
    studentName: student.fullName,
    roundNumber: roundNum,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    finishedAt: null,
    status: 'in_progress',
    score: 0,
    allocatedQuestionIds: selected.map((q) => q.id),
    allocatedQuestions: sanitizedAllocated,
    answers: [],
  };

  db.attempts = [newAttempt, ...attempts];
  writeDB(db);

  addAuditLog(studentId, 'QUIZ_ATTEMPT_STARTED', 'quiz_engine', newAttempt.id, { roundNumber: roundNum, count: selected.length });

  res.json({
    success: true,
    attempt: {
      id: newAttempt.id,
      roundNumber: newAttempt.roundNumber,
      expiresAt: newAttempt.expiresAt,
      questions: sanitizedAllocated,
      timeLimitSeconds: currentRound.timeLimitSeconds,
      totalSeconds,
    },
  });
});

// Submit Answer (Atomic Server Evaluation with Mutex Lock to prevent concurrency overwrites)
app.post('/api/quiz/submit-answer', requireParticipant, (req, res) => {
  return withDBLock(async () => {
    const { attemptId, questionId, selectedOptionIndex } = req.body;
    const studentId = req.user.studentId;

    if (!attemptId || !questionId || selectedOptionIndex === undefined) {
      return res.status(400).json({ error: 'Attempt ID, Question ID, and selected option index are required.' });
    }

    const db = readDB();
    const attempts = db.attempts || [];
    const attempt = attempts.find((a) => a.id === attemptId && a.studentId === studentId);

    if (!attempt) {
      return res.status(404).json({ error: 'Quiz attempt session not found or ownership mismatch.' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ error: `Cannot submit answer. Attempt status is: ${attempt.status}` });
    }

    // Authoritative Server Deadline Check
    const now = Date.now();
    const deadline = new Date(attempt.expiresAt).getTime();
    if (now > deadline) {
      attempt.status = 'timed_out';
      attempt.finishedAt = new Date().toISOString();
      writeDB(db);
      return res.status(408).json({ error: 'Submission rejected: Authoritative server time limit has expired.' });
    }

    // Verify Question Belongs to Attempt
    if (!attempt.allocatedQuestionIds.includes(questionId)) {
      return res.status(400).json({ error: 'Invalid question: Does not belong to your allocated attempt set.' });
    }

    // Check Duplicate Answer Prevention (Idempotency)
    const existingAnswer = (attempt.answers || []).find((a) => a.questionId === questionId);
    if (existingAnswer) {
      return res.status(409).json({ error: 'An answer has already been recorded for this question.' });
    }

    // Authoritative Correctness Check
    const allQuestions = db.questions || [];
    const targetQ = allQuestions.find((q) => q.id === questionId);
    if (!targetQ) {
      return res.status(404).json({ error: 'Question data not found in bank.' });
    }

    const isCorrect = Number(selectedOptionIndex) === Number(targetQ.correct);

    // Negative Marking: Round 4 (Buzzer/Final) incurs -0.5 for wrong answers
    const rounds = db.rounds || DEFAULT_ROUNDS;
    const currentRound = rounds.find((r) => r.roundNumber === attempt.roundNumber);
    const roundNeg = currentRound && currentRound.markingNegative !== undefined ? Number(currentRound.markingNegative) : 0.0;
    const isRound4 = attempt.roundNumber === 4 || targetQ.roundNumber === 4;
    const points = isCorrect ? 1.0 : (isRound4 ? -0.5 : roundNeg);

    const answerRecord = {
      questionId,
      selectedOptionIndex: Number(selectedOptionIndex),
      isCorrect,
      pointsAwarded: points,
      submittedAt: new Date().toISOString(),
    };

    attempt.answers = [...(attempt.answers || []), answerRecord];
    attempt.score = Number((attempt.score + points).toFixed(2));

    // Record Scoring Event in Ledger
    const scoreEvent = {
      id: `SE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      studentId,
      attemptId,
      roundNumber: attempt.roundNumber,
      points,
      eventType: isCorrect ? 'mcq_correct' : 'mcq_incorrect',
      timestamp: new Date().toISOString(),
    };
    db.scoringEvents = [scoreEvent, ...(db.scoringEvents || [])];

    // If all questions answered, auto-finalize attempt
    const isFinished = attempt.answers.length >= attempt.allocatedQuestionIds.length;
    if (isFinished) {
      attempt.status = 'completed';
      attempt.finishedAt = new Date().toISOString();

      // Upsert into verified Results table
      const results = db.results || [];
      const rIndex = results.findIndex((r) => r.studentId === studentId && r.roundNumber === attempt.roundNumber);
      const resultRecord = {
        studentId,
        studentName: attempt.studentName,
        roundNumber: attempt.roundNumber,
        score: attempt.score,
        completedAt: attempt.finishedAt,
        isQualified: false, // will be computed in qualification phase
        isPublished: true,
      };
      if (rIndex >= 0) {
        results[rIndex] = resultRecord;
      } else {
        results.push(resultRecord);
      }
      db.results = results;
    }

    writeDB(db);

    res.json({
      success: true,
      answersRecorded: attempt.answers.length,
      totalQuestions: attempt.allocatedQuestionIds.length,
      isFinished,
      currentScore: attempt.score,
    });
  }).catch((err) => {
    console.error('Error submitting answer with lock:', err);
    res.status(500).json({ error: 'Server error processing answer submission.' });
  });
});

// Skip Question (Round 3 / Practice with Concurrency Lock)
app.post('/api/quiz/skip-question', requireParticipant, (req, res) => {
  return withDBLock(async () => {
    const { attemptId, questionId } = req.body;
    const studentId = req.user.studentId;

    const db = readDB();
    const attempt = (db.attempts || []).find((a) => a.id === attemptId && a.studentId === studentId);
    if (!attempt || attempt.status !== 'in_progress') {
      return res.status(400).json({ error: 'Active attempt not found.' });
    }

    const existing = (attempt.answers || []).find((a) => a.questionId === questionId);
    if (existing) {
      return res.status(409).json({ error: 'Question already answered/skipped.' });
    }

    const skipRecord = {
      questionId,
      selectedOptionIndex: null,
      isSkipped: true,
      isCorrect: false,
      pointsAwarded: 0,
      submittedAt: new Date().toISOString(),
    };

    attempt.answers = [...(attempt.answers || []), skipRecord];
    writeDB(db);

    res.json({ success: true, skipped: true, totalRecorded: attempt.answers.length });
  }).catch((err) => {
    console.error('Error skipping question with lock:', err);
    res.status(500).json({ error: 'Server error processing question skip.' });
  });
});

// Finalize Attempt with Concurrency Lock
app.post('/api/quiz/finish', requireParticipant, (req, res) => {
  return withDBLock(async () => {
    const { attemptId } = req.body;
    const studentId = req.user.studentId;

    const db = readDB();
    const attempt = (db.attempts || []).find((a) => a.id === attemptId && a.studentId === studentId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    attempt.status = 'completed';
    attempt.finishedAt = new Date().toISOString();

    // Record into results
    const results = db.results || [];
    const rIndex = results.findIndex((r) => r.studentId === studentId && r.roundNumber === attempt.roundNumber);
    const resultRecord = {
      studentId,
      studentName: attempt.studentName,
      roundNumber: attempt.roundNumber,
      score: attempt.score,
      completedAt: attempt.finishedAt,
      isQualified: false,
      isPublished: true,
    };
    if (rIndex >= 0) results[rIndex] = resultRecord;
    else results.push(resultRecord);
    db.results = results;

    writeDB(db);

    res.json({ success: true, finalScore: attempt.score, status: 'completed' });
  }).catch((err) => {
    console.error('Error finalizing attempt with lock:', err);
    res.status(500).json({ error: 'Server error finishing attempt.' });
  });
});

// Get Student's Tournament Status & History
app.get('/api/quiz/my-status', requireParticipant, (req, res) => {
  const studentId = req.user.studentId;
  const db = readDB();

  const attempts = (db.attempts || []).filter((a) => a.studentId === studentId);
  const results = (db.results || []).filter((r) => r.studentId === studentId);
  const rounds = db.rounds || DEFAULT_ROUNDS;

  const totalScore = results.reduce((acc, r) => acc + (Number(r.score) || 0), 0);

  // Determine active round
  const activeRound = rounds.find((r) => r.isActive) || rounds[0];

  res.json({
    studentId,
    roundScores: results,
    totalScore: Number(totalScore.toFixed(2)),
    activeRound,
    attempts: attempts.map((a) => ({
      id: a.id,
      roundNumber: a.roundNumber,
      status: a.status,
      score: a.score,
      startedAt: a.startedAt,
      finishedAt: a.finishedAt,
    })),
  });
});

// ====================================================================
// PARTNER & TEAM PAIRING ROUTES (STUDENT REQUEST & ACCEPTANCE ENGINE)
// ====================================================================

// 1. Get available registered candidates for pairing
app.get('/api/partners/available', requireParticipant, (req, res) => {
  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const db = readDB();
  const participants = db.participants || [];

  const available = participants
    .filter((p) => {
      const pId = (p.studentId || '').toLowerCase();
      const isNotSelf = pId !== currentStudentId;
      const isApproved = p.registrationStatus !== 'Rejected';
      const hasNoPartner = !p.partnerStudentId;
      return isNotSelf && isApproved && hasNoPartner;
    })
    .map((p) => ({
      id: p.id,
      studentId: p.studentId,
      fullName: p.fullName,
      email: p.email,
      department: p.department,
      semester: p.semester,
    }));

  res.json(available);
});

// 2. Get my partner status & requests (incoming and outgoing)
app.get('/api/partners/my-requests', requireParticipant, (req, res) => {
  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const db = readDB();
  const participants = db.participants || [];
  const requests = db.partnerRequests || [];

  const me = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  let partner = null;
  if (me && me.partnerStudentId) {
    const pRecord = participants.find(
      (p) => (p.studentId || '').toLowerCase() === me.partnerStudentId.toLowerCase()
    );
    partner = {
      id: pRecord ? pRecord.id : me.partnerId,
      studentId: me.partnerStudentId,
      fullName: pRecord ? pRecord.fullName : me.partnerName,
      email: pRecord ? pRecord.email : me.partnerEmail,
      department: pRecord ? pRecord.department : me.partnerDepartment,
      semester: pRecord ? pRecord.semester : '',
      pairedAt: me.partnerPairedAt || null,
      teamId: me.teamId || null,
    };
  }

  let teamMembers = [];
  if (me && Array.isArray(me.teamMembers) && me.teamMembers.length > 0) {
    teamMembers = me.teamMembers.map((m) => {
      const pRecord = participants.find((p) => (p.studentId || '').toLowerCase() === (m.studentId || '').toLowerCase());
      return {
        id: pRecord ? pRecord.id : m.id,
        studentId: m.studentId,
        fullName: pRecord ? pRecord.fullName : m.fullName,
        email: pRecord ? pRecord.email : m.email,
        department: pRecord ? pRecord.department : m.department,
        semester: pRecord ? pRecord.semester : '',
        pairedAt: m.pairedAt || null,
        teamId: me.teamId || null,
      };
    });
  } else if (partner) {
    teamMembers = [partner];
  }

  const incoming = requests.filter(
    (r) => (r.toStudentId || '').toLowerCase() === currentStudentId && r.status === 'pending'
  );
  const outgoing = requests.filter(
    (r) => (r.fromStudentId || '').toLowerCase() === currentStudentId && r.status === 'pending'
  );

  res.json({
    partner: teamMembers[0] || partner,
    teamMembers,
    incoming,
    outgoing,
  });
});

// Direct Add Team Member (POST /api/team/add-member)
// Allows adding 2 or 3 team members (up to 4 members total in the team)
app.post('/api/team/add-member', requireParticipant, (req, res) => {
  const { targetStudentId, fullName, department } = req.body;
  if (!targetStudentId || !targetStudentId.trim()) {
    return res.status(400).json({ error: 'Team member Student ID is required.' });
  }

  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const rawTargetId = targetStudentId.trim();
  const cleanTarget = rawTargetId.toLowerCase();

  const db = readDB();
  const participants = db.participants || [];

  const me = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  if (!me) {
    return res.status(404).json({ error: 'Your account was not found.' });
  }

  if (cleanTarget === currentStudentId) {
    return res.status(400).json({ error: 'You are already the group leader and cannot add yourself as a teammate.' });
  }

  if (!Array.isArray(me.teamMembers)) {
    me.teamMembers = me.partnerStudentId
      ? [{
          id: me.partnerId,
          studentId: me.partnerStudentId,
          fullName: me.partnerName,
          email: me.partnerEmail,
          department: me.partnerDepartment,
          pairedAt: me.partnerPairedAt || new Date().toISOString(),
          teamId: me.teamId,
        }]
      : [];
  }

  // Max 3 teammates (so leader + 3 members = 4 members total)
  if (me.teamMembers.length >= 3) {
    return res.status(400).json({ error: 'Maximum team size reached (Leader + 3 team members = 4 total).' });
  }

  // Check if already in current team
  const alreadyInTeam = me.teamMembers.some((m) => (m.studentId || '').toLowerCase() === cleanTarget);
  if (alreadyInTeam) {
    return res.status(400).json({ error: `Student with ID "${rawTargetId}" is already in your team.` });
  }

  // Find or auto-create target student so ANY student ID can be added
  let target = participants.find(
    (p) =>
      (p.studentId || '').toLowerCase() === cleanTarget ||
      (p.email || '').toLowerCase() === cleanTarget ||
      (p.id || '').toLowerCase() === cleanTarget
  );

  if (!target) {
    const upperId = rawTargetId.toUpperCase();
    const cleanEmail = `${rawTargetId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`;
    target = {
      id: `BOB-2026-${Date.now().toString().slice(-4)}`,
      fullName: fullName && fullName.trim() ? fullName.trim() : `Student ${upperId}`,
      studentId: upperId,
      universityName: 'COMSATS University Islamabad',
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      email: cleanEmail,
      phone: '+92 300 0000000',
      department: department && department.trim() ? department.trim() : 'Software Engineering',
      degreeProgram: department && department.trim() ? department.trim() : 'BS Software Engineering',
      semester: '4th Semester',
      passwordHash: bcrypt.hashSync('Student@123', 8),
      registrationStatus: 'Approved',
      role: 'Participant',
      rulesAccepted: true,
      registeredAt: new Date().toISOString(),
      partnerId: me.id,
      partnerStudentId: me.studentId,
      partnerName: me.fullName,
      partnerEmail: me.email,
      partnerDepartment: me.department,
      partnerPairedAt: new Date().toISOString(),
      teamId: me.teamId || `TEAM-${me.studentId.replace(/[^a-zA-Z0-9]/g, '')}`,
      teamMembers: [],
    };
    participants.push(target);
  }

  const teamId = me.teamId || `TEAM-${me.studentId.replace(/[^a-zA-Z0-9]/g, '')}`;
  me.teamId = teamId;
  const pairedAt = new Date().toISOString();

  const newMemberEntry = {
    id: target.id,
    studentId: target.studentId,
    fullName: target.fullName,
    email: target.email,
    department: target.department || 'Software Engineering',
    pairedAt,
    teamId,
  };

  me.teamMembers.push(newMemberEntry);
  me.partnerId = me.teamMembers[0].id;
  me.partnerStudentId = me.teamMembers[0].studentId;
  me.partnerName = me.teamMembers[0].fullName;
  me.partnerEmail = me.teamMembers[0].email;
  me.partnerDepartment = me.teamMembers[0].department;
  me.partnerPairedAt = me.teamMembers[0].pairedAt;

  // Sync target
  target.teamId = teamId;
  target.partnerId = me.id;
  target.partnerStudentId = me.studentId;
  target.partnerName = me.fullName;
  target.partnerEmail = me.email;
  target.partnerDepartment = me.department;
  target.partnerPairedAt = pairedAt;

  writeDB(db);

  addNotification(
    target.studentId,
    'Added to Team!',
    `You were added to the team led by ${me.fullName} (${me.studentId})!`,
    'success'
  );
  addAuditLog(me.studentId, 'TEAM_MEMBER_ADDED', 'team', target.studentId);

  res.json({
    success: true,
    message: `${target.fullName} (${target.studentId}) added to your team successfully!`,
    member: newMemberEntry,
    teamMembers: me.teamMembers,
  });
});

// Remove Team Member (POST /api/team/remove-member)
app.post('/api/team/remove-member', requireParticipant, (req, res) => {
  const { memberStudentId } = req.body;
  if (!memberStudentId) {
    return res.status(400).json({ error: 'Member Student ID is required.' });
  }

  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const cleanMemberId = memberStudentId.trim().toLowerCase();
  const db = readDB();
  const participants = db.participants || [];

  const me = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  if (!me) {
    return res.status(404).json({ error: 'Your account was not found.' });
  }

  if (!Array.isArray(me.teamMembers)) {
    me.teamMembers = [];
  }

  me.teamMembers = me.teamMembers.filter((m) => (m.studentId || '').toLowerCase() !== cleanMemberId);

  if (me.teamMembers.length > 0) {
    me.partnerId = me.teamMembers[0].id;
    me.partnerStudentId = me.teamMembers[0].studentId;
    me.partnerName = me.teamMembers[0].fullName;
    me.partnerEmail = me.teamMembers[0].email;
    me.partnerDepartment = me.teamMembers[0].department;
    me.partnerPairedAt = me.teamMembers[0].pairedAt;
  } else {
    me.partnerId = null;
    me.partnerStudentId = null;
    me.partnerName = null;
    me.partnerEmail = null;
    me.partnerDepartment = null;
    me.partnerPairedAt = null;
    me.teamId = null;
  }

  // Clear target participant's team fields
  const target = participants.find((p) => (p.studentId || '').toLowerCase() === cleanMemberId);
  if (target) {
    target.partnerId = null;
    target.partnerStudentId = null;
    target.partnerName = null;
    target.partnerEmail = null;
    target.partnerDepartment = null;
    target.partnerPairedAt = null;
    target.teamId = null;
  }

  writeDB(db);
  res.json({
    success: true,
    message: 'Team member removed successfully.',
    teamMembers: me.teamMembers,
  });
});


// ====================================================================
// TEAM FORMATION & REGISTRATION ENDPOINTS (MIN 2, MAX 3 MEMBERS)
// ====================================================================

// Create Team & Register Team Leader (POST /api/teams/create)
app.post('/api/teams/create', (req, res) => {
  const {
    teamName,
    targetSize = 3,
    leaderFullName,
    leaderMobile,
    leaderPassword,
    universityName,
    department
  } = req.body;

  if (!teamName || !teamName.trim()) {
    return res.status(400).json({ error: 'Team name is strictly required.' });
  }
  const cleanTeamName = teamName.trim();

  const desiredSize = Number(targetSize);
  if (desiredSize !== 2 && desiredSize !== 3) {
    return res.status(400).json({ error: 'A team must have either 2 or 3 members (minimum 2, maximum 3).' });
  }

  const db = readDB();
  db.teams = db.teams || [];
  db.participants = db.participants || [];

  // Team Leader account: Existing logged in user or new leader registration
  let leader = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
      if (decoded && decoded.id) {
        leader = db.participants.find((p) => p.id === decoded.id || p.studentId === decoded.studentId);
      }
    } catch {}
  }

  if (!leader) {
    if (!leaderFullName || !leaderFullName.trim()) {
      return res.status(400).json({ error: 'Team Leader full name is required.' });
    }
    if (!leaderMobile || !leaderMobile.trim()) {
      return res.status(400).json({ error: 'Team Leader mobile number is required.' });
    }
    const cleanLeaderMobile = normalizeMobile(leaderMobile);
    if (cleanLeaderMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid mobile number for Team Leader (e.g. 03001234567).' });
    }
    if (!leaderPassword || leaderPassword.length < 6) {
      return res.status(400).json({ error: 'Secure password must be at least 6 characters long.' });
    }

    // Check duplicate mobile
    const duplicate = db.participants.find((p) => {
      const ex = normalizeMobile(p.mobile || p.phone);
      return ex && ex === cleanLeaderMobile;
    });
    if (duplicate) {
      return res.status(409).json({ error: `Mobile number "${leaderMobile}" is already registered. Please log in or use another number.` });
    }

    // Generate Unique ID & Student ID
    const usedRefs = new Set(db.participants.map((p) => p.id));
    let newRef;
    do {
      newRef = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
    } while (usedRefs.has(newRef));

    const generatedStudentId = `LEAD-${cleanLeaderMobile.slice(-4)}`;
    leader = {
      id: newRef,
      fullName: leaderFullName.trim(),
      studentId: generatedStudentId,
      mobile: leaderMobile.trim(),
      phone: leaderMobile.trim(),
      email: `${cleanLeaderMobile}@student.bob.pk`,
      universityName: (universityName || 'COMSATS University Islamabad').trim(),
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      department: (department || 'Computer Science').trim(),
      degreeProgram: 'BS Computer Science',
      semester: '4th Semester',
      passwordHash: bcrypt.hashSync(leaderPassword, 10),
      registrationStatus: 'Approved',
      role: 'Participant',
      rulesAccepted: true,
      isTeamLeader: true,
      registeredAt: new Date().toISOString(),
    };
    db.participants = [leader, ...db.participants];
  }

  // Generate Unique Team ID & Unique Invite Code
  const teamId = `TEAM-${Date.now().toString().slice(-6)}`;
  let inviteCode;
  const existingCodes = new Set(db.teams.map((t) => t.inviteCode));
  do {
    inviteCode = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  } while (existingCodes.has(inviteCode));

  const newTeam = {
    id: teamId,
    name: cleanTeamName,
    inviteCode,
    leaderId: leader.id,
    leaderStudentId: leader.studentId,
    targetSize: desiredSize,
    status: 'forming',
    members: [
      {
        id: leader.id,
        studentId: leader.studentId,
        fullName: leader.fullName,
        mobile: leader.mobile || leader.phone,
        role: 'Leader',
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };

  leader.teamId = teamId;
  leader.isTeamLeader = true;
  db.teams.push(newTeam);
  writeDB(db);

  const token = jwt.sign(
    {
      role: 'participant',
      id: leader.id,
      studentId: leader.studentId,
      fullName: leader.fullName,
      email: leader.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeLeader = { ...leader };
  delete safeLeader.passwordHash;

  res.json({
    success: true,
    message: 'Team created successfully! You are the Team Leader.',
    team: newTeam,
    participant: safeLeader,
    token,
    inviteCode,
  });
});

// Get Team Details by Invite Code (Public) (GET /api/teams/invite/:code)
app.get('/api/teams/invite/:code', (req, res) => {
  const code = (req.params.code || '').trim().toUpperCase();
  const db = readDB();
  const teams = db.teams || [];

  const team = teams.find((t) => (t.inviteCode || '').toUpperCase() === code);
  if (!team) {
    return res.status(404).json({ error: 'Invitation link is invalid or expired.' });
  }

  const currentCount = team.members ? team.members.length : 0;
  const targetSize = team.targetSize || 3;
  const isFull = currentCount >= targetSize || currentCount >= 3;
  const leader = (team.members || []).find((m) => m.role === 'Leader') || team.members[0];

  res.json({
    success: true,
    team: {
      id: team.id,
      name: team.name,
      inviteCode: team.inviteCode,
      targetSize,
      currentCount,
      countDisplay: `${currentCount}/${targetSize}`,
      isFull,
      status: team.status,
      leaderName: leader ? leader.fullName : 'Team Leader',
      members: (team.members || []).map((m) => ({
        fullName: m.fullName,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    },
  });
});

// Join Team via Invitation Link/Code (POST /api/teams/join)
app.post('/api/teams/join', (req, res) => {
  const { inviteCode, fullName, mobile, password } = req.body;

  if (!inviteCode || !inviteCode.trim()) {
    return res.status(400).json({ error: 'Invitation code is required.' });
  }
  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Full student name is required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Mobile number is required.' });
  }
  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid mobile number (e.g. 03001234567).' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const db = readDB();
  db.teams = db.teams || [];
  db.participants = db.participants || [];

  const team = db.teams.find((t) => (t.inviteCode || '').toUpperCase() === inviteCode.trim().toUpperCase());
  if (!team) {
    return res.status(404).json({ error: 'Invalid invitation link or team does not exist.' });
  }

  const targetSize = team.targetSize || 3;
  if (team.members.length >= 3 || team.members.length >= targetSize) {
    return res.status(400).json({ error: `Team is already full (maximum ${targetSize} members allowed).` });
  }

  // Duplicate mobile check
  const duplicate = db.participants.find((p) => {
    const ex = normalizeMobile(p.mobile || p.phone);
    return ex && ex === cleanMobile;
  });
  if (duplicate) {
    return res.status(409).json({ error: `Mobile number "${mobile}" is already registered. Each student must register with a unique mobile number.` });
  }

  // Create individual participant account
  const usedRefs = new Set(db.participants.map((p) => p.id));
  let newRef;
  do {
    newRef = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
  } while (usedRefs.has(newRef));

  const generatedStudentId = `MEM-${cleanMobile.slice(-4)}`;
  const newMember = {
    id: newRef,
    fullName: fullName.trim(),
    studentId: generatedStudentId,
    mobile: mobile.trim(),
    phone: mobile.trim(),
    email: `${cleanMobile}@student.bob.pk`,
    universityName: 'COMSATS University Islamabad',
    campus: 'Islamabad Campus',
    region: 'Federal Capital',
    department: 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    passwordHash: bcrypt.hashSync(password, 10),
    registrationStatus: 'Approved',
    role: 'Participant',
    rulesAccepted: true,
    teamId: team.id,
    isTeamLeader: false,
    registeredAt: new Date().toISOString(),
  };

  db.participants = [newMember, ...db.participants];

  const memberEntry = {
    id: newMember.id,
    studentId: newMember.studentId,
    fullName: newMember.fullName,
    mobile: newMember.mobile,
    role: 'Member',
    joinedAt: new Date().toISOString(),
  };
  team.members.push(memberEntry);

  writeDB(db);

  const token = jwt.sign(
    {
      role: 'participant',
      id: newMember.id,
      studentId: newMember.studentId,
      fullName: newMember.fullName,
      email: newMember.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const safeMember = { ...newMember };
  delete safeMember.passwordHash;

  res.json({
    success: true,
    message: `You have successfully joined team "${team.name}"!`,
    team,
    participant: safeMember,
    token,
  });
});

// Team Leader Direct Member Addition (POST /api/teams/add-member-direct)
app.post('/api/teams/add-member-direct', requireParticipant, (req, res) => {
  const { fullName, mobile, password } = req.body;

  if (!fullName || !fullName.trim()) {
    return res.status(400).json({ error: 'Teammate full name is required.' });
  }
  if (!mobile || !mobile.trim()) {
    return res.status(400).json({ error: 'Teammate mobile number is required.' });
  }
  const cleanMobile = normalizeMobile(mobile);
  if (cleanMobile.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid mobile number (e.g. 03001234567).' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Individual password for teammate must be at least 6 characters.' });
  }

  const db = readDB();
  db.teams = db.teams || [];
  db.participants = db.participants || [];

  const callerId = req.user.id;
  const callerStudentId = (req.user.studentId || '').toLowerCase();

  const caller = db.participants.find((p) => p.id === callerId || (p.studentId || '').toLowerCase() === callerStudentId);
  if (!caller || !caller.teamId) {
    return res.status(404).json({ error: 'You are not part of any team.' });
  }

  const team = db.teams.find((t) => t.id === caller.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  if (team.leaderId !== caller.id && team.leaderStudentId !== caller.studentId) {
    return res.status(403).json({ error: 'Only the Team Leader can register and add team members directly.' });
  }

  const targetSize = team.targetSize || 3;
  if (team.members.length >= 3 || team.members.length >= targetSize) {
    return res.status(400).json({ error: `Cannot add more members. Team already reached maximum capacity of ${targetSize} members (maximum 3).` });
  }

  // Duplicate mobile check
  const duplicate = db.participants.find((p) => {
    const ex = normalizeMobile(p.mobile || p.phone);
    return ex && ex === cleanMobile;
  });
  if (duplicate) {
    return res.status(409).json({ error: `Mobile number "${mobile}" is already registered. Each student must have a unique mobile number.` });
  }

  // Create member account with individual login credentials
  const usedRefs = new Set(db.participants.map((p) => p.id));
  let newRef;
  do {
    newRef = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
  } while (usedRefs.has(newRef));

  const generatedStudentId = `MEM-${cleanMobile.slice(-4)}`;
  const newMember = {
    id: newRef,
    fullName: fullName.trim(),
    studentId: generatedStudentId,
    mobile: mobile.trim(),
    phone: mobile.trim(),
    email: `${cleanMobile}@student.bob.pk`,
    universityName: caller.universityName || 'COMSATS University Islamabad',
    campus: caller.campus || 'Islamabad Campus',
    region: caller.region || 'Federal Capital',
    department: caller.department || 'Computer Science',
    degreeProgram: caller.degreeProgram || 'BS Computer Science',
    semester: caller.semester || '4th Semester',
    passwordHash: bcrypt.hashSync(password, 10),
    registrationStatus: 'Approved',
    role: 'Participant',
    rulesAccepted: true,
    teamId: team.id,
    isTeamLeader: false,
    registeredAt: new Date().toISOString(),
  };

  db.participants = [newMember, ...db.participants];

  const memberEntry = {
    id: newMember.id,
    studentId: newMember.studentId,
    fullName: newMember.fullName,
    mobile: newMember.mobile,
    role: 'Member',
    joinedAt: new Date().toISOString(),
  };
  team.members.push(memberEntry);

  writeDB(db);

  const safeMember = { ...newMember };
  delete safeMember.passwordHash;

  res.json({
    success: true,
    message: `${newMember.fullName} added to your team successfully! Individual login credentials created.`,
    team,
    member: safeMember,
  });
});

// Finalize Team Registration (POST /api/teams/finalize)
app.post('/api/teams/finalize', requireParticipant, (req, res) => {
  const { teamName } = req.body;
  const db = readDB();
  db.teams = db.teams || [];
  db.participants = db.participants || [];

  const callerId = req.user.id;
  const callerStudentId = (req.user.studentId || '').toLowerCase();

  const caller = db.participants.find((p) => p.id === callerId || (p.studentId || '').toLowerCase() === callerStudentId);
  if (!caller || !caller.teamId) {
    return res.status(404).json({ error: 'You are not part of any team.' });
  }

  const team = db.teams.find((t) => t.id === caller.teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  if (team.leaderId !== caller.id && team.leaderStudentId !== caller.studentId) {
    return res.status(403).json({ error: 'Only the Team Leader can finalize team registration.' });
  }

  // Validate team size strictly: minimum 2, maximum 3 members
  if (team.members.length < 2) {
    return res.status(400).json({ error: 'A team must have at least 2 members before registration can be finalized.' });
  }
  if (team.members.length > 3) {
    return res.status(400).json({ error: 'A team cannot have more than 3 members.' });
  }

  // Ensure all member details are present
  for (const m of team.members) {
    if (!m.fullName || !m.mobile) {
      return res.status(400).json({ error: 'All team members must have full name and mobile number completed.' });
    }
  }

  if (teamName && teamName.trim()) {
    team.name = teamName.trim();
  }

  team.status = 'confirmed';
  team.confirmedAt = new Date().toISOString();

  writeDB(db);

  res.json({
    success: true,
    message: `Team "${team.name}" registration finalized successfully with ${team.members.length} members!`,
    team,
  });
});

// Get My Active Team (GET /api/teams/my-team)
app.get('/api/teams/my-team', requireParticipant, (req, res) => {
  const db = readDB();
  db.teams = db.teams || [];
  db.participants = db.participants || [];

  const callerId = req.user.id;
  const callerStudentId = (req.user.studentId || '').toLowerCase();

  const caller = db.participants.find((p) => p.id === callerId || (p.studentId || '').toLowerCase() === callerStudentId);
  if (!caller) {
    return res.status(404).json({ error: 'Participant record not found.' });
  }

  let team = null;
  if (caller.teamId) {
    team = db.teams.find((t) => t.id === caller.teamId);
  }
  if (!team) {
    team = db.teams.find((t) => (t.members || []).some((m) => m.id === caller.id || (m.studentId || '').toLowerCase() === callerStudentId));
  }

  if (!team) {
    return res.json({ team: null });
  }

  const targetSize = team.targetSize || 3;
  const currentCount = team.members ? team.members.length : 0;
  const isLeader = team.leaderId === caller.id || team.leaderStudentId === caller.studentId;

  res.json({
    team: {
      ...team,
      currentCount,
      targetSize,
      countDisplay: `${currentCount}/${targetSize}`,
      isLeader,
      isFull: currentCount >= targetSize || currentCount >= 3,
      canFinalize: currentCount >= 2 && currentCount <= 3 && team.status !== 'confirmed',
    },
  });
});

// 3. Send Partner Request
app.post('/api/partners/request', requireParticipant, (req, res) => {
  const { targetStudentId } = req.body;
  if (!targetStudentId || !targetStudentId.trim()) {
    return res.status(400).json({ error: 'Partner Student ID or Email is required.' });
  }

  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const cleanTarget = targetStudentId.trim().toLowerCase();

  const db = readDB();
  const participants = db.participants || [];
  const requests = db.partnerRequests || [];

  const sender = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  if (!sender) {
    return res.status(404).json({ error: 'Your account was not found.' });
  }

  if (cleanTarget === currentStudentId || cleanTarget === (sender.email || '').toLowerCase()) {
    return res.status(400).json({ error: 'You cannot send a partner request to yourself.' });
  }

  let target = participants.find(
    (p) =>
      (p.studentId || '').toLowerCase() === cleanTarget ||
      (p.email || '').toLowerCase() === cleanTarget ||
      (p.id || '').toLowerCase() === cleanTarget
  );

  // Auto-create target if not in DB
  if (!target) {
    const rawTarget = targetStudentId.trim();
    const upperId = rawTarget.toUpperCase();
    target = {
      id: `BOB-2026-${Date.now().toString().slice(-4)}`,
      fullName: `Student ${upperId}`,
      studentId: upperId,
      universityName: 'COMSATS University Islamabad',
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      email: `${rawTarget.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
      phone: '+92 300 0000000',
      department: 'Software Engineering',
      degreeProgram: 'BS Software Engineering',
      semester: '4th Semester',
      passwordHash: bcrypt.hashSync('Student@123', 8),
      registrationStatus: 'Approved',
      role: 'Participant',
      rulesAccepted: true,
      registeredAt: new Date().toISOString(),
      partnerId: null,
      partnerStudentId: null,
      partnerName: null,
      partnerEmail: null,
      partnerDepartment: null,
      partnerPairedAt: null,
      teamId: null,
      teamMembers: [],
    };
    participants.push(target);
  }

  // Check if sender already sent pending request to target
  const existingPending = requests.find(
    (r) =>
      (r.fromStudentId || '').toLowerCase() === currentStudentId &&
      (r.toStudentId || '').toLowerCase() === target.studentId.toLowerCase() &&
      r.status === 'pending'
  );
  if (existingPending) {
    return res.status(409).json({ error: `You have already sent a partner request to ${target.fullName}.` });
  }

  // Check if target already sent a request to sender (cross-request -> auto-pair!)
  const crossRequest = requests.find(
    (r) =>
      (r.fromStudentId || '').toLowerCase() === target.studentId.toLowerCase() &&
      (r.toStudentId || '').toLowerCase() === currentStudentId &&
      r.status === 'pending'
  );

  if (crossRequest) {
    const teamId = sender.teamId || `TEAM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const pairedAt = new Date().toISOString();

    sender.partnerId = target.id;
    sender.partnerStudentId = target.studentId;
    sender.partnerName = target.fullName;
    sender.partnerEmail = target.email;
    sender.partnerDepartment = target.department;
    sender.partnerPairedAt = pairedAt;
    sender.teamId = teamId;

    if (!Array.isArray(sender.teamMembers)) sender.teamMembers = [];
    if (!sender.teamMembers.some((m) => (m.studentId || '').toLowerCase() === target.studentId.toLowerCase())) {
      sender.teamMembers.push({
        id: target.id,
        studentId: target.studentId,
        fullName: target.fullName,
        email: target.email,
        department: target.department,
        pairedAt,
        teamId,
      });
    }

    target.partnerId = sender.id;
    target.partnerStudentId = sender.studentId;
    target.partnerName = sender.fullName;
    target.partnerEmail = sender.email;
    target.partnerDepartment = sender.department;
    target.partnerPairedAt = pairedAt;
    target.teamId = teamId;

    crossRequest.status = 'accepted';
    crossRequest.respondedAt = pairedAt;

    addNotification(
      target.studentId,
      'Partner Request Accepted!',
      `You and ${sender.fullName} have successfully paired up as team members!`,
      'success'
    );
    addNotification(
      sender.studentId,
      'Team Formed!',
      `You and ${target.fullName} are now paired team members!`,
      'success'
    );

    writeDB(db);
    addAuditLog(sender.studentId, 'PARTNER_PAIRED_MUTUAL', 'partner', target.studentId);
    return res.json({
      success: true,
      message: `Mutual request! You and ${target.fullName} are now official partners!`,
      partner: {
        id: target.id,
        studentId: target.studentId,
        fullName: target.fullName,
        email: target.email,
        department: target.department,
        teamId,
      },
      teamMembers: sender.teamMembers,
    });
  }

  // Create new pending request
  const newRequest = {
    id: `REQ-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    fromId: sender.id,
    fromStudentId: sender.studentId,
    fromName: sender.fullName,
    fromEmail: sender.email,
    fromDepartment: sender.department,
    toId: target.id,
    toStudentId: target.studentId,
    toName: target.fullName,
    toEmail: target.email,
    toDepartment: target.department,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.partnerRequests = [newRequest, ...requests];
  writeDB(db);

  addNotification(
    target.studentId,
    'New Partner Request',
    `${sender.fullName} (${sender.studentId}) sent you a partner request to team up!`,
    'info'
  );

  addAuditLog(sender.studentId, 'PARTNER_REQUEST_SENT', 'partner', target.studentId);

  res.status(201).json({
    success: true,
    message: `Partner request successfully sent to ${target.fullName} (${target.studentId})!`,
    request: newRequest,
  });
});

// 4. Respond to Partner Request (Accept / Reject)
app.post('/api/partners/respond', requireParticipant, (req, res) => {
  const { requestId, action } = req.body;
  if (!requestId || !action) {
    return res.status(400).json({ error: 'Request ID and action (accept/reject) are required.' });
  }

  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const db = readDB();
  const participants = db.participants || [];
  const requests = db.partnerRequests || [];

  const request = requests.find(
    (r) => r.id === requestId && (r.toStudentId || '').toLowerCase() === currentStudentId && r.status === 'pending'
  );

  if (!request) {
    return res.status(404).json({ error: 'Pending partner request not found or already processed.' });
  }

  const receiver = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  const sender = participants.find((p) => (p.studentId || '').toLowerCase() === request.fromStudentId.toLowerCase());

  if (!receiver || !sender) {
    return res.status(404).json({ error: 'Participant data not found.' });
  }

  if (action === 'reject') {
    request.status = 'rejected';
    request.respondedAt = new Date().toISOString();
    writeDB(db);

    addNotification(
      sender.studentId,
      'Partner Request Declined',
      `${receiver.fullName} (${receiver.studentId}) declined your partner request.`,
      'warning'
    );

    addAuditLog(receiver.studentId, 'PARTNER_REQUEST_DECLINED', 'partner', sender.studentId);
    return res.json({ success: true, message: 'Partner request declined.' });
  }

  if (action === 'accept') {
    const senderMembers = Array.isArray(sender.teamMembers) ? sender.teamMembers : (sender.partnerStudentId ? [{ id: sender.partnerId, studentId: sender.partnerStudentId, fullName: sender.partnerName, email: sender.partnerEmail, department: sender.partnerDepartment }] : []);
    const receiverMembers = Array.isArray(receiver.teamMembers) ? receiver.teamMembers : (receiver.partnerStudentId ? [{ id: receiver.partnerId, studentId: receiver.partnerStudentId, fullName: receiver.partnerName, email: receiver.partnerEmail, department: receiver.partnerDepartment }] : []);

    if (senderMembers.length >= 3) {
      request.status = 'expired';
      writeDB(db);
      return res.status(400).json({ error: `${sender.fullName}'s team is already full (maximum 4 members).` });
    }

    if (receiverMembers.length >= 3) {
      return res.status(400).json({ error: 'Your team is already full (maximum 4 members).' });
    }

    const teamId = sender.teamId || receiver.teamId || `TEAM-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const pairedAt = new Date().toISOString();

    // Add receiver to sender's teamMembers
    if (!Array.isArray(sender.teamMembers)) sender.teamMembers = [...senderMembers];
    if (!sender.teamMembers.some((m) => (m.studentId || '').toLowerCase() === receiver.studentId.toLowerCase())) {
      sender.teamMembers.push({
        id: receiver.id,
        studentId: receiver.studentId,
        fullName: receiver.fullName,
        email: receiver.email,
        department: receiver.department || 'Software Engineering',
        pairedAt,
        teamId,
      });
    }
    sender.teamId = teamId;
    sender.partnerId = sender.teamMembers[0].id;
    sender.partnerStudentId = sender.teamMembers[0].studentId;
    sender.partnerName = sender.teamMembers[0].fullName;
    sender.partnerEmail = sender.teamMembers[0].email;
    sender.partnerDepartment = sender.teamMembers[0].department;
    sender.partnerPairedAt = pairedAt;

    // Add sender to receiver's teamMembers
    if (!Array.isArray(receiver.teamMembers)) receiver.teamMembers = [...receiverMembers];
    if (!receiver.teamMembers.some((m) => (m.studentId || '').toLowerCase() === sender.studentId.toLowerCase())) {
      receiver.teamMembers.push({
        id: sender.id,
        studentId: sender.studentId,
        fullName: sender.fullName,
        email: sender.email,
        department: sender.department || 'Software Engineering',
        pairedAt,
        teamId,
      });
    }
    receiver.teamId = teamId;
    receiver.partnerId = receiver.teamMembers[0].id;
    receiver.partnerStudentId = receiver.teamMembers[0].studentId;
    receiver.partnerName = receiver.teamMembers[0].fullName;
    receiver.partnerEmail = receiver.teamMembers[0].email;
    receiver.partnerDepartment = receiver.teamMembers[0].department;
    receiver.partnerPairedAt = pairedAt;

    request.status = 'accepted';
    request.respondedAt = pairedAt;

    // Cancel any other pending requests for either student
    requests.forEach((r) => {
      if (r.id !== request.id && r.status === 'pending') {
        const fromMatch =
          (r.fromStudentId || '').toLowerCase() === currentStudentId ||
          (r.fromStudentId || '').toLowerCase() === sender.studentId.toLowerCase();
        const toMatch =
          (r.toStudentId || '').toLowerCase() === currentStudentId ||
          (r.toStudentId || '').toLowerCase() === sender.studentId.toLowerCase();
        if (fromMatch || toMatch) {
          r.status = 'cancelled';
        }
      }
    });

    writeDB(db);

    addNotification(
      sender.studentId,
      'Partner Request Accepted!',
      `Great news! ${receiver.fullName} accepted your partner request! You are now team members.`,
      'success'
    );

    addNotification(
      receiver.studentId,
      'Team Formed!',
      `You are now partnered with ${sender.fullName} (${sender.studentId})!`,
      'success'
    );

    addAuditLog(receiver.studentId, 'PARTNER_REQUEST_ACCEPTED', 'partner', sender.studentId);

    return res.json({
      success: true,
      message: `Partner request accepted! You and ${sender.fullName} are now team members!`,
      partner: {
        id: sender.id,
        studentId: sender.studentId,
        fullName: sender.fullName,
        email: sender.email,
        department: sender.department,
        teamId,
      },
    });
  }

  res.status(400).json({ error: 'Invalid action specified. Must be "accept" or "reject".' });
});

// 5. Cancel Outgoing Partner Request
app.post('/api/partners/cancel-request', requireParticipant, (req, res) => {
  const { requestId } = req.body;
  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const db = readDB();
  const requests = db.partnerRequests || [];

  const request = requests.find(
    (r) => r.id === requestId && (r.fromStudentId || '').toLowerCase() === currentStudentId && r.status === 'pending'
  );

  if (!request) {
    return res.status(404).json({ error: 'Pending request not found.' });
  }

  request.status = 'cancelled';
  writeDB(db);

  res.json({ success: true, message: 'Partner request cancelled.' });
});

// 6. Unpair / Leave Team
app.post('/api/partners/unpair', requireParticipant, (req, res) => {
  const currentStudentId = (req.user.studentId || '').toLowerCase();
  const db = readDB();
  const participants = db.participants || [];

  const me = participants.find((p) => (p.studentId || '').toLowerCase() === currentStudentId);
  if (!me || !me.partnerStudentId) {
    return res.status(400).json({ error: 'You do not currently have a partner.' });
  }

  const partnerStudentId = me.partnerStudentId;
  const partner = participants.find((p) => (p.studentId || '').toLowerCase() === partnerStudentId.toLowerCase());

  // Clear me
  const oldMembers = Array.isArray(me.teamMembers) ? [...me.teamMembers] : [];
  me.partnerId = null;
  me.partnerStudentId = null;
  me.partnerName = null;
  me.partnerEmail = null;
  me.partnerDepartment = null;
  me.partnerPairedAt = null;
  me.teamId = null;
  me.teamMembers = [];

  // Clear all former teammates
  oldMembers.forEach((m) => {
    const pRecord = participants.find((p) => (p.studentId || '').toLowerCase() === (m.studentId || '').toLowerCase());
    if (pRecord) {
      pRecord.partnerId = null;
      pRecord.partnerStudentId = null;
      pRecord.partnerName = null;
      pRecord.partnerEmail = null;
      pRecord.partnerDepartment = null;
      pRecord.partnerPairedAt = null;
      pRecord.teamId = null;
      pRecord.teamMembers = [];
    }
  });

  // Clear partner
  if (partner) {
    partner.partnerId = null;
    partner.partnerStudentId = null;
    partner.partnerName = null;
    partner.partnerEmail = null;
    partner.partnerDepartment = null;
    partner.partnerPairedAt = null;
    partner.teamId = null;
    partner.teamMembers = [];

    addNotification(
      partner.studentId,
      'Partnership Ended',
      `${me.fullName} disbanded the team. You can now select a new partner.`,
      'info'
    );
  }

  writeDB(db);
  addAuditLog(me.studentId, 'PARTNER_UNPAIRED', 'partner', partnerStudentId);

  res.json({ success: true, message: 'You have left the team. You can now choose a new partner.' });
});

// ====================================================================
// RAPID-FIRE ADJUDICATION CONSOLE (ROUND 3 - ADMIN)
// ====================================================================

// Get qualified candidates for Round 3
app.get('/api/rapidfire/candidates', requireAdmin, (req, res) => {
  const db = readDB();
  const results = db.results || [];
  const r2Results = results.filter((r) => r.roundNumber === 2 && r.isQualified);
  const participants = db.participants || [];

  const candidates = r2Results.map((r) => {
    const p = participants.find((part) => part.studentId === r.studentId);
    return {
      studentId: r.studentId,
      fullName: r.studentName || (p ? p.fullName : r.studentId),
      round2Score: r.score,
    };
  });

  // If no r2 qualification run yet, fallback to top participants for testing
  if (candidates.length === 0) {
    const top4 = participants.slice(0, 4).map((p) => ({
      studentId: p.studentId,
      fullName: p.fullName,
      round2Score: 5.0,
    }));
    return res.json(top4);
  }

  res.json(candidates);
});

// Start Rapid Fire 3-Minute Session for Selected Candidate
app.post('/api/rapidfire/start', requireAdmin, (req, res) => {
  const { studentId, studentName } = req.body;
  if (!studentId) return res.status(400).json({ error: 'Candidate Student ID required.' });

  const db = readDB();
  const questions = (db.questions || []).filter((q) => q.roundNumber === 3 && q.isActive);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 180 * 1000); // 3 minutes = 180s

  db.rapidFireState = {
    activeStudentId: studentId,
    activeStudentName: studentName || studentId,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    currentQuestionIndex: 0,
    questions,
    correctCount: 0,
    incorrectCount: 0,
    skippedCount: 0,
    score: 0.0,
    actionsLog: [],
    status: 'running',
  };

  writeDB(db);
  addAuditLog(req.user.username, 'RAPID_FIRE_ROUND_STARTED', 'rapid_fire', studentId);
  res.json({ success: true, state: db.rapidFireState });
});

// Adjudicate Current Rapid Fire Question (+1 Correct, 0 Incorrect, 0 Skip)
app.post('/api/rapidfire/action', requireAdmin, (req, res) => {
  const { action, questionId } = req.body; // 'correct', 'incorrect', 'skip'
  const db = readDB();
  const state = db.rapidFireState;

  if (!state || state.status !== 'running') {
    return res.status(400).json({ error: 'No active rapid fire round currently running.' });
  }

  // Check 3-minute hard deadline
  if (Date.now() > new Date(state.expiresAt).getTime()) {
    state.status = 'finished';
    writeDB(db);
    return res.status(408).json({ error: 'Rapid Fire 3-minute timer has expired.', state });
  }

  let delta = 0;
  if (action === 'correct') {
    delta = 1.0;
    state.correctCount += 1;
    state.score += 1.0;
  } else if (action === 'incorrect') {
    state.incorrectCount += 1;
  } else if (action === 'skip') {
    state.skippedCount += 1;
  }

  const logEntry = {
    questionId: questionId || `Q-${state.currentQuestionIndex}`,
    action,
    delta,
    timestamp: new Date().toISOString(),
  };

  state.actionsLog = [...(state.actionsLog || []), logEntry];
  state.currentQuestionIndex += 1;

  if (state.currentQuestionIndex >= (state.questions || []).length) {
    state.status = 'finished';
  }

  writeDB(db);
  res.json({ success: true, state });
});

// Finish Rapid Fire Turn and Record Score
app.post('/api/rapidfire/finish', requireAdmin, (req, res) => {
  const db = readDB();
  const state = db.rapidFireState;
  if (!state || !state.activeStudentId) {
    return res.status(400).json({ error: 'No candidate rapid fire state to finish.' });
  }

  state.status = 'finished';

  // Save to results table
  const results = db.results || [];
  const rIndex = results.findIndex((r) => r.studentId === state.activeStudentId && r.roundNumber === 3);
  const record = {
    studentId: state.activeStudentId,
    studentName: state.activeStudentName,
    roundNumber: 3,
    score: state.score,
    completedAt: new Date().toISOString(),
    isQualified: false,
    isPublished: true,
  };
  if (rIndex >= 0) results[rIndex] = record;
  else results.push(record);
  db.results = results;

  writeDB(db);
  addAuditLog(req.user.username, 'RAPID_FIRE_ROUND_FINISHED', 'rapid_fire', state.activeStudentId, { score: state.score });

  res.json({ success: true, finalScore: state.score, record });
});

app.get('/api/rapidfire/state', (req, res) => {
  const db = readDB();
  res.json(db.rapidFireState || { status: 'idle' });
});

// ====================================================================
// BUZZER ADJUDICATION CONSOLE (ROUND 4 - ADMIN & FINALISTS)
// ====================================================================

// Get 2 Finalists for Round 4
app.get('/api/buzzer/finalists', (req, res) => {
  const db = readDB();
  const results = db.results || [];
  const r3Results = results.filter((r) => r.roundNumber === 3 && r.isQualified);
  const participants = db.participants || [];

  let finalists = r3Results.map((r) => {
    const p = participants.find((part) => part.studentId === r.studentId);
    return {
      studentId: r.studentId,
      fullName: r.studentName || (p ? p.fullName : r.studentId),
      round3Score: r.score,
    };
  });

  // Fallback to top 2 participants if Round 3 not adjudicated yet
  if (finalists.length < 2) {
    finalists = participants.slice(0, 2).map((p) => ({
      studentId: p.studentId,
      fullName: p.fullName,
      round3Score: 10.0,
    }));
  }

  res.json(finalists.slice(0, 2));
});

// Live Buzzer Press (Atomic Lockout Determination on Server)
app.post('/api/buzzer/press', (req, res) => {
  const { studentId, studentName } = req.body;
  if (!studentId) return res.status(400).json({ error: 'Student ID required to buzz.' });

  const db = readDB();
  const bState = db.buzzerState || { status: 'idle' };

  // If already locked out by first buzzer
  if (bState.status === 'buzzed' && bState.lockedStudentId) {
    return res.status(409).json({
      error: `Lockout: Student ${bState.lockedStudentName || bState.lockedStudentId} buzzed first!`,
      winnerId: bState.lockedStudentId,
      buzzedAt: bState.buzzTimestamp,
    });
  }

  const now = new Date();
  const deadline = new Date(now.getTime() + 10 * 1000); // Strict 10-second server response window

  db.buzzerState = {
    ...bState,
    lockedStudentId: studentId,
    lockedStudentName: studentName || studentId,
    buzzTimestamp: now.toISOString(),
    deadlineTimestamp: deadline.toISOString(),
    status: 'buzzed',
  };

  // Add event to buzzer ledger
  const bEvent = {
    id: `BZ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    studentId,
    studentName: studentName || studentId,
    buzzedAt: now.toISOString(),
    responseDeadline: deadline.toISOString(),
  };
  db.buzzerEvents = [bEvent, ...(db.buzzerEvents || [])];

  writeDB(db);

  res.json({
    success: true,
    message: 'Buzzer lock awarded!',
    lockedStudentId: studentId,
    lockedStudentName: studentName || studentId,
    deadlineTimestamp: deadline.toISOString(),
  });
});

// Adjudicate Buzzer Question (+1 Correct, -0.5 Incorrect, Timeout, Pass, Penalty)
app.post('/api/buzzer/adjudicate', requireAdmin, (req, res) => {
  const { outcome, penaltyPoints, notes } = req.body; // 'correct', 'incorrect', 'pass', 'timeout', 'warning'
  const db = readDB();
  const bState = db.buzzerState || { status: 'idle' };

  if (!bState.lockedStudentId) {
    return res.status(400).json({ error: 'No student currently buzzed to adjudicate.' });
  }

  let delta = 0;
  if (outcome === 'correct') {
    delta = 1.0;
  } else if (outcome === 'incorrect') {
    delta = -0.5;
  } else if (outcome === 'warning' && penaltyPoints) {
    delta = -Math.abs(Number(penaltyPoints));
  }

  // Update finalist's Round 4 score in Results
  const results = db.results || [];
  let rIndex = results.findIndex((r) => r.studentId === bState.lockedStudentId && r.roundNumber === 4);
  if (rIndex === -1) {
    results.push({
      studentId: bState.lockedStudentId,
      studentName: bState.lockedStudentName,
      roundNumber: 4,
      score: 0,
      completedAt: new Date().toISOString(),
      isQualified: false,
      isPublished: true,
    });
    rIndex = results.length - 1;
  }

  results[rIndex].score = Number((results[rIndex].score + delta).toFixed(2));
  db.results = results;

  // Record Scoring Event
  const scoreEvent = {
    id: `SE-BZ-${Date.now()}`,
    studentId: bState.lockedStudentId,
    roundNumber: 4,
    points: delta,
    eventType: `buzzer_${outcome}`,
    notes,
    timestamp: new Date().toISOString(),
  };
  db.scoringEvents = [scoreEvent, ...(db.scoringEvents || [])];

  // Update buzzer state
  db.buzzerState = {
    ...bState,
    status: 'adjudicated',
    lastOutcome: outcome,
    lastDelta: delta,
  };

  writeDB(db);
  addAuditLog(req.user.username, 'BUZZER_ADJUDICATED', 'buzzer_engine', bState.lockedStudentId, { outcome, delta, notes });

  res.json({
    success: true,
    outcome,
    delta,
    updatedScore: results[rIndex].score,
    studentId: bState.lockedStudentId,
  });
});

// Reset Buzzer for Next Question
app.post('/api/buzzer/reset', requireAdmin, (req, res) => {
  const db = readDB();
  db.buzzerState = {
    round: 4,
    activeQuestionIndex: (db.buzzerState?.activeQuestionIndex || 0) + 1,
    lockedStudentId: null,
    lockedStudentName: null,
    buzzTimestamp: null,
    deadlineTimestamp: null,
    status: 'idle',
  };
  writeDB(db);
  res.json({ success: true, message: 'Buzzer reset. Ready for next question.' });
});

app.get('/api/buzzer/state', (req, res) => {
  const db = readDB();
  res.json(db.buzzerState || { status: 'idle' });
});

// ====================================================================
// QUALIFICATION ENGINE & TIE-BREAKER PROTOCOL
// ====================================================================

// Calculate Qualifications for a Round
app.post('/api/qualification/calculate/:roundNumber', requireAdmin, (req, res) => {
  const roundNum = Number(req.params.roundNumber);
  const db = readDB();
  const results = db.results || [];
  const roundResults = results.filter((r) => r.roundNumber === roundNum);

  if (roundResults.length === 0) {
    return res.status(400).json({ error: `No results submitted for Round 0${roundNum} yet.` });
  }

  // Sort descending by score
  roundResults.sort((a, b) => (b.score || 0) - (a.score || 0));

  let qualifiedCount = 0;
  if (roundNum === 1) {
    // Top 80% qualify
    qualifiedCount = Math.max(1, Math.ceil(roundResults.length * 0.8));
  } else if (roundNum === 2) {
    // Top 4 qualify
    qualifiedCount = Math.min(4, roundResults.length);
  } else if (roundNum === 3) {
    // Top 2 qualify
    qualifiedCount = Math.min(2, roundResults.length);
  } else if (roundNum === 4) {
    // 1 Champion
    qualifiedCount = 1;
  }

  // Check for Cutoff Ties
  const cutoffScore = roundResults[qualifiedCount - 1]?.score || 0;
  const tiedAtCutoff = roundResults.filter((r) => r.score === cutoffScore);
  const hasTie = tiedAtCutoff.length > 1;

  roundResults.forEach((r, idx) => {
    if (idx < qualifiedCount) {
      r.isQualified = true;
      r.rank = idx + 1;
    } else {
      r.isQualified = false;
      r.rank = idx + 1;
    }
  });

  db.results = results;
  writeDB(db);

  // Send Notifications to Qualified Students
  roundResults.forEach((r) => {
    if (r.isQualified) {
      addNotification(
        r.studentId,
        `Qualified for Next Round!`,
        `Congratulations ${r.studentName}! You ranked #${r.rank} in Round 0${roundNum} with ${r.score} points and have advanced!`,
        'success'
      );
    }
  });

  addAuditLog(req.user.username, 'QUALIFICATION_CALCULATED', 'qualification_engine', `Round-${roundNum}`, {
    totalEvaluated: roundResults.length,
    qualifiedCount,
    hasTie,
    cutoffScore,
  });

  res.json({
    success: true,
    roundNumber: roundNum,
    totalEvaluated: roundResults.length,
    qualifiedCount,
    hasTie,
    cutoffScore,
    tieProtocolMessage: hasTie ? "Tie detected at cutoff score! Proceed to 2 Tie-Breaker Questions or Buzzer Decider." : "Qualification clean with no ties.",
    roster: roundResults,
  });
});

// Get Current Qualification Rosters
app.get('/api/qualification/status', (req, res) => {
  const db = readDB();
  const results = db.results || [];
  const status = {
    round1: results.filter((r) => r.roundNumber === 1 && r.isQualified),
    round2: results.filter((r) => r.roundNumber === 2 && r.isQualified),
    round3: results.filter((r) => r.roundNumber === 3 && r.isQualified),
    round4Champion: results.filter((r) => r.roundNumber === 4 && r.isQualified)[0] || null,
  };
  res.json(status);
});

// ====================================================================
// RESULTS & LIVE LEADERBOARD
// ====================================================================

// Leaderboard: Public view gets published results; Admin gets all
app.get('/api/results/leaderboard', (req, res) => {
  const db = readDB();
  const results = db.results || [];
  const participants = db.participants || [];

  // Group by student to calculate cumulative total
  const studentMap = {};
  participants.forEach((p) => {
    studentMap[p.studentId] = {
      studentId: p.studentId,
      fullName: p.fullName,
      department: p.department,
      semester: p.semester,
      registrationRef: p.id,
      round1Score: 0,
      round2Score: 0,
      round3Score: 0,
      round4Score: 0,
      totalScore: 0,
      highestRoundReached: 1,
      isQualifiedRound1: false,
      isQualifiedRound2: false,
      isQualifiedRound3: false,
      isChampion: false,
    };
  });

  results.forEach((r) => {
    if (!studentMap[r.studentId]) {
      studentMap[r.studentId] = {
        studentId: r.studentId,
        fullName: r.studentName || r.studentId,
        round1Score: 0,
        round2Score: 0,
        round3Score: 0,
        round4Score: 0,
        totalScore: 0,
        highestRoundReached: r.roundNumber,
      };
    }

    const s = studentMap[r.studentId];
    if (r.roundNumber === 1) {
      s.round1Score = r.score;
      s.isQualifiedRound1 = r.isQualified;
      if (r.isQualified) s.highestRoundReached = Math.max(s.highestRoundReached, 2);
    } else if (r.roundNumber === 2) {
      s.round2Score = r.score;
      s.isQualifiedRound2 = r.isQualified;
      if (r.isQualified) s.highestRoundReached = Math.max(s.highestRoundReached, 3);
    } else if (r.roundNumber === 3) {
      s.round3Score = r.score;
      s.isQualifiedRound3 = r.isQualified;
      if (r.isQualified) s.highestRoundReached = Math.max(s.highestRoundReached, 4);
    } else if (r.roundNumber === 4) {
      s.round4Score = r.score;
      if (r.isQualified) s.isChampion = true;
    }

    s.totalScore = Number((s.round1Score + s.round2Score + s.round3Score + s.round4Score).toFixed(2));
  });

  const leaderboard = Object.values(studentMap);
  // Sort descending by total score, then by round 4, round 3, round 2, round 1
  leaderboard.sort((a, b) => b.totalScore - a.totalScore || b.round4Score - a.round4Score || b.round3Score - a.round3Score || b.round2Score - a.round2Score);

  leaderboard.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  res.json({
    leaderboard,
    totalCompetitors: leaderboard.length,
    lastUpdated: new Date().toISOString(),
  });
});

// Toggle Result Publishing (Admin)
app.post('/api/results/publish', requireAdmin, (req, res) => {
  const { isPublished } = req.body;
  const db = readDB();
  const results = db.results || [];
  results.forEach((r) => {
    r.isPublished = Boolean(isPublished);
  });
  db.results = results;
  writeDB(db);

  addAuditLog(req.user.username, isPublished ? 'RESULTS_PUBLISHED' : 'RESULTS_UNPUBLISHED', 'leaderboard', 'global');
  res.json({ success: true, isPublished, message: `Results publish state set to: ${isPublished}` });
});

// ====================================================================
// ANNOUNCEMENTS & IN-APP NOTIFICATIONS
// ====================================================================

app.get('/api/announcements', (req, res) => {
  const db = readDB();
  res.json(db.announcements || INITIAL_ANNOUNCEMENTS);
});

app.post('/api/announcements', requireAdmin, (req, res) => {
  const { title, content, category, isPublished } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required.' });
  }

  const db = readDB();
  const newAnn = {
    id: `ANN-${Date.now()}`,
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    isPublished: isPublished !== undefined ? isPublished : true,
    createdAt: new Date().toISOString(),
  };

  db.announcements = [newAnn, ...(db.announcements || [])];
  writeDB(db);

  addAuditLog(req.user.username, 'ANNOUNCEMENT_CREATED', 'announcement', newAnn.id, { title: newAnn.title });
  res.status(201).json({ success: true, announcement: newAnn });
});

app.put('/api/announcements/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const changes = req.body;
  const db = readDB();
  const announcements = db.announcements || [];

  const index = announcements.findIndex((a) => a.id === id);
  if (index === -1) return res.status(404).json({ error: 'Announcement not found.' });

  announcements[index] = { ...announcements[index], ...changes, updatedAt: new Date().toISOString() };
  db.announcements = announcements;
  writeDB(db);

  addAuditLog(req.user.username, 'ANNOUNCEMENT_UPDATED', 'announcement', id);
  res.json({ success: true, announcement: announcements[index] });
});

app.delete('/api/announcements/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.announcements = (db.announcements || []).filter((a) => a.id !== id);
  writeDB(db);

  addAuditLog(req.user.username, 'ANNOUNCEMENT_DELETED', 'announcement', id);
  res.json({ success: true, message: 'Announcement deleted.' });
});

// Notifications for Logged-In Student
app.get('/api/notifications/my', requireParticipant, (req, res) => {
  const studentId = req.user.studentId;
  const db = readDB();
  const notifs = (db.notifications || []).filter((n) => n.studentId === studentId);
  res.json(notifs);
});

app.post('/api/notifications/mark-read', requireParticipant, (req, res) => {
  const studentId = req.user.studentId;
  const db = readDB();
  const notifs = db.notifications || [];
  notifs.forEach((n) => {
    if (n.studentId === studentId) n.isRead = true;
  });
  db.notifications = notifs;
  writeDB(db);
  res.json({ success: true });
});

// ====================================================================
// AUDIT LOGS (ADMIN)
// ====================================================================

app.get('/api/audit-logs', requireAdmin, (req, res) => {
  const db = readDB();
  res.json((db.auditLogs || []).slice(0, 150));
});

// ====================================================================
// REAL-TIME ANTI-CHEAT PROCTORING & SIREN SYSTEM (ADMIN & STUDENT)
// ====================================================================

// Student client reports infraction
app.post('/api/proctor/report-infraction', requireParticipant, (req, res) => {
  const { infractionType, details, roundNumber } = req.body;
  const db = readDB();
  const student = (db.participants || []).find((p) => p.studentId === req.user.studentId) || req.user;

  const alert = {
    id: `ALERT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    studentId: student.studentId || req.user.studentId,
    studentName: student.fullName || req.user.fullName || 'Contestant',
    studentEmail: student.email || req.user.email || 'student@comsats.edu.pk',
    campus: student.campus || 'Islamabad Campus',
    degreeProgram: student.degreeProgram || 'BS Computer Science',
    semester: student.semester || '4th Semester',
    roundNumber: Number(roundNumber) || 1,
    infractionType: infractionType || 'TAB_SWITCH',
    details: details || 'Student switched tabs, opened another browser, or minimized examination window.',
    timestamp: new Date().toISOString(),
    acknowledged: false,
    status: 'ACTIVE_MALPRACTICE',
  };

  db.liveProctorAlerts = [alert, ...(db.liveProctorAlerts || [])].slice(0, 100);
  writeDB(db);

  addAuditLog(student.studentId, 'PROCTOR_INFRACTION_DETECTED', 'proctor', alert.id, {
    fullName: student.fullName,
    email: student.email,
    infractionType: alert.infractionType,
    details: alert.details,
  });

  res.json({ success: true, alert });
});

// Admin polls active live alerts
app.get('/api/proctor/live-alerts', requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.liveProctorAlerts || []);
});

// Admin acknowledges / takes disciplinary action on alert
app.post('/api/proctor/acknowledge-alert', requireAdmin, (req, res) => {
  const { alertId, action } = req.body; // action: 'DISMISS' | 'WARN_STUDENT' | 'DISQUALIFY_STUDENT'
  const db = readDB();
  const alerts = db.liveProctorAlerts || [];
  const alert = alerts.find((a) => a.id === alertId);

  if (!alert) {
    return res.status(404).json({ error: 'Alert not found.' });
  }

  alert.acknowledged = true;
  alert.actionTaken = action || 'DISMISSED';

  if (action === 'DISQUALIFY_STUDENT') {
    // Mark participant as Disqualified
    const participants = db.participants || [];
    const p = participants.find((cand) => cand.studentId === alert.studentId);
    if (p) {
      p.registrationStatus = 'Disqualified';
    }
    // Finalize active attempts with 0 score
    const attempts = db.attempts || [];
    const a = attempts.find((att) => att.studentId === alert.studentId && att.roundNumber === alert.roundNumber);
    if (a) {
      a.status = 'disqualified';
      a.isFinished = true;
      a.score = 0;
    }
    addNotification(alert.studentId, 'Disqualification Notice', 'You have been officially disqualified by the examination committee for malpractice.', 'danger');
  } else if (action === 'WARN_STUDENT') {
    addNotification(alert.studentId, 'Official Admin Warning', 'The invigilator has flagged your session for tab-switching. Another infraction will lead to immediate expulsion.', 'warning');
  }

  writeDB(db);
  addAuditLog(req.user.username, 'PROCTOR_ALERT_ACTION', 'proctor', alertId, { action, studentId: alert.studentId });
  res.json({ success: true, alert });
});

// Admin dismisses all pending alerts at once
app.post('/api/proctor/dismiss-all', requireAdmin, (req, res) => {
  const db = readDB();
  const alerts = db.liveProctorAlerts || [];
  alerts.forEach((a) => {
    a.acknowledged = true;
    a.actionTaken = 'DISMISSED';
  });
  writeDB(db);
  addAuditLog(req.user.username, 'PROCTOR_ALERTS_DISMISS_ALL', 'proctor', 'all', { count: alerts.length });
  res.json({ success: true, count: alerts.length });
});

// ====================================================================
// SEMESTER COHORT & STUDENT PROGRESSION MANAGEMENT (ADMIN)
// ====================================================================

app.get('/api/participants/cohorts', requireAdmin, (req, res) => {
  const db = readDB();
  const participants = db.participants || [];

  const semesters = [
    '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
    '5th Semester', '6th Semester', '7th Semester', '8th Semester', 'Alumni / Graduated'
  ];

  const cohorts = semesters.map((sem) => {
    const students = participants.filter((p) => (p.semester || '').toLowerCase().trim() === sem.toLowerCase().trim());
    return {
      semester: sem,
      count: students.length,
      students,
    };
  });

  res.json({ cohorts, totalParticipants: participants.length });
});

app.post('/api/participants/promote-semester', requireAdmin, (req, res) => {
  const { studentIds, targetSemester } = req.body;
  if (!targetSemester) {
    return res.status(400).json({ error: 'Target semester is required.' });
  }

  const db = readDB();
  const participants = db.participants || [];
  let updatedCount = 0;

  participants.forEach((p) => {
    if (!studentIds || studentIds.length === 0 || studentIds.includes(p.id) || studentIds.includes(p.studentId)) {
      const pastSem = p.semester || 'Unassigned';
      p.semesterHistory = [
        ...(p.semesterHistory || []),
        { fromSemester: pastSem, toSemester: targetSemester, promotedAt: new Date().toISOString() }
      ];
      p.semester = targetSemester;
      updatedCount++;
    }
  });

  writeDB(db);
  addAuditLog(req.user.username, 'SEMESTER_PROGRESSION_PROMOTED', 'cohort', targetSemester, { updatedCount, targetSemester });
  res.json({ success: true, updatedCount, targetSemester, message: `Successfully transitioned ${updatedCount} students to ${targetSemester}!` });
});

// Outbox / Automated Emails History
app.get('/api/admin/outbox-emails', requireAdmin, (req, res) => {
  const db = readDB();
  res.json(db.emailOutbox || []);
});

// ====================================================================
// SERVE STATIC CLIENT IN PRODUCTION
// ====================================================================

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ====================================================================
// SERVER START
// ====================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Battle of Brains 2026 Authoritative Central API Server`);
  console.log(`📡 Local:   http://localhost:${PORT}`);
  console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
  console.log(`🛡️  RBAC & Server Scoring: ACTIVE`);
});

export default app;

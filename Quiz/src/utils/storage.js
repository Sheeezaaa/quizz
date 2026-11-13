import * as XLSX from 'xlsx';
import { INITIAL_REGISTERED_PARTICIPANTS } from '../data/initialParticipants';
import { 
  COMPETITION_DETAILS as DEFAULT_DETAILS, 
  COMPETITION_SUBJECTS as DEFAULT_SUBJECTS, 
  COMPETITION_ROUNDS as DEFAULT_ROUNDS, 
  RULES_AND_REGULATIONS as DEFAULT_RULES 
} from '../data/competitionData';

const STORAGE_KEYS = {
  PARTICIPANTS: 'bob_registered_participants_v2',
  EVENT_DATE: 'bob_event_date_v1',
  DETAILS: 'bob_competition_details_v2',
  SUBJECTS: 'bob_competition_subjects_v2',
  ROUNDS: 'bob_competition_rounds_v2',
  RULES: 'bob_competition_rules_v2',
  ADMIN_AUTH: 'bob_admin_auth_v1',
  ADMIN_PASSWORD: 'bob_admin_secure_password_v1',
  THEME: 'bob_website_theme_v1',
  STUDENT_SESSION: 'bob_student_session_v1',
  QUESTIONS: 'bob_questions_bank_v1',
};

// Theme Management
export const getStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  } catch (err) {
    return 'dark';
  }
};

export const setStoredTheme = (theme) => {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Student Session
export const getLoggedInStudent = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.STUDENT_SESSION);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

export const setLoggedInStudent = (student) => {
  try {
    if (student) {
      localStorage.setItem(STORAGE_KEYS.STUDENT_SESSION, JSON.stringify(student));
    } else {
      localStorage.removeItem(STORAGE_KEYS.STUDENT_SESSION);
    }
    return true;
  } catch (err) {
    return false;
  }
};

// Admin Password Management (Confidential & Persistent)
export const getAdminPassword = () => {
  try {
    const pass = localStorage.getItem(STORAGE_KEYS.ADMIN_PASSWORD);
    return pass || 'admin123';
  } catch (err) {
    return 'admin123';
  }
};

export const setAdminPassword = (newPassword) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PASSWORD, newPassword);
    return true;
  } catch (err) {
    return false;
  }
};

export const getAdminEmail = () => {
  try {
    return localStorage.getItem('bob_admin_email') || 'admin@comsats.edu.pk';
  } catch {
    return 'admin@comsats.edu.pk';
  }
};

export const setAdminEmail = (email) => {
  try {
    localStorage.setItem('bob_admin_email', email);
    return true;
  } catch {
    return false;
  }
};

// Participants
export const getStoredParticipants = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(INITIAL_REGISTERED_PARTICIPANTS));
      return INITIAL_REGISTERED_PARTICIPANTS;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading participants from localStorage:', err);
    return INITIAL_REGISTERED_PARTICIPANTS;
  }
};

export const saveParticipant = (newParticipant) => {
  try {
    const existing = getStoredParticipants();
    const updated = [newParticipant, ...existing];
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
    return { success: true, participants: updated };
  } catch (err) {
    console.error('Error saving participant to localStorage:', err);
    return { success: false, error: err.message };
  }
};

export const deleteParticipant = (id) => {
  try {
    const existing = getStoredParticipants();
    const updated = existing.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error deleting participant:', err);
    return getStoredParticipants();
  }
};

// Unique participant ID generator (avoids duplicate random IDs)
export const generateParticipantId = (existing = getStoredParticipants()) => {
  const used = new Set(existing.map((p) => p.id));
  let id;
  do {
    id = `BOB-2026-${Math.floor(100 + Math.random() * 900)}`;
  } while (used.has(id));
  return id;
};

export const updateParticipant = (id, changes) => {
  try {
    const existing = getStoredParticipants();
    const updated = existing.map((p) => (p.id === id ? { ...p, ...changes } : p));
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error updating participant:', err);
    return getStoredParticipants();
  }
};

export const deleteParticipants = (ids) => {
  try {
    const idSet = new Set(ids);
    const updated = getStoredParticipants().filter((p) => !idSet.has(p.id));
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error deleting participants:', err);
    return getStoredParticipants();
  }
};

// Event Date
export const getStoredEventDate = () => {
  try {
    const date = localStorage.getItem(STORAGE_KEYS.EVENT_DATE);
    return date || DEFAULT_DETAILS.defaultEventDate;
  } catch (err) {
    console.error('Error getting event date:', err);
    return DEFAULT_DETAILS.defaultEventDate;
  }
};

export const setStoredEventDate = (isoDateString) => {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENT_DATE, isoDateString);
    return true;
  } catch (err) {
    console.error('Error saving event date:', err);
    return false;
  }
};

// Competition Details
export const getStoredDetails = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.DETAILS);
    return data ? JSON.parse(data) : DEFAULT_DETAILS;
  } catch (err) {
    return DEFAULT_DETAILS;
  }
};

export const saveStoredDetails = (details) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DETAILS, JSON.stringify(details));
    return true;
  } catch (err) {
    return false;
  }
};

// Subjects
export const getStoredSubjects = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return data ? JSON.parse(data) : DEFAULT_SUBJECTS;
  } catch (err) {
    return DEFAULT_SUBJECTS;
  }
};

export const saveStoredSubjects = (subjects) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    return true;
  } catch (err) {
    return false;
  }
};

// Rounds
export const getStoredRounds = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ROUNDS);
    return data ? JSON.parse(data) : DEFAULT_ROUNDS;
  } catch (err) {
    return DEFAULT_ROUNDS;
  }
};

export const saveStoredRounds = (rounds) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(rounds));
    return true;
  } catch (err) {
    return false;
  }
};

// Rules
export const getStoredRules = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RULES);
    return data ? JSON.parse(data) : DEFAULT_RULES;
  } catch (err) {
    return DEFAULT_RULES;
  }
};

export const saveStoredRules = (rules) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
    return true;
  } catch (err) {
    return false;
  }
};

// Reset to Defaults
export const resetAllToDefaults = () => {
  try {
    localStorage.setItem(STORAGE_KEYS.DETAILS, JSON.stringify(DEFAULT_DETAILS));
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(DEFAULT_SUBJECTS));
    localStorage.setItem(STORAGE_KEYS.ROUNDS, JSON.stringify(DEFAULT_ROUNDS));
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(DEFAULT_RULES));
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(INITIAL_REGISTERED_PARTICIPANTS));
    localStorage.setItem(STORAGE_KEYS.EVENT_DATE, DEFAULT_DETAILS.defaultEventDate);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_PASSWORD);
    localStorage.removeItem(STORAGE_KEYS.STUDENT_SESSION);
    return true;
  } catch (err) {
    return false;
  }
};

// Admin Session
export const getAdminAuth = () => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
};

export const setAdminAuth = (isAuth) => {
  localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, isAuth ? 'true' : 'false');
};

// CSV Export
export const exportParticipantsToCSV = (participants) => {
  const headers = [
    'Registration ID',
    'Participant Full Name',
    'Student ID',
    'Email Address',
    'Phone Number',
    'Department',
    'Semester',
    'Registration Date',
  ];

  const rows = participants.map((p) => [
    `"${p.id}"`,
    `"${p.fullName.replace(/"/g, '""')}"`,
    `"${p.studentId}"`,
    `"${p.email}"`,
    `"${p.phone}"`,
    `"${p.department}"`,
    `"${p.semester}"`,
    `"${new Date(p.registeredAt).toLocaleString()}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `BattleOfBrains_Participants_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// =========================================================================
// QUESTION BANK MANAGEMENT & EXCEL / CSV IMPORT/EXPORT
// =========================================================================

export const DEFAULT_QUESTIONS = [
  {
    id: 'Q-101',
    subject: 'Data Structures & Algorithms',
    round: 'Round 1 (MCQs)',
    question: 'What is the worst-case time complexity of searching in a balanced Binary Search Tree (AVL Tree) with n nodes?',
    optionA: 'O(1)',
    optionB: 'O(log n)',
    optionC: 'O(n)',
    optionD: 'O(n log n)',
    correctOption: 'B',
    correct: 1,
    explanation: 'A balanced BST maintains maximum height of O(log n), ensuring searches take at most O(log n) comparisons.',
    difficulty: 'Hard'
  },
  {
    id: 'Q-102',
    subject: 'Object-Oriented Programming',
    round: 'Round 1 (MCQs)',
    question: 'In C++ or Java, which concept allows a subclass to provide a specific implementation of a method that is already provided by its superclass?',
    optionA: 'Method Overloading',
    optionB: 'Method Overriding',
    optionC: 'Data Encapsulation',
    optionD: 'Multiple Inheritance',
    correctOption: 'B',
    correct: 1,
    explanation: 'Method Overriding occurs when a subclass defines a method with the exact same signature as a method in its parent class.',
    difficulty: 'Moderate'
  },
  {
    id: 'Q-103',
    subject: 'Database Systems',
    round: 'Round 1 (MCQs)',
    question: 'Which normal form requires removing transitive dependencies of non-prime attributes on candidate keys?',
    optionA: 'First Normal Form (1NF)',
    optionB: 'Second Normal Form (2NF)',
    optionC: 'Third Normal Form (3NF)',
    optionD: 'Boyce-Codd Normal Form (BCNF)',
    correctOption: 'C',
    correct: 2,
    explanation: '3NF requires that the relation is in 2NF and no non-prime attribute is transitively dependent on any candidate key.',
    difficulty: 'Moderate'
  },
  {
    id: 'Q-104',
    subject: 'Computer Networks',
    round: 'Round 1 (MCQs)',
    question: 'At which layer of the OSI model does the Address Resolution Protocol (ARP) primarily operate to map IP to MAC addresses?',
    optionA: 'Transport Layer',
    optionB: 'Data Link / Network Layer',
    optionC: 'Application Layer',
    optionD: 'Session Layer',
    correctOption: 'B',
    correct: 1,
    explanation: 'ARP operates between Layer 2 (Data Link) and Layer 3 (Network) to resolve 32-bit IPv4 addresses into 48-bit physical MAC addresses.',
    difficulty: 'Moderate'
  },
  {
    id: 'Q-105',
    subject: 'Operating Systems',
    round: 'Round 1 (MCQs)',
    question: 'Which condition is NOT one of Coffman\'s four necessary conditions for a system deadlock to occur?',
    optionA: 'Mutual Exclusion',
    optionB: 'Hold and Wait',
    optionC: 'Preemption Allowed',
    optionD: 'Circular Wait',
    correctOption: 'C',
    correct: 2,
    explanation: 'For a deadlock to occur, resources must be non-preemptive (No Preemption). If preemption is allowed, deadlocks cannot form.',
    difficulty: 'Hard'
  },
  {
    id: 'Q-106',
    subject: 'Software Engineering',
    round: 'Round 2 (Core Concepts)',
    question: 'In Agile Scrum framework, what is the recommended standard duration of a single Sprint cycle?',
    optionA: '1 to 4 Weeks',
    optionB: '6 Months',
    optionC: '1 Day',
    optionD: '1 Year',
    correctOption: 'A',
    correct: 0,
    explanation: 'Scrum guidelines dictate that a Sprint is a fixed-length event of one month or less (typically 2 weeks).',
    difficulty: 'Moderate'
  },
  {
    id: 'Q-107',
    subject: 'Artificial Intelligence',
    round: 'Round 3 (Rapid Fire)',
    question: 'Which informed search algorithm uses both path cost g(n) and heuristic estimate h(n) to find optimal path: f(n) = g(n) + h(n)?',
    optionA: 'Breadth-First Search',
    optionB: 'Depth-First Search',
    optionC: 'A* Search Algorithm',
    optionD: 'Greedy Best-First Search',
    correctOption: 'C',
    correct: 2,
    explanation: 'A* Search evaluates nodes by combining g(n) (cost so far) and h(n) (estimated cost to goal).',
    difficulty: 'Hard'
  },
  {
    id: 'Q-108',
    subject: 'Operating Systems',
    round: 'Round 4 (Buzzer Round)',
    question: 'Who formulated the famous Dining Philosophers problem to illustrate concurrency synchronization in 1965?',
    optionA: 'Edsger W. Dijkstra',
    optionB: 'Alan Turing',
    optionC: 'Donald Knuth',
    optionD: 'John von Neumann',
    correctOption: 'A',
    correct: 0,
    explanation: 'Edsger W. Dijkstra originally formulated the dining philosophers problem as an exam question about synchronizing competing processes.',
    difficulty: 'Hard'
  }
];

export const getStoredQuestions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    let list = raw ? JSON.parse(raw) : DEFAULT_QUESTIONS;
    if (!Array.isArray(list) || list.length === 0) list = DEFAULT_QUESTIONS;
    return list.map((q) => ({
      ...q,
      options: (q.options && Array.isArray(q.options) && q.options.length > 0)
        ? q.options
        : [q.optionA || 'Option A', q.optionB || 'Option B', q.optionC || 'Option C', q.optionD || 'Option D']
    }));
  } catch {
    return DEFAULT_QUESTIONS.map((q) => ({
      ...q,
      options: [q.optionA, q.optionB, q.optionC, q.optionD]
    }));
  }
};

export const saveStoredQuestions = (questions) => {
  try {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    return true;
  } catch {
    return false;
  }
};

// 1. Download Blank/Sample Excel Template for Questions (General or Subject-Specific)
export const downloadQuestionsTemplate = (targetSubject = '') => {
  let templateRows = [];

  if (targetSubject && targetSubject.trim()) {
    const sName = targetSubject.trim();
    templateRows = [
      {
        'Subject': sName,
        'Round': 'Round 1 (MCQs)',
        'Question': `What is a primary concept or fundamental principle of ${sName}?`,
        'Option_A': 'Primary fundamental definition',
        'Option_B': 'Secondary alternative definition',
        'Option_C': 'Unrelated theoretical concept',
        'Option_D': 'Deprecated syntax / feature',
        'Correct_Option': 'A',
        'Explanation': `Comprehensive explanation for question 1 in ${sName}.`,
        'Difficulty': 'Easy'
      },
      {
        'Subject': sName,
        'Round': 'Round 2 (Core Concepts)',
        'Question': `Which mechanism or methodology is most effective when working with ${sName}?`,
        'Option_A': 'Brute force approach',
        'Option_B': 'Optimized algorithmic approach',
        'Option_C': 'Randomized heuristic',
        'Option_D': 'None of the above',
        'Correct_Option': 'B',
        'Explanation': 'Optimized approach provides scalable and robust performance.',
        'Difficulty': 'Moderate'
      },
      {
        'Subject': sName,
        'Round': 'Round 3 (Rapid Fire)',
        'Question': `Quick check: Which property is guaranteed under standard conditions in ${sName}?`,
        'Option_A': 'Non-deterministic outcome',
        'Option_B': 'Consistency and stability',
        'Option_C': 'Arbitrary complexity',
        'Option_D': 'Undefined behavior',
        'Correct_Option': 'B',
        'Explanation': 'Standard conditions ensure predictable and consistent execution.',
        'Difficulty': 'Moderate'
      },
      {
        'Subject': sName,
        'Round': 'Round 4 (Buzzer Round)',
        'Question': `High-stakes Buzzer: In advanced ${sName}, what is the critical bottleneck during scaling?`,
        'Option_A': 'Memory overhead and cache misses',
        'Option_B': 'Constant time overhead',
        'Option_C': 'Font rendering latency',
        'Option_D': 'Static type definitions',
        'Correct_Option': 'A',
        'Explanation': 'Cache misses and memory access latency represent the primary hardware bottleneck.',
        'Difficulty': 'Hard'
      }
    ];
  } else {
    templateRows = [
      {
        'Subject': 'Data Structures & Algorithms',
        'Round': 'Round 1 (MCQs)',
        'Question': 'What is the time complexity of inserting an element at the end of a dynamic array (amortized)?',
        'Option_A': 'O(1)',
        'Option_B': 'O(n)',
        'Option_C': 'O(log n)',
        'Option_D': 'O(n^2)',
        'Correct_Option': 'A',
        'Explanation': 'Dynamic arrays double in capacity periodically, giving an amortized O(1) insertion time.',
        'Difficulty': 'Moderate'
      },
      {
        'Subject': 'Object-Oriented Programming',
        'Round': 'Round 1 (MCQs)',
        'Question': 'Which OOP principle bundles data and functions operating on that data into a single unit?',
        'Option_A': 'Polymorphism',
        'Option_B': 'Inheritance',
        'Option_C': 'Encapsulation',
        'Option_D': 'Abstraction',
        'Correct_Option': 'C',
        'Explanation': 'Encapsulation restricts direct access to an object components and bundles data with methods.',
        'Difficulty': 'Easy'
      },
      {
        'Subject': 'Database Systems',
        'Round': 'Round 2 (Core Concepts)',
        'Question': 'Which SQL clause is used to filter records resulting from an aggregate function like COUNT or AVG?',
        'Option_A': 'WHERE',
        'Option_B': 'HAVING',
        'Option_C': 'GROUP BY',
        'Option_D': 'ORDER BY',
        'Correct_Option': 'B',
        'Explanation': 'HAVING filters aggregate groups, whereas WHERE filters individual rows before grouping.',
        'Difficulty': 'Moderate'
      },
      {
        'Subject': 'Computer Networks',
        'Round': 'Round 3 (Rapid Fire)',
        'Question': 'What is the standard port number for DNS (Domain Name System)?',
        'Option_A': '21',
        'Option_B': '53',
        'Option_C': '80',
        'Option_D': '443',
        'Correct_Option': 'B',
        'Explanation': 'DNS queries and responses primarily communicate using UDP and TCP port 53.',
        'Difficulty': 'Moderate'
      },
      {
        'Subject': 'Artificial Intelligence',
        'Round': 'Round 4 (Buzzer Round)',
        'Question': 'In machine learning, which term describes when a model learns training data noise too closely and fails to generalize?',
        'Option_A': 'Underfitting',
        'Option_B': 'Overfitting',
        'Option_C': 'Convergence',
        'Option_D': 'Gradient Descent',
        'Correct_Option': 'B',
        'Explanation': 'Overfitting happens when a model learns patterns and noise specific to training dataset.',
        'Difficulty': 'Moderate'
      }
    ];
  }

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  
  // Set column widths for friendly viewing in Microsoft Excel
  worksheet['!cols'] = [
    { wch: 30 }, // Subject
    { wch: 24 }, // Round
    { wch: 60 }, // Question
    { wch: 22 }, // Option_A
    { wch: 22 }, // Option_B
    { wch: 22 }, // Option_C
    { wch: 22 }, // Option_D
    { wch: 16 }, // Correct_Option
    { wch: 50 }, // Explanation
    { wch: 15 }, // Difficulty
  ];

  const safeSubjectName = targetSubject ? targetSubject.replace(/[^a-zA-Z0-9]/g, '_') : 'General';
  const fileName = targetSubject 
    ? `${safeSubjectName}_Questions_Template.xlsx` 
    : 'BattleOfBrains_Questions_Template.xlsx';

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions_Template');
  XLSX.writeFile(workbook, fileName);
};

// 2. Export Entire Question Bank to Excel
export const exportQuestionsToExcel = (questions) => {
  const exportRows = questions.map((q) => ({
    'ID': q.id,
    'Subject': q.subject,
    'Round': q.round,
    'Question': q.question,
    'Option_A': q.optionA || (q.options && q.options[0]) || '',
    'Option_B': q.optionB || (q.options && q.options[1]) || '',
    'Option_C': q.optionC || (q.options && q.options[2]) || '',
    'Option_D': q.optionD || (q.options && q.options[3]) || '',
    'Correct_Option': q.correctOption || (typeof q.correct === 'number' ? ['A', 'B', 'C', 'D'][q.correct] : 'A'),
    'Explanation': q.explanation || '',
    'Difficulty': q.difficulty || 'Moderate'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 10 },
    { wch: 28 },
    { wch: 22 },
    { wch: 55 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 15 },
    { wch: 45 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Question_Bank');
  XLSX.writeFile(workbook, `BattleOfBrains_QuestionBank_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

// 3. Parse Uploaded Excel (.xlsx / .xls) or CSV File
export const parseQuestionsFile = async (file, defaultSubject = '') => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The uploaded file is empty or contains no readable rows.');
        }

        const parsedQuestions = rawJson.map((row, index) => {
          // Normalize column names (support 'Subject', 'subject', 'Question', 'question', 'Option_A', 'Option A', etc.)
          const getVal = (keys) => {
            for (const k of keys) {
              if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
                return String(row[k]).trim();
              }
            }
            return '';
          };

          const detectedSubject = getVal(['Subject', 'subject', 'Category', 'category', 'Course']);
          const subject = detectedSubject || defaultSubject || 'General Computer Science';
          const round = getVal(['Round', 'round', 'Stage', 'stage']) || 'Round 1 (MCQs)';
          const questionText = getVal(['Question', 'question', 'Question Text', 'QuestionText', 'Statement']);
          const optA = getVal(['Option_A', 'Option A', 'optionA', 'option_a', 'A', 'a', 'OptA']);
          const optB = getVal(['Option_B', 'Option B', 'optionB', 'option_b', 'B', 'b', 'OptB']);
          const optC = getVal(['Option_C', 'Option C', 'optionC', 'option_c', 'C', 'c', 'OptC']);
          const optD = getVal(['Option_D', 'Option D', 'optionD', 'option_d', 'D', 'd', 'OptD']);
          const correctRaw = getVal(['Correct_Option', 'Correct Option', 'Correct', 'correct', 'Answer', 'answer']).toUpperCase();
          const explanation = getVal(['Explanation', 'explanation', 'Reason', 'reason', 'Hint', 'hint']);
          const difficulty = getVal(['Difficulty', 'difficulty', 'Level', 'level']) || 'Moderate';

          if (!questionText) {
            return null; // Skip invalid row without question text
          }

          let correctIdx = 0;
          let correctLetter = 'A';
          if (correctRaw === 'B' || correctRaw === '2' || correctRaw === optB.toUpperCase()) {
            correctIdx = 1;
            correctLetter = 'B';
          } else if (correctRaw === 'C' || correctRaw === '3' || correctRaw === optC.toUpperCase()) {
            correctIdx = 2;
            correctLetter = 'C';
          } else if (correctRaw === 'D' || correctRaw === '4' || correctRaw === optD.toUpperCase()) {
            correctIdx = 3;
            correctLetter = 'D';
          }

          const optionsList = [
            optA || 'Option A',
            optB || 'Option B',
            optC || 'Option C',
            optD || 'Option D'
          ];

          return {
            id: `Q-${Date.now().toString().slice(-4)}-${index + 1}`,
            subject,
            round,
            question: questionText,
            optionA: optionsList[0],
            optionB: optionsList[1],
            optionC: optionsList[2],
            optionD: optionsList[3],
            options: optionsList,
            correct: correctIdx,
            correctOption: correctLetter,
            explanation,
            difficulty
          };
        }).filter(Boolean);

        if (parsedQuestions.length === 0) {
          throw new Error('No valid questions found. Please check column headers (Question, Option_A, Option_B, Option_C, Option_D, Correct_Option).');
        }

        resolve(parsedQuestions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsArrayBuffer(file);
  });
};

// ==========================================
// PARTNER / TEAM MANAGEMENT HELPERS (OFFLINE / LOCAL STORAGE)
// ==========================================

const STORAGE_PARTNER_INVITES_KEY = 'bob_partner_invites_v1';

export const getStoredPartnerInvites = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PARTNER_INVITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredPartnerInvites = (invites) => {
  try {
    localStorage.setItem(STORAGE_PARTNER_INVITES_KEY, JSON.stringify(invites));
    return true;
  } catch {
    return false;
  }
};

export const localGetMyPartnerRequests = (currentStudent) => {
  if (!currentStudent) return { partner: null, teamMembers: [], incoming: [], outgoing: [] };
  const allInvites = getStoredPartnerInvites();
  const participants = getStoredParticipants();
  const me = participants.find(p => p.id === currentStudent.id || p.studentId?.toLowerCase() === currentStudent.studentId?.toLowerCase()) || currentStudent;

  let teamMembers = Array.isArray(me.teamMembers) ? [...me.teamMembers] : [];
  let partner = null;
  if (me.partnerStudentId) {
    const partnerObj = participants.find(p => p.studentId?.toLowerCase() === me.partnerStudentId?.toLowerCase() || p.id === me.partnerId);
    if (partnerObj) {
      partner = {
        id: partnerObj.id,
        fullName: partnerObj.fullName,
        studentId: partnerObj.studentId,
        email: partnerObj.email,
        phone: partnerObj.phone || '0300-0000000',
        department: partnerObj.degreeProgram || partnerObj.department || 'Software Engineering',
        teamId: me.teamId || partnerObj.teamId || `TEAM-${me.studentId?.replace(/[^a-zA-Z0-9]/g, '')}`,
      };
      if (!teamMembers.some(m => m.studentId?.toLowerCase() === partner.studentId?.toLowerCase())) {
        teamMembers.unshift(partner);
      }
    }
  }

  const incoming = allInvites.filter(inv => 
    inv.status === 'Pending' && 
    (inv.toStudentId?.toLowerCase() === me.studentId?.toLowerCase() || inv.toEmail?.toLowerCase() === me.email?.toLowerCase())
  );

  const outgoing = allInvites.filter(inv => 
    inv.status === 'Pending' && 
    (inv.fromStudentId?.toLowerCase() === me.studentId?.toLowerCase() || inv.fromEmail?.toLowerCase() === me.email?.toLowerCase())
  );

  return { partner: teamMembers[0] || partner, teamMembers, incoming, outgoing };
};

export const localAddTeamMember = (currentStudent, targetStudentId, fullName, department) => {
  if (!currentStudent || !targetStudentId) return { success: false, error: 'Student parameters missing.' };
  const participants = getStoredParticipants();
  const cleanTarget = targetStudentId.trim().toLowerCase();
  const rawTarget = targetStudentId.trim();

  if (cleanTarget === currentStudent.studentId?.toLowerCase()) {
    return { success: false, error: 'You cannot add yourself as a teammate.' };
  }

  const me = participants.find(p => p.id === currentStudent.id || p.studentId?.toLowerCase() === currentStudent.studentId?.toLowerCase()) || currentStudent;
  if (!Array.isArray(me.teamMembers)) {
    me.teamMembers = me.partnerStudentId
      ? [{
          id: me.partnerId,
          studentId: me.partnerStudentId,
          fullName: me.partnerName,
          email: me.partnerEmail,
          department: me.partnerDepartment,
          teamId: me.teamId,
        }]
      : [];
  }

  if (me.teamMembers.length >= 3) {
    return { success: false, error: 'Maximum team size reached (Leader + 3 team members = 4 total).' };
  }

  if (me.teamMembers.some(m => m.studentId?.toLowerCase() === cleanTarget)) {
    return { success: false, error: `Student ${rawTarget} is already in your team.` };
  }

  let target = participants.find(p => 
    (p.studentId && p.studentId.toLowerCase() === cleanTarget) ||
    (p.email && p.email.toLowerCase() === cleanTarget)
  );

  // Auto-create target if missing
  if (!target) {
    const upperId = rawTarget.toUpperCase();
    target = {
      id: generateParticipantId(participants),
      fullName: fullName && fullName.trim() ? fullName.trim() : `Student (${upperId})`,
      studentId: upperId,
      universityName: 'COMSATS University Islamabad',
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      email: `${upperId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
      phone: '0300-0000000',
      department: department && department.trim() ? department.trim() : 'Software Engineering',
      degreeProgram: department && department.trim() ? department.trim() : 'BS Software Engineering',
      semester: '4th Semester',
      status: 'Verified',
      registeredAt: new Date().toISOString(),
      partnerId: me.id,
      partnerStudentId: me.studentId,
      partnerName: me.fullName,
      teamId: me.teamId || `TEAM-${me.studentId?.replace(/[^a-zA-Z0-9]/g, '')}`,
      teamMembers: [],
    };
    participants.push(target);
  }

  const teamId = me.teamId || `TEAM-${me.studentId?.replace(/[^a-zA-Z0-9]/g, '')}`;
  me.teamId = teamId;
  const pairedAt = new Date().toISOString();

  const newEntry = {
    id: target.id,
    studentId: target.studentId,
    fullName: target.fullName,
    email: target.email,
    department: target.department || target.degreeProgram || 'Software Engineering',
    pairedAt,
    teamId,
  };

  me.teamMembers.push(newEntry);
  me.partnerId = me.teamMembers[0].id;
  me.partnerStudentId = me.teamMembers[0].studentId;
  me.partnerName = me.teamMembers[0].fullName;
  me.partnerEmail = me.teamMembers[0].email;
  me.partnerDepartment = me.teamMembers[0].department;

  target.teamId = teamId;
  target.partnerId = me.id;
  target.partnerStudentId = me.studentId;
  target.partnerName = me.fullName;

  // Persist
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  setLoggedInStudent({ ...me });

  return {
    success: true,
    message: `${target.fullName} (${target.studentId}) successfully added to your team!`,
    member: newEntry,
    teamMembers: me.teamMembers,
  };
};

export const localRemoveTeamMember = (currentStudent, memberStudentId) => {
  if (!currentStudent || !memberStudentId) return { success: false, error: 'Parameters missing.' };
  const participants = getStoredParticipants();
  const cleanMemberId = memberStudentId.trim().toLowerCase();

  const me = participants.find(p => p.id === currentStudent.id || p.studentId?.toLowerCase() === currentStudent.studentId?.toLowerCase()) || currentStudent;
  if (!Array.isArray(me.teamMembers)) me.teamMembers = [];

  me.teamMembers = me.teamMembers.filter(m => m.studentId?.toLowerCase() !== cleanMemberId);

  if (me.teamMembers.length > 0) {
    me.partnerId = me.teamMembers[0].id;
    me.partnerStudentId = me.teamMembers[0].studentId;
    me.partnerName = me.teamMembers[0].fullName;
    me.partnerEmail = me.teamMembers[0].email;
    me.partnerDepartment = me.teamMembers[0].department;
  } else {
    me.partnerId = null;
    me.partnerStudentId = null;
    me.partnerName = null;
    me.partnerEmail = null;
    me.partnerDepartment = null;
    me.teamId = null;
  }

  const target = participants.find(p => p.studentId?.toLowerCase() === cleanMemberId);
  if (target) {
    target.partnerId = null;
    target.partnerStudentId = null;
    target.partnerName = null;
    target.teamId = null;
  }

  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  setLoggedInStudent({ ...me });

  return { success: true, message: 'Team member removed.', teamMembers: me.teamMembers };
};

export const localSendPartnerRequest = (fromStudent, targetStudentId, fullName, department) => {
  if (!fromStudent || !targetStudentId) return { success: false, error: 'Student parameters missing.' };
  const participants = getStoredParticipants();
  const cleanTarget = targetStudentId.trim().toLowerCase();
  const rawTarget = targetStudentId.trim();

  if (cleanTarget === fromStudent.studentId?.toLowerCase()) {
    return { success: false, error: 'You cannot invite yourself.' };
  }

  let target = participants.find(p => 
    (p.studentId && p.studentId.toLowerCase() === cleanTarget) ||
    (p.email && p.email.toLowerCase() === cleanTarget)
  );

  if (!target) {
    const upperId = rawTarget.toUpperCase();
    target = {
      id: generateParticipantId(participants),
      fullName: fullName && fullName.trim() ? fullName.trim() : `Student (${upperId})`,
      studentId: upperId,
      universityName: 'COMSATS University Islamabad',
      campus: 'Islamabad Campus',
      region: 'Federal Capital',
      email: `${upperId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
      phone: '0300-0000000',
      department: department && department.trim() ? department.trim() : 'Software Engineering',
      degreeProgram: department && department.trim() ? department.trim() : 'BS Software Engineering',
      semester: '4th Semester',
      status: 'Verified',
      registeredAt: new Date().toISOString(),
      teamMembers: [],
    };
    participants.push(target);
    localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
  }

  const allInvites = getStoredPartnerInvites();
  const existingPending = allInvites.find(inv => 
    inv.status === 'Pending' && 
    inv.fromStudentId?.toLowerCase() === fromStudent.studentId?.toLowerCase() &&
    inv.toStudentId?.toLowerCase() === target.studentId?.toLowerCase()
  );

  if (existingPending) {
    return { success: false, error: 'An invitation is already pending for this student.' };
  }

  const newInvite = {
    id: `INV-${Date.now()}`,
    fromId: fromStudent.id,
    fromStudentId: fromStudent.studentId,
    fromName: fromStudent.fullName,
    fromEmail: fromStudent.email,
    fromDepartment: fromStudent.degreeProgram || fromStudent.department || 'Software Engineering',
    toId: target.id,
    toStudentId: target.studentId,
    toName: target.fullName,
    toEmail: target.email,
    sentDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    status: 'Pending',
    createdAt: new Date().toISOString()
  };

  saveStoredPartnerInvites([...allInvites, newInvite]);
  return { success: true, message: `Invitation sent to ${target.fullName}! They will be added once they accept.`, invite: newInvite };
};

export const localRespondPartnerRequest = (requestId, action, currentStudent) => {
  const allInvites = getStoredPartnerInvites();
  const invite = allInvites.find(i => i.id === requestId);
  if (!invite) return { success: false, error: 'Invitation not found.' };

  if (action === 'accept') {
    const participants = getStoredParticipants();
    const teamId = `TEAM-${Date.now().toString().slice(-4)}`;
    const pairedAt = new Date().toISOString();

    const sender = participants.find(p => p.studentId?.toLowerCase() === invite.fromStudentId?.toLowerCase());
    const receiver = participants.find(p => p.studentId?.toLowerCase() === invite.toStudentId?.toLowerCase());

    if (sender && receiver) {
      if (!Array.isArray(sender.teamMembers)) sender.teamMembers = [];
      if (!sender.teamMembers.some(m => m.studentId?.toLowerCase() === receiver.studentId?.toLowerCase())) {
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

      if (!Array.isArray(receiver.teamMembers)) receiver.teamMembers = [];
      if (!receiver.teamMembers.some(m => m.studentId?.toLowerCase() === sender.studentId?.toLowerCase())) {
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

      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));

      const current = getLoggedInStudent();
      if (current) {
        if (current.studentId?.toLowerCase() === receiver.studentId?.toLowerCase()) {
          setLoggedInStudent({ ...receiver });
        } else if (current.studentId?.toLowerCase() === sender.studentId?.toLowerCase()) {
          setLoggedInStudent({ ...sender });
        }
      }
    }

    const updatedInvites = allInvites.map(i => i.id === requestId ? { ...i, status: 'Accepted' } : i);
    saveStoredPartnerInvites(updatedInvites);

    return { success: true, message: `Successfully joined team with ${invite.fromName}!` };
  } else {
    const updatedInvites = allInvites.map(i => i.id === requestId ? { ...i, status: 'Declined' } : i);
    saveStoredPartnerInvites(updatedInvites);
    return { success: true, message: 'Invitation declined.' };
  }
};

export const localCancelPartnerRequest = (requestId) => {
  const allInvites = getStoredPartnerInvites();
  const filtered = allInvites.filter(i => i.id !== requestId);
  saveStoredPartnerInvites(filtered);
  return { success: true, message: 'Invitation cancelled.' };
};

export const localUnpairPartner = (studentId) => {
  const participants = getStoredParticipants();
  const cleanId = studentId?.toLowerCase();
  const me = participants.find(p => p.studentId?.toLowerCase() === cleanId);
  const partnerId = me?.partnerStudentId?.toLowerCase();
  const oldMembers = Array.isArray(me?.teamMembers) ? me.teamMembers.map(m => m.studentId?.toLowerCase()) : [];

  const updated = participants.map(p => {
    const pId = p.studentId?.toLowerCase();
    if (pId === cleanId || (partnerId && pId === partnerId) || oldMembers.includes(pId)) {
      const copy = { ...p };
      delete copy.partnerStudentId;
      delete copy.partnerName;
      delete copy.partnerId;
      delete copy.teamId;
      copy.teamMembers = [];
      return copy;
    }
    return p;
  });

  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(updated));
  const current = getLoggedInStudent();
  if (current) {
    const copy = { ...current };
    delete copy.partnerStudentId;
    delete copy.partnerName;
    delete copy.partnerId;
    delete copy.teamId;
    copy.teamMembers = [];
    setLoggedInStudent(copy);
  }
  return { success: true, message: 'Successfully left the team.' };
};


// ==========================================
// TEAM FORMATION STORAGE HELPERS (FOR STATIC/OFFLINE HOSTS LIKE VERCEL)
// ==========================================

export const getStoredTeams = () => {
  try {
    const raw = localStorage.getItem('bob_teams_v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveStoredTeams = (teams) => {
  try {
    localStorage.setItem('bob_teams_v1', JSON.stringify(teams));
    return true;
  } catch {
    return false;
  }
};

export const localCreateTeam = (teamData) => {
  const teams = getStoredTeams();
  const inviteCode = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const teamId = 'TEAM-' + Date.now().toString().slice(-6);
  const targetSize = Number(teamData.targetSize) || 3;

  const leaderId = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
  const cleanMobile = (teamData.leaderMobile || '').replace(/[^\d]/g, '');
  const leaderStudentId = 'LEAD-' + (cleanMobile.slice(-4) || Date.now().toString().slice(-4));

  const leader = {
    id: leaderId,
    studentId: leaderStudentId,
    fullName: teamData.leaderFullName || 'Team Leader',
    mobile: teamData.leaderMobile || '',
    phone: teamData.leaderMobile || '',
    email: (teamData.leaderEmail || teamData.email || '').trim() || `${cleanMobile || 'leader'}@student.bob.pk`,
    universityName: teamData.universityName || 'COMSATS University Islamabad',
    department: teamData.department || 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    teamId,
    isTeamLeader: true,
    role: 'Participant',
    registrationStatus: 'Approved',
    registeredAt: new Date().toISOString(),
  };

  const newTeam = {
    id: teamId,
    name: teamData.teamName || 'Battle Champions',
    inviteCode,
    leaderId,
    leaderStudentId,
    targetSize,
    status: 'forming',
    members: [
      {
        id: leader.id,
        studentId: leader.studentId,
        fullName: leader.fullName,
        mobile: leader.mobile,
        email: leader.email,
        role: 'Leader',
        joinedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    confirmedAt: null,
  };

  teams.push(newTeam);
  saveStoredTeams(teams);

  // Save leader to participants
  const participants = getStoredParticipants() || [];
  participants.push(leader);
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));
  setLoggedInStudent(leader);

  return {
    success: true,
    team: newTeam,
    participant: leader,
    inviteCode,
    message: 'Team created successfully!',
  };
};

export const localGetTeamByInvite = (code) => {
  if (!code) return { success: false, error: 'Invitation code is required.' };
  const cleanCode = String(code).trim().toUpperCase();
  const teams = getStoredTeams();
  let found = teams.find((t) => (t.inviteCode || '').toUpperCase() === cleanCode);

  // Cross-device fallback for static hosts (e.g. Vercel deployment where code was generated on Leader's phone/PC):
  // If not in local storage on this browser, construct the team so teammate is NEVER blocked!
  if (!found) {
    found = {
      id: 'TEAM-' + (cleanCode.replace(/[^A-Z0-9]/g, '').slice(-6) || '2026'),
      name: 'Battle of Brains Team',
      inviteCode: cleanCode,
      targetSize: 3,
      status: 'forming',
      members: [
        {
          id: 'BOB-2026-LEAD',
          studentId: 'LEAD-2026',
          fullName: 'Team Leader',
          mobile: '0300 0000000',
          role: 'Leader',
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };
    teams.push(found);
    saveStoredTeams(teams);
  }

  const currentCount = found.members?.length || 1;
  const targetSize = found.targetSize || 3;
  return {
    success: true,
    team: {
      id: found.id,
      name: found.name,
      inviteCode: found.inviteCode,
      targetSize,
      currentCount,
      countDisplay: `${currentCount}/${targetSize}`,
      isFull: currentCount >= targetSize,
      status: found.status,
      leaderName: found.members?.find((m) => m.role === 'Leader')?.fullName || 'Team Leader',
      members: (found.members || []).map((m) => ({
        fullName: m.fullName,
        role: m.role,
      })),
    },
  };
};

export const localJoinTeam = (joinData) => {
  const cleanCode = String(joinData.inviteCode || '').trim().toUpperCase();
  const teams = getStoredTeams();
  let team = teams.find((t) => (t.inviteCode || '').toUpperCase() === cleanCode);

  if (!team) {
    team = {
      id: 'TEAM-' + (cleanCode.replace(/[^A-Z0-9]/g, '').slice(-6) || '2026'),
      name: 'Battle of Brains Team',
      inviteCode: cleanCode,
      targetSize: 3,
      status: 'forming',
      members: [
        {
          id: 'BOB-2026-LEAD',
          studentId: 'LEAD-2026',
          fullName: 'Team Leader',
          mobile: '0300 0000000',
          role: 'Leader',
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };
    teams.push(team);
  }

  if (team.members.length >= (team.targetSize || 3) || team.members.length >= 3) {
    return { success: false, error: `This team already has the maximum allowed members (${team.targetSize}/${team.targetSize}).` };
  }

  const participants = getStoredParticipants() || [];
  const cleanMobile = (joinData.mobile || '').replace(/[^\d]/g, '');

  const dup = participants.find((p) => (p.mobile || p.phone || '').replace(/[^\d]/g, '').endsWith(cleanMobile.slice(-10)));
  if (dup) {
    return { success: false, error: `Mobile number "${joinData.mobile}" is already registered. Each student must use a unique mobile number.` };
  }

  const memberId = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
  const studentId = 'MEM-' + (cleanMobile.slice(-4) || Date.now().toString().slice(-4));

  const newMember = {
    id: memberId,
    studentId,
    fullName: joinData.fullName,
    mobile: joinData.mobile,
    phone: joinData.mobile,
    email: (joinData.email && joinData.email.trim()) ? joinData.email.trim() : `${cleanMobile || 'member'}@student.bob.pk`,
    universityName: 'COMSATS University Islamabad',
    department: 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    teamId: team.id,
    isTeamLeader: false,
    role: 'Participant',
    registrationStatus: 'Approved',
    registeredAt: new Date().toISOString(),
  };

  participants.push(newMember);
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));

  team.members.push({
    id: newMember.id,
    studentId: newMember.studentId,
    fullName: newMember.fullName,
    mobile: newMember.mobile,
    email: newMember.email,
    semester: newMember.semester,
    role: 'Member',
    status: 'confirmed',
    joinedAt: new Date().toISOString(),
  });

  // Automatically confirm team when reaching 2 or more members
  if (team.members.length >= 2) {
    team.status = 'confirmed';
    team.confirmedAt = new Date().toISOString();
  }

  saveStoredTeams(teams);
  setLoggedInStudent(newMember);

  return {
    success: true,
    message: `You have successfully joined and confirmed in team "${team.name}"!`,
    team,
    participant: newMember,
  };
};

export const localAddTeamMemberDirect = (memberData) => {
  const current = getLoggedInStudent();
  const teams = getStoredTeams();
  let team = null;
  if (memberData.teamId) team = teams.find((t) => t.id === memberData.teamId);
  if (!team && memberData.teamName) team = teams.find((t) => t.name === memberData.teamName || t.id === memberData.teamName);
  if (!team && current?.teamId) team = teams.find((t) => t.id === current.teamId);
  if (!team && current) team = teams.find((t) => (t.members || []).some((m) => m.id === current.id));
  if (!team && teams.length > 0) team = teams[teams.length - 1];

  if (!team) {
    return { success: false, error: 'No active team found to add member to.' };
  }

  if (team.members.length >= (team.targetSize || 3) || team.members.length >= 3) {
    return { success: false, error: `Cannot add more members. Team already has ${team.members.length} members (maximum 3).` };
  }

  const participants = getStoredParticipants() || [];
  const cleanMobile = (memberData.mobile || '').replace(/[^\d]/g, '');

  const memberId = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
  const studentId = 'MEM-' + (cleanMobile.slice(-4) || Date.now().toString().slice(-4));

  const newMember = {
    id: memberId,
    studentId,
    fullName: memberData.fullName,
    mobile: memberData.mobile,
    phone: memberData.mobile,
    email: (memberData.email && memberData.email.trim()) ? memberData.email.trim() : `${cleanMobile || 'member'}@student.bob.pk`,
    universityName: current?.universityName || team.universityName || 'COMSATS University Islamabad',
    department: memberData.department || current?.department || 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: memberData.semester || '4th Semester',
    teamId: team.id,
    teamName: team.name,
    isTeamLeader: false,
    role: 'Participant',
    registrationStatus: 'Approved',
    registeredAt: new Date().toISOString(),
  };

  participants.push(newMember);
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));

  const memberEntry = {
    id: newMember.id,
    studentId: newMember.studentId,
    fullName: newMember.fullName,
    mobile: newMember.mobile,
    email: newMember.email,
    semester: newMember.semester,
    role: 'Member',
    status: 'confirmed',
    joinedAt: new Date().toISOString(),
  };

  team.members.push(memberEntry);

  // Automatically confirm team when reaching 2 or more members
  if (team.members.length >= 2) {
    team.status = 'confirmed';
    team.confirmedAt = new Date().toISOString();
  }

  saveStoredTeams(teams);

  return {
    success: true,
    message: `${newMember.fullName} added and confirmed in your team successfully!`,
    team,
    member: newMember,
  };
};

export const localFinalizeTeam = (teamName, teamId) => {
  const current = getLoggedInStudent();
  const teams = getStoredTeams();
  let team = null;
  if (teamId) team = teams.find((t) => t.id === teamId);
  if (!team && teamName) team = teams.find((t) => t.name === teamName || t.id === teamName);
  if (!team && current?.teamId) team = teams.find((t) => t.id === current.teamId);
  if (!team && current) team = teams.find((t) => (t.members || []).some((m) => m.id === current.id));
  if (!team && teams.length > 0) team = teams[teams.length - 1];

  if (!team) {
    return { success: false, error: 'Team not found.' };
  }

  if (teamName && teamName.trim()) {
    team.name = teamName.trim();
  }
  team.status = 'confirmed';
  team.confirmedAt = new Date().toISOString();

  // Mark all members as confirmed
  (team.members || []).forEach((m) => {
    m.status = 'confirmed';
  });

  saveStoredTeams(teams);

  // Update participant list
  const participants = getStoredParticipants() || [];
  participants.forEach((p) => {
    if (p.teamId === team.id || (team.members || []).some((m) => m.id === p.id || m.mobile === p.mobile)) {
      p.teamStatus = 'confirmed';
      p.registrationStatus = 'Approved';
      p.teamId = team.id;
    }
  });
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));

  return {
    success: true,
    message: `Team "${team.name}" registration finalized and confirmed successfully with ${team.members.length} members!`,
    team,
  };
};

export const localGetMyTeam = () => {
  const current = getLoggedInStudent();
  const teams = getStoredTeams();
  let team = null;

  if (current?.teamId) {
    team = teams.find((t) => t.id === current.teamId);
  }
  if (!team && current) {
    team = teams.find((t) => (t.members || []).some((m) => m.id === current.id || m.mobile === current.mobile || m.studentId === current.studentId));
  }
  if (!team && teams.length > 0) {
    team = teams[teams.length - 1];
  }

  if (!team) return { success: false, team: null };

  const targetSize = team.targetSize || 3;
  const currentCount = team.members ? team.members.length : 1;
  const isLeader = team.leaderId === current?.id || team.leaderStudentId === current?.studentId || current?.isTeamLeader;

  return {
    success: true,
    team: {
      ...team,
      currentCount,
      targetSize,
      countDisplay: `${currentCount}/${targetSize}`,
      isLeader,
      isFull: currentCount >= targetSize || currentCount >= 3,
      canFinalize: currentCount >= 2 && currentCount <= 3 && team.status !== 'confirmed',
    },
  };
};

export const localAdminCreateTeam = (teamData) => {
  const teams = getStoredTeams();
  const inviteCode = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const teamId = 'TEAM-' + Date.now().toString().slice(-6);
  const targetSize = Number(teamData.targetSize) || 3;

  const participants = getStoredParticipants() || [];

  // 1. Leader
  const cleanLMobile = (teamData.leader?.mobile || '').replace(/[^\d]/g, '');
  const leaderId = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
  const leaderStudentId = 'LEAD-' + (cleanLMobile.slice(-4) || '1001');
  const leaderEmail = teamData.leader?.email?.trim() || `${cleanLMobile || 'leader'}@student.bob.pk`;

  const leader = {
    id: leaderId,
    studentId: leaderStudentId,
    fullName: teamData.leader?.fullName || 'Team Leader',
    mobile: teamData.leader?.mobile || '',
    phone: teamData.leader?.mobile || '',
    email: leaderEmail,
    universityName: 'COMSATS University Islamabad',
    department: 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    teamId,
    isTeamLeader: true,
    role: 'Participant',
    registrationStatus: 'Approved',
    registeredAt: new Date().toISOString(),
  };

  // 2. Member 2
  const cleanM2Mobile = (teamData.member2?.mobile || '').replace(/[^\d]/g, '');
  const m2Id = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
  const m2StudentId = 'MEM-' + (cleanM2Mobile.slice(-4) || '1002');
  const m2Email = teamData.member2?.email?.trim() || `${cleanM2Mobile || 'member2'}@student.bob.pk`;

  const member2 = {
    id: m2Id,
    studentId: m2StudentId,
    fullName: teamData.member2?.fullName || 'Teammate 2',
    mobile: teamData.member2?.mobile || '',
    phone: teamData.member2?.mobile || '',
    email: m2Email,
    universityName: 'COMSATS University Islamabad',
    department: 'Computer Science',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    teamId,
    isTeamLeader: false,
    role: 'Participant',
    registrationStatus: 'Approved',
    registeredAt: new Date().toISOString(),
  };

  participants.push(leader, member2);

  const teamMembers = [
    {
      id: leader.id,
      studentId: leader.studentId,
      fullName: leader.fullName,
      email: leader.email,
      mobile: leader.mobile,
      role: 'Leader',
      joinedAt: new Date().toISOString(),
    },
    {
      id: member2.id,
      studentId: member2.studentId,
      fullName: member2.fullName,
      email: member2.email,
      mobile: member2.mobile,
      role: 'Member',
      joinedAt: new Date().toISOString(),
    },
  ];

  // 3. Member 3 (if targetSize === 3 and provided)
  if (targetSize === 3 && teamData.member3 && teamData.member3.fullName?.trim()) {
    const cleanM3Mobile = (teamData.member3.mobile || '').replace(/[^\d]/g, '');
    const m3Id = 'BOB-2026-' + Math.floor(100 + Math.random() * 900);
    const m3StudentId = 'MEM-' + (cleanM3Mobile.slice(-4) || '1003');
    const m3Email = teamData.member3.email?.trim() || `${cleanM3Mobile || 'member3'}@student.bob.pk`;

    const member3 = {
      id: m3Id,
      studentId: m3StudentId,
      fullName: teamData.member3.fullName,
      mobile: teamData.member3.mobile || '',
      phone: teamData.member3.mobile || '',
      email: m3Email,
      universityName: 'COMSATS University Islamabad',
      department: 'Computer Science',
      degreeProgram: 'BS Computer Science',
      semester: '4th Semester',
      teamId,
      isTeamLeader: false,
      role: 'Participant',
      registrationStatus: 'Approved',
      registeredAt: new Date().toISOString(),
    };
    participants.push(member3);
    teamMembers.push({
      id: member3.id,
      studentId: member3.studentId,
      fullName: member3.fullName,
      email: member3.email,
      mobile: member3.mobile,
      role: 'Member',
      joinedAt: new Date().toISOString(),
    });
  }

  const newTeam = {
    id: teamId,
    name: teamData.name || 'Champion Team',
    inviteCode,
    leaderId,
    leaderStudentId,
    targetSize,
    status: 'confirmed',
    members: teamMembers,
    createdAt: new Date().toISOString(),
    confirmedAt: new Date().toISOString(),
  };

  teams.push(newTeam);
  saveStoredTeams(teams);
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));

  return {
    success: true,
    team: newTeam,
    message: `Team "${newTeam.name}" created successfully!`,
  };
};

export const localDeleteTeam = (teamId) => {
  const teams = getStoredTeams();
  const target = teams.find(t => t.id === teamId || t.name === teamId);
  if (!target) return { success: false, error: 'Team not found' };

  const updatedTeams = teams.filter(t => t.id !== target.id);
  saveStoredTeams(updatedTeams);

  const participants = getStoredParticipants() || [];
  participants.forEach(p => {
    if (p.teamId === target.id) {
      p.teamId = null;
      p.isTeamLeader = false;
    }
  });
  localStorage.setItem('bob_registered_participants_v2', JSON.stringify(participants));

  return { success: true, message: `Team "${target.name}" deleted successfully` };
};

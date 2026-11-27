export const COMPETITION_DETAILS = {
  title: "BATTLE OF BRAINS",
  subtitle: "University Quiz Competition 2026",
  tagline: "Challenge Your Knowledge, Test Your Intelligence, and Compete to Become the Ultimate Champion!",
  edition: "COMSATS University Islamabad Annual Championship",
  organizer: "Department of Computer Science & Information Technology",
  university: "COMSATS University Islamabad",
  campusBadge: "NOVEMBER 20, 2026 • COMSATS UNIVERSITY ISLAMABAD",
  defaultEventDate: "2026-11-20T09:00:00",
  venue: "Main University Auditorium & CS Computing Complex",
  eligibility: "Open to All Enrolled Students (Individual Participation)",
  participationMode: "Individual / Solo Competitor",
  entryFee: "Free Registration (Sponsored by CS Society)",
  reportingTime: "08:50 AM (10 Minutes Prior to Start)",
};

export const HIGHLIGHT_STATS = [
  { value: "07", label: "Core CS Subjects", detail: "Foundational to advanced computing domains" },
  { value: "01", label: "Combined Grand Round", detail: "All 7 subjects in one comprehensive battle" },
  { value: "Solo", label: "Individual Competitor", detail: "Test your personal intellectual prowess" },
  { value: "100%", label: "Fair Play & Live Telemetry", detail: "Automated timers & Pakistan Standard Time (PKT) scheduling" },
];

export const COMPETITION_SUBJECTS = [
  {
    id: "pf",
    code: "CS-101",
    name: "Programming Fundamentals",
    icon: "Terminal",
    description: "Core syntax, structured logic, control flow, functions, memory pointers, dynamic arrays, and basic problem decomposition.",
    topics: ["Variables & Operators", "Control Structures & Loops", "Pointers & Memory Allocation", "Functions & Recursion"],
    difficulty: "Core Foundational",
    color: "from-blue-500/20 to-indigo-600/20",
    accent: "text-blue-400",
  },
  {
    id: "oop",
    code: "CS-201",
    name: "Object Oriented Programming",
    icon: "Boxes",
    description: "Encapsulation, inheritance hierarchies, runtime polymorphism, abstract classes, operator overloading, and design patterns.",
    topics: ["Classes & Objects", "Inheritance & Polymorphism", "Abstraction & Interfaces", "Templates & Solid Principles"],
    difficulty: "Intermediate",
    color: "from-cyan-500/20 to-blue-600/20",
    accent: "text-cyan-400",
  },
  {
    id: "dsa",
    code: "CS-202",
    name: "Data Structures & Algorithms",
    icon: "Binary",
    description: "Linear and non-linear data structures, trees, graphs, dynamic programming, greedy algorithms, and asymptotic complexity analysis.",
    topics: ["Trees, AVL & Graphs", "Sorting & Searching", "Dynamic Programming", "Big-O Asymptotic Analysis"],
    difficulty: "Advanced",
    color: "from-emerald-500/20 to-teal-600/20",
    accent: "text-emerald-400",
  },
  {
    id: "dbms",
    code: "CS-301",
    name: "Database Systems",
    icon: "Database",
    description: "Relational algebra, advanced SQL queries, normal forms (1NF through BCNF), indexing, transaction management, and ACID compliance.",
    topics: ["Relational Model & SQL", "Normalization (1NF–BCNF)", "Transactions & Concurrency", "Indexing & Query Optimization"],
    difficulty: "Intermediate",
    color: "from-indigo-500/20 to-blue-600/20",
    accent: "text-indigo-400",
  },
  {
    id: "cn",
    code: "CS-302",
    name: "Computer Networks",
    icon: "Network",
    description: "Layered architecture (OSI & TCP/IP), subnetting, switching, routing protocols (OSPF/BGP), transport protocols, and cybersecurity foundations.",
    topics: ["OSI & TCP/IP Layers", "IP Addressing & Subnetting", "Routing & Switching", "Network Security Protocols"],
    difficulty: "Intermediate",
    color: "from-violet-500/20 to-purple-600/20",
    accent: "text-violet-400",
  },
  {
    id: "se",
    code: "CS-303",
    name: "Software Engineering",
    icon: "GitBranch",
    description: "Software lifecycle models, Agile/Scrum methodologies, architectural styles, requirement engineering, unit testing, and CI/CD pipelines.",
    topics: ["SDLC & Agile Frameworks", "Design Patterns & Architecture", "Software Testing & QA", "CI/CD & Version Control"],
    difficulty: "Applied Systems",
    color: "from-rose-500/20 to-pink-600/20",
    accent: "text-rose-400",
  },
  {
    id: "os",
    code: "CS-401",
    name: "Operating Systems",
    icon: "Cpu",
    description: "Process synchronization, CPU scheduling algorithms, memory virtualization, paging, deadlock prevention, and distributed file systems.",
    topics: ["Processes, Threads & Concurrency", "CPU Scheduling & Deadlocks", "Virtual Memory & Paging", "File Systems & I/O Subsystems"],
    difficulty: "Advanced Systems",
    color: "from-amber-500/20 to-orange-600/20",
    accent: "text-amber-400",
  },
];

export const DEFAULT_SCHEDULE = {
  startDate: "10/12/2026",
  startTime: "10:00 AM",
  endDate: "10/12/2026",
  endTime: "11:00 AM",
  timezone: "Asia/Karachi",
  status: "scheduled", // "scheduled" | "live" | "stopped" | "ended"
  isPublished: true,
  publishedQuestionCount: 14,
};

export const COMPETITION_ROUNDS = [
  {
    roundNumber: 1,
    title: "BATTLE OF BRAINS — COMBINED GRAND QUIZ",
    stageBadge: "Official Single Round • All 7 CS Subjects",
    timeLimit: "30 seconds per question",
    timeLimitSeconds: 30,
    questionsCount: "Admin-defined (Equally distributed across all 7 subjects)",
    markingScheme: "+1 point for correct answer",
    negativeMarking: "No negative marking (0 pts)",
    strictRule: "Strict 30 seconds per question. Answers will NOT be accepted after timer expires.",
    qualification: "Highest cumulative score crowns the Grand Champion of Battle of Brains 2026.",
    status: "Grand Championship Stage",
    icon: "Trophy",
    isActive: true,
    isCompleted: false,
    highlights: [
      "All 7 Core CS Subjects: PF, OOP, DSA, DBMS, Networks, Software Eng & OS",
      "Strict 30-second countdown timer per question",
      "+1 point for correct answer, 0 for wrong, NO negative marking",
      "Admin-controlled competition window in Pakistan Standard Time (PKT)",
      "Strict one attempt per student/team with admin retake authorization",
    ],
  },
];

export const RULES_AND_REGULATIONS = {
  generalRules: [
    {
      title: "Individual Participation Only",
      description: "Each participant competes as an individual (solo competitor). Group entries, pairs, or team collaborations are strictly not allowed.",
      icon: "User",
    },
    {
      title: "Mandatory Student Identification",
      description: "All participants must carry their original, valid University Student ID cards. Verification will take place at the reception registration desk.",
      icon: "IdCard",
    },
    {
      title: "Prohibited Electronic Devices",
      description: "Mobile phones, smartwatches, programmable calculators, Bluetooth devices, and external notes are strictly prohibited inside the competition arena.",
      icon: "PhoneOff",
    },
    {
      title: "Anti-Cheating & Integrity",
      description: "Cheating, prompting from the audience, unauthorized side discussions, or unfair means will lead to immediate and irreversible disqualification.",
      icon: "ShieldAlert",
    },
    {
      title: "Finality of Organizer Decisions",
      description: "The official jury and panel of judges' decisions regarding points, timing, buzzer logs, and disputes are final and binding on all participants.",
      icon: "Gavel",
    },
    {
      title: "Punctuality & Reporting",
      description: "Participants must report to the competition venue at least 10 minutes before the scheduled start time. Late arrivals forfeit their slot without exception.",
      icon: "Clock",
    },
  ],
  tieBreakerRules: [
    {
      title: "Time-Efficiency Ranking",
      description: "If two or more participants finish with equal scores, the candidate who completed the quiz with lower total elapsed time is awarded the higher standing.",
      step: "Rule 1",
    },
    {
      title: "Tie-Breaker Rapid Questions",
      description: "If participants have identical scores and exact matching submission times, 2 additional tie-breaker questions covering core CS concepts will be administered.",
      step: "Rule 2",
    },
  ],
  disqualificationRules: [
    {
      reason: "Using Phones or External Help",
      severity: "Immediate Disqualification & University Disciplinary Notification",
      description: "Any participant found consulting a phone, wearable smart tech, internet search, or audience member will be disqualified instantly.",
    },
    {
      reason: "Misbehaving with Judges or Organizers",
      severity: "Immediate Disqualification & Event Ban",
      description: "Disrespectful conduct, aggressive arguments with referees, or inappropriate language towards fellow participants will result in immediate eviction.",
    },
    {
      reason: "Pressing the Buzzer Repeatedly without Reason",
      severity: "Official Warning, Followed by Point Deductions & Disqualification",
      description: "Frivolous, premature, or spam buzzer clicks intended to distract opponents or game the hardware will incur -1 point and potential disqualification.",
    },
    {
      reason: "Intentionally Delaying the Rounds",
      severity: "Forfeit of Current Round Turn",
      description: "Unreasonable stalls, refusal to answer within designated clock ticks, or disruptive stalling tactics will result in turn forfeiture.",
    },
  ],
};

export const FAQ_LIST = [
  {
    q: "Can students from any department participate?",
    a: "Yes! The competition is open to all undergraduate university students from CS, SE, IT, AI, Cyber Security, Data Science, and Engineering departments who hold a valid Student ID."
  },
  {
    q: "Is there any registration fee for the competition?",
    a: "No, participation in Battle of Brains is 100% free, fully sponsored by the Department of Computer Science & Student Affairs."
  },
  {
    q: "Can I participate as part of a team?",
    a: "No, this edition of Battle of Brains is exclusively an individual (solo competitor) quiz championship."
  },
  {
    q: "What hardware will be provided for the Buzzer Final?",
    a: "The final stage features official digital micro-controller buzzer pads connected to real-time millisecond latency display screens in the auditorium."
  },
];

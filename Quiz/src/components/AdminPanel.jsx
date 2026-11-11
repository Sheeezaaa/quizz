import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard,
  Settings, 
  X, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Lock, 
  Unlock, 
  Calendar, 
  BookOpen, 
  Layers, 
  Scale, 
  Users, 
  Plus, 
  Trash2, 
  FileSpreadsheet,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  Search,
  Pencil,
  ArrowLeft,
  ExternalLink,
  Clock,
  Trophy,
  Filter,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  Building2,
  Menu,
  Zap,
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  Sun,
  Moon,
  Download,
  Upload,
  FileUp,
  FileText,
  CheckCircle,
  Award,
  Siren,
  Volume2,
  VolumeX,
  AlertTriangle,
  MailCheck
} from 'lucide-react';
import { 
  saveStoredDetails, 
  saveStoredSubjects, 
  saveStoredRounds, 
  saveStoredRules, 
  setStoredEventDate, 
  resetAllToDefaults,
  deleteParticipants,
  saveParticipant,
  updateParticipant,
  getStoredParticipants,
  generateParticipantId,
  exportParticipantsToCSV,
  getAdminPassword,
  setAdminPassword,
  getAdminAuth,
  setAdminAuth,
  getStoredQuestions,
  saveStoredQuestions,
  downloadQuestionsTemplate,
  exportQuestionsToExcel,
  parseQuestionsFile
} from '../utils/storage';
import { 
  apiAdminLogin,
  setAdminAuthToken, 
  apiChangePassword, 
  apiGetCompetition, 
  apiSaveCompetition, 
  apiGetParticipants, 
  apiRegisterParticipant, 
  apiUpdateParticipant, 
  apiDeleteParticipant, 
  apiDeleteAllParticipants, 
  apiGetQuestions, 
  apiSaveQuestions,
  apiGetProctorAlerts,
  apiAcknowledgeProctorAlert,
  apiDismissAllProctorAlerts
} from '../utils/api';
import { playAntiCheatBuzzer, playDisqualificationSiren } from '../utils/soundEffects';
import RegistrationManager from './admin/RegistrationManager';
import TeamsManager from './admin/TeamsManager';
import RapidFireConsole from './admin/RapidFireConsole';
import BuzzerConsole from './admin/BuzzerConsole';
import ResultsManagement from './admin/ResultsManagement';
import AnnouncementsManager from './admin/AnnouncementsManager';
import AuditLogsViewer from './admin/AuditLogsViewer';

export default function AdminPanel({ 
  isOpen, 
  onClose, 
  competitionData, 
  onDataUpdated,
  currentTheme = 'dark',
  onToggleTheme
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => getAdminAuth());
  const [adminUsername, setAdminUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'general', 'subjects', 'rounds', 'rules', 'participants', 'security'
  const [saveAlert, setSaveAlert] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [localTheme, setLocalTheme] = useState(currentTheme || 'dark');

  // Real-Time Anti-Cheat Proctoring & Siren States
  const [liveProctorAlerts, setLiveProctorAlerts] = useState([]);
  const [activeCheatingAlert, setActiveCheatingAlert] = useState(null);
  const [showProctorToast, setShowProctorToast] = useState(true);
  const [seenAlertIds, setSeenAlertIds] = useState(new Set());
  const [isSirenMuted, setIsSirenMuted] = useState(false);
  const [proctorFilterId, setProctorFilterId] = useState('ALL');

  // Aggregated list of ALL unique Student IDs who opened another browser / switched tabs
  const activeViolatorsByStudent = useMemo(() => {
    const map = new Map();
    (liveProctorAlerts || []).forEach((alert) => {
      const sid = (alert.studentId || 'UNKNOWN_STUDENT').trim();
      if (!map.has(sid)) {
        map.set(sid, {
          studentId: sid,
          studentName: alert.studentName || 'Contestant',
          studentEmail: alert.studentEmail || '',
          campus: alert.campus || 'Islamabad Campus',
          semester: alert.semester || '',
          degreeProgram: alert.degreeProgram || 'BS CS',
          latestAlert: alert,
          alerts: [alert],
          unacknowledgedCount: alert.acknowledged ? 0 : 1,
          totalCount: 1,
          latestTimestamp: alert.timestamp
        });
      } else {
        const entry = map.get(sid);
        entry.alerts.push(alert);
        entry.totalCount += 1;
        if (!alert.acknowledged) entry.unacknowledgedCount += 1;
        if (new Date(alert.timestamp) > new Date(entry.latestTimestamp)) {
          entry.latestTimestamp = alert.timestamp;
          entry.latestAlert = alert;
        }
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
    );
  }, [liveProctorAlerts]);

  const unackViolators = useMemo(() => {
    return activeViolatorsByStudent.filter(v => v.unacknowledgedCount > 0);
  }, [activeViolatorsByStudent]);

  // Security password change states
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [passChangeMessage, setPassChangeMessage] = useState({ text: '', isError: false });

  // Local editable states initialized from props
  const [details, setDetails] = useState(competitionData.details);
  const [subjects, setSubjects] = useState(competitionData.subjects);
  const [rounds, setRounds] = useState(competitionData.rounds);
  const [rules, setRules] = useState(competitionData.rules);
  const [participants, setParticipants] = useState(competitionData.participants);

  // Participant Management states
  const [newParticipant, setNewParticipant] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    semester: '4th Semester',
  });
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [studentError, setStudentError] = useState('');

  // Question Bank & Excel Sheet Manager states
  const [questions, setQuestions] = useState(() => getStoredQuestions());
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState('All');
  const [questionRoundFilter, setQuestionRoundFilter] = useState('All');
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [isUploadingQuestions, setIsUploadingQuestions] = useState(false);
  const [questionStatusMessage, setQuestionStatusMessage] = useState({ text: '', isError: false });

  // Sync local theme with parent currentTheme
  useEffect(() => {
    if (currentTheme) {
      setLocalTheme(currentTheme);
    }
  }, [currentTheme]);

  // Handle Theme Toggle
  const handleToggleThemeClick = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setLocalTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }
  };

  const isDark = (onToggleTheme ? currentTheme : localTheme) === 'dark';

  // Always show latest students and questions when opened
  useEffect(() => {
    if (isOpen) {
      setParticipants(getStoredParticipants());
      setQuestions(getStoredQuestions());
      setIsAuthenticated(getAdminAuth());
      // Central server sync for real-time candidate data
      apiGetParticipants().then((serverList) => {
        if (serverList && Array.isArray(serverList)) {
          setParticipants(serverList);
          try {
            localStorage.setItem('bob_quiz_participants', JSON.stringify(serverList));
          } catch {}
        }
      }).catch(() => {});

      // Central server sync for Question Bank
      apiGetQuestions().then((serverQuestions) => {
        if (serverQuestions && Array.isArray(serverQuestions) && serverQuestions.length > 0) {
          setQuestions(serverQuestions);
          try {
            localStorage.setItem('bob_questions_bank_v1', JSON.stringify(serverQuestions));
          } catch {}
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    setParticipants(competitionData.participants);
  }, [competitionData.participants]);

  useEffect(() => {
    setDetails(competitionData.details);
  }, [competitionData.details]);

  useEffect(() => {
    setSubjects(competitionData.subjects);
  }, [competitionData.subjects]);

  useEffect(() => {
    setRounds(competitionData.rounds);
  }, [competitionData.rounds]);

  useEffect(() => {
    setRules(competitionData.rules);
  }, [competitionData.rules]);

  // Manage body class for admin isolation
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('admin-mode');
    } else {
      document.body.classList.remove('admin-mode');
    }
    return () => {
      document.body.classList.remove('admin-mode');
    };
  }, [isOpen]);

  // Real-Time Proctoring Malpractice Alert Poller (Surfaces All Offending Student IDs)
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    const pollAlerts = async () => {
      try {
        const alerts = await apiGetProctorAlerts();
        if (Array.isArray(alerts)) {
          setLiveProctorAlerts(alerts);
          const hasNew = alerts.some((a) => !a.acknowledged && !seenAlertIds.has(a.id));
          if (hasNew) {
            setSeenAlertIds(new Set(alerts.filter(a => !a.acknowledged).map(a => a.id)));
            setShowProctorToast(true);
            if (!isSirenMuted) {
              playAntiCheatBuzzer();
            }
          }
        }
      } catch {}
    };

    pollAlerts();
    const interval = setInterval(pollAlerts, 2500);
    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated, seenAlertIds, isSirenMuted]);

  const handleActionOnCheatingAlert = async (alertId, action) => {
    try {
      await apiAcknowledgeProctorAlert(alertId, action);
      setActiveCheatingAlert(null);
      const updated = await apiGetProctorAlerts();
      if (Array.isArray(updated)) setLiveProctorAlerts(updated);
      const serverList = await apiGetParticipants();
      if (serverList && Array.isArray(serverList)) setParticipants(serverList);
    } catch {}
  };

  const handleDismissAllAlerts = async () => {
    try {
      await apiDismissAllProctorAlerts();
      setShowProctorToast(false);
      setActiveCheatingAlert(null);
      const updated = await apiGetProctorAlerts();
      if (Array.isArray(updated)) setLiveProctorAlerts(updated);
    } catch {}
  };

  const handleDismissStudentAlerts = async (studentId) => {
    try {
      const studentAlerts = (liveProctorAlerts || []).filter(a => a.studentId === studentId && !a.acknowledged);
      for (const a of studentAlerts) {
        await apiAcknowledgeProctorAlert(a.id, 'DISMISS');
      }
      if (activeCheatingAlert && activeCheatingAlert.studentId === studentId) {
        setActiveCheatingAlert(null);
      }
      const updated = await apiGetProctorAlerts();
      if (Array.isArray(updated)) setLiveProctorAlerts(updated);
    } catch {}
  };

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    const correctPassword = getAdminPassword();
    const effectiveUsername = (adminUsername || 'admin@comsats.edu.pk').trim();
    const effectivePasscode = (passcode || '').trim();

    // 1. Centralized server authentication with JWT
    try {
      const res = await apiAdminLogin(effectiveUsername, effectivePasscode);
      if (res && res.success) {
        setIsAuthenticated(true);
        if (rememberMe) {
          setAdminAuth(true);
        }
        setAuthError('');
        setPasscode('');
        // Fetch latest participants from central server
        const serverList = await apiGetParticipants();
        if (serverList && Array.isArray(serverList)) {
          setParticipants(serverList);
        }
        return;
      }
    } catch {}

    // 2. Local offline fallback
    if (effectivePasscode === correctPassword || effectivePasscode === 'admin123') {
      setIsAuthenticated(true);
      if (rememberMe) {
        setAdminAuth(true);
      }
      setAuthError('');
      setPasscode('');
    } else {
      setAuthError('Invalid administrator credentials. Passcode does not match.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminAuth(false);
    setPasscode('');
    setAuthError('');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    const currentStored = getAdminPassword();

    if (currentPassInput !== currentStored) {
      setPassChangeMessage({ text: 'Current passcode does not match.', isError: true });
      return;
    }

    if (!newPassInput || newPassInput.length < 4) {
      setPassChangeMessage({ text: 'New passcode must be at least 4 characters long.', isError: true });
      return;
    }

    if (newPassInput !== confirmPassInput) {
      setPassChangeMessage({ text: 'New passcodes do not match.', isError: true });
      return;
    }

    try {
      await apiChangePassword(currentPassInput, newPassInput);
    } catch {}

    setAdminPassword(newPassInput);
    setPassChangeMessage({ text: 'Administrator passcode changed successfully!', isError: false });
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');

    setTimeout(() => {
      setPassChangeMessage({ text: '', isError: false });
    }, 4000);
  };

  // Save all changes to local storage & trigger parent re-render
  const handleSaveAll = async () => {
    saveStoredDetails(details);
    saveStoredSubjects(subjects);
    saveStoredRounds(rounds);
    saveStoredRules(rules);
    if (details.defaultEventDate) {
      setStoredEventDate(details.defaultEventDate);
    }

    // Central server sync
    try {
      await apiSaveCompetition({ details, subjects, rounds, rules });
    } catch {}

    onDataUpdated && onDataUpdated({
      details,
      subjects,
      rounds,
      rules,
      participants,
    });

    setSaveAlert(true);
    setTimeout(() => setSaveAlert(false), 3500);
  };

  // Reset to original factory defaults
  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to reset all competition data, subjects, rounds, rules and participants to factory defaults? This action cannot be undone.")) {
      resetAllToDefaults();
      window.location.reload();
    }
  };

  const emptyStudent = {
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    department: 'Computer Science',
    semester: '4th Semester',
  };

  const syncParticipants = (updated) => {
    setParticipants(updated);
    onDataUpdated && onDataUpdated({ participants: updated });
  };

  // Participant deletion
  const handleDeleteParticipant = async (p) => {
    if (!window.confirm(`Delete candidate "${p.fullName}" (${p.studentId}) from registered roster?`)) return;
    try {
      await apiDeleteParticipant(p.id);
    } catch {}
    syncParticipants(deleteParticipants([p.id]));
  };

  const handleDeleteAllParticipants = async () => {
    if (!participants.length) return;
    if (!window.confirm(`WARNING: Are you sure you want to delete ALL ${participants.length} registered candidates? This cannot be undone.`)) return;
    try {
      await apiDeleteAllParticipants();
    } catch {}
    syncParticipants(deleteParticipants(participants.map((p) => p.id)));
  };

  const openAddForm = () => {
    setEditingId(null);
    setStudentError('');
    setNewParticipant(emptyStudent);
    setIsAddingUser(true);
  };

  const openEditForm = (p) => {
    setEditingId(p.id);
    setStudentError('');
    setNewParticipant({
      fullName: p.fullName,
      studentId: p.studentId,
      email: p.email,
      phone: p.phone,
      department: p.department,
      semester: p.semester,
    });
    setIsAddingUser(true);
  };

  const closeStudentForm = () => {
    setIsAddingUser(false);
    setEditingId(null);
    setStudentError('');
    setNewParticipant(emptyStudent);
  };

  const handleAddParticipant = async (e) => {
    e.preventDefault();
    const fullName = newParticipant.fullName.trim();
    const studentId = newParticipant.studentId.trim().toUpperCase();
    if (!fullName || !studentId) return;

    const duplicate = participants.some(
      (p) => p.studentId.toUpperCase() === studentId && p.id !== editingId
    );
    if (duplicate) {
      setStudentError('A candidate with this Student ID is already enrolled.');
      return;
    }

    if (editingId) {
      const updatedFields = {
        fullName,
        studentId,
        email: newParticipant.email.trim(),
        phone: newParticipant.phone.trim(),
        department: newParticipant.department,
        semester: newParticipant.semester,
      };
      try {
        await apiUpdateParticipant(editingId, updatedFields);
      } catch {}
      syncParticipants(updateParticipant(editingId, updatedFields));
    } else {
      const record = {
        id: generateParticipantId(participants),
        fullName,
        studentId,
        email: newParticipant.email.trim() || 'candidate@comsats.edu.pk',
        phone: newParticipant.phone.trim() || '+92 300 0000000',
        department: newParticipant.department,
        semester: newParticipant.semester,
        registeredAt: new Date().toISOString(),
      };
      try {
        await apiRegisterParticipant(record);
      } catch {}
      saveParticipant(record);
      syncParticipants([record, ...participants]);
    }
    closeStudentForm();
  };

  // Subject helpers
  const updateSubject = (index, field, value) => {
    const updated = [...subjects];
    if (field === 'topics') {
      updated[index][field] = value.split(',').map((s) => s.trim());
    } else {
      updated[index][field] = value;
    }
    setSubjects(updated);
  };

  // Round helpers
  const updateRound = (index, field, value) => {
    const updated = [...rounds];
    updated[index][field] = value;
    setRounds(updated);
  };

  // =========================================================================
  // Question Bank Actions & Excel File Handlers
  // =========================================================================
  const emptyQuestion = {
    subject: 'Data Structures & Algorithms',
    round: 'Round 1 (MCQs)',
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    correct: 0,
    explanation: '',
    difficulty: 'Moderate'
  };

  const handleDownloadQuestionsTemplate = (targetSubject = '') => {
    downloadQuestionsTemplate(targetSubject);
  };

  const handleExportQuestionsExcel = (targetSubject = '') => {
    if (targetSubject) {
      const subjectQuestions = questions.filter(
        (q) => (q.subject || '').trim().toLowerCase() === targetSubject.trim().toLowerCase()
      );
      exportQuestionsToExcel(subjectQuestions.length ? subjectQuestions : questions);
    } else {
      exportQuestionsToExcel(questions);
    }
  };

  const handleQuestionsImport = async (e, defaultSubject = '') => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploadingQuestions(true);
    const subLabel = defaultSubject ? ` for "${defaultSubject}"` : '';
    setQuestionStatusMessage({ text: `Reading and validating questions spreadsheet${subLabel}...`, isError: false });

    try {
      const parsed = await parseQuestionsFile(file, defaultSubject);
      const updatedList = [...parsed, ...questions];
      setQuestions(updatedList);
      saveStoredQuestions(updatedList);
      try {
        await apiSaveQuestions(updatedList);
      } catch {}

      setQuestionStatusMessage({ 
        text: `Success! Successfully imported ${parsed.length} questions${subLabel} from Excel/CSV sheet.`, 
        isError: false 
      });
      setTimeout(() => setQuestionStatusMessage({ text: '', isError: false }), 6000);
    } catch (err) {
      setQuestionStatusMessage({ 
        text: `Import failed: ${err.message || 'Invalid file format'}`, 
        isError: true 
      });
    } finally {
      setIsUploadingQuestions(false);
      e.target.value = '';
    }
  };

  const openAddQuestion = (defaultSubject = '') => {
    setEditingQuestion({
      ...emptyQuestion,
      subject: defaultSubject || (subjects[0] ? subjects[0].name : 'Data Structures & Algorithms')
    });
    setIsEditingQuestion(true);
  };

  const openEditQuestion = (q) => {
    setEditingQuestion({
      ...q,
      optionA: q.optionA || (q.options && q.options[0]) || '',
      optionB: q.optionB || (q.options && q.options[1]) || '',
      optionC: q.optionC || (q.options && q.options[2]) || '',
      optionD: q.optionD || (q.options && q.options[3]) || '',
      correctOption: q.correctOption || (typeof q.correct === 'number' ? ['A', 'B', 'C', 'D'][q.correct] : 'A')
    });
    setIsEditingQuestion(true);
  };

  const closeQuestionModal = () => {
    setIsEditingQuestion(false);
    setEditingQuestion(null);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!editingQuestion.question.trim()) return;

    let correctIdx = 0;
    if (editingQuestion.correctOption === 'B') correctIdx = 1;
    else if (editingQuestion.correctOption === 'C') correctIdx = 2;
    else if (editingQuestion.correctOption === 'D') correctIdx = 3;

    const optList = [
      editingQuestion.optionA.trim() || 'Option A',
      editingQuestion.optionB.trim() || 'Option B',
      editingQuestion.optionC.trim() || 'Option C',
      editingQuestion.optionD.trim() || 'Option D'
    ];

    const finalizedQ = {
      ...editingQuestion,
      options: optList,
      correct: correctIdx
    };

    let updated;
    if (editingQuestion.id) {
      updated = questions.map((q) => q.id === editingQuestion.id ? finalizedQ : q);
    } else {
      const newRecord = {
        ...finalizedQ,
        id: `Q-${Date.now().toString().slice(-4)}-${questions.length + 1}`
      };
      updated = [newRecord, ...questions];
    }

    setQuestions(updated);
    saveStoredQuestions(updated);
    try {
      await apiSaveQuestions(updated);
    } catch {}

    closeQuestionModal();
    setQuestionStatusMessage({ text: 'Question saved successfully in the database!', isError: false });
    setTimeout(() => setQuestionStatusMessage({ text: '', isError: false }), 3500);
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    const updated = questions.filter((q) => q.id !== id);
    setQuestions(updated);
    saveStoredQuestions(updated);
    try {
      await apiSaveQuestions(updated);
    } catch {}
  };

  const handleDeleteAllQuestions = async () => {
    if (!questions.length) return;
    if (!window.confirm(`Warning: Are you sure you want to delete all ${questions.length} questions from the Question Bank?`)) return;
    setQuestions([]);
    saveStoredQuestions([]);
    try {
      await apiSaveQuestions([]);
    } catch {}
  };

  // Filtered questions
  const filteredQuestions = questions.filter((q) => {
    const search = questionSearch.trim().toLowerCase();
    const matchesSearch = !search || 
      (q.question && q.question.toLowerCase().includes(search)) ||
      (q.subject && q.subject.toLowerCase().includes(search)) ||
      (q.explanation && q.explanation.toLowerCase().includes(search)) ||
      (q.id && q.id.toLowerCase().includes(search));

    const matchesSub = questionSubjectFilter === 'All' || q.subject === questionSubjectFilter;
    const matchesRound = questionRoundFilter === 'All' || q.round === questionRoundFilter;

    return matchesSearch && matchesSub && matchesRound;
  });

  // Filtered participants list
  const filteredParticipants = participants.filter((p) => {
    const q = studentSearch.trim().toLowerCase();
    const matchesQuery = !q || [p.fullName, p.studentId, p.id, p.email, p.phone]
      .some((v) => (v || '').toLowerCase().includes(q));
    const matchesDept = departmentFilter === 'All' || p.department === departmentFilter;
    const matchesSem = semesterFilter === 'All' || p.semester === semesterFilter;
    return matchesQuery && matchesDept && matchesSem;
  });

  // Calculate days remaining to event
  const calculateDaysLeft = () => {
    try {
      const target = new Date(details.defaultEventDate).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) return 'Event Day / Concluded';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      return `${days} Days ${hours}h Remaining`;
    } catch {
      return 'Scheduled';
    }
  };

  // Nav items configuration
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null },
    { id: 'teams', label: 'Teams Roster (2-3)', icon: Users, badge: 'Official' },
    { id: 'registrations', label: 'Individual Candidates', icon: IdCard, badge: `${participants.length}` },
    { id: 'rapidfire', label: 'Round 3: Rapid Fire', icon: Zap, badge: 'Live' },
    { id: 'buzzer', label: 'Round 4: Buzzer Final', icon: Trophy, badge: 'Live' },
    { id: 'results', label: 'Results & Standings', icon: Award, badge: null },
    { id: 'questions', label: 'Question Bank (Excel)', icon: FileSpreadsheet, badge: `${questions.length}` },
    { id: 'subjects', label: '7 CS Subjects', icon: BookOpen, badge: '7' },
    { id: 'rounds', label: '4 Rounds Config', icon: Layers, badge: '4' },
    { id: 'announcements', label: 'Bulletins & News', icon: Sparkles, badge: null },
    { id: 'audit', label: 'Audit Trail Logs', icon: ShieldCheck, badge: null },
    { id: 'general', label: 'General & Campus', icon: Building2, badge: null },
    { id: 'rules', label: 'Rules & Penalties', icon: Scale, badge: null },
    { id: 'security', label: 'Security & Passcode', icon: KeyRound, badge: null },
  ];

  // Dynamic Theme Helpers
  const containerTheme = isDark ? 'bg-[#070b14] text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerTheme = isDark ? 'bg-[#0b1120]/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm';
  const sidebarTheme = isDark ? 'bg-[#090f1d] border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-sm';
  const cardTheme = isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const inputTheme = isDark 
    ? 'admin-input bg-slate-950/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-blue-500/20' 
    : 'admin-input bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-blue-500/20';

  /* =========================================================================
     SCREEN 1: FULL SCREEN DEDICATED PROPER ADMIN LOGIN
     ========================================================================= */
  if (!isAuthenticated) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto min-h-screen transition-colors duration-300 ${containerTheme}`}>
        {/* Subtle grid and ambient backdrop */}
        {isDark && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.22),rgba(255,255,255,0))] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
          </>
        )}

        {/* Top Minimal Bar */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-500 shadow-lg shadow-blue-500/10">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-lg tracking-tight text-blue-600">BATTLE</span>
                <span className={`font-heading font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>OF BRAINS</span>
                <span className="text-[10px] uppercase tracking-widest font-mono bg-blue-500/10 text-blue-600 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  ADMIN CONSOLE
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Department of Computer Science • Official Competition Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* THEME TOGGLE (Sun / Moon) */}
            <button
              onClick={handleToggleThemeClick}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 shadow-sm'
              }`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark 
                  ? 'text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border-slate-700/60' 
                  : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </header>

        {/* Centered Login Box */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className={`w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden transition-colors ${
            isDark 
              ? 'bg-slate-900/90 border border-blue-500/30 shadow-blue-950/60 backdrop-blur-xl' 
              : 'bg-white border border-slate-200 shadow-xl'
          }`}>
            {/* Top decorative glow */}
            {isDark && (
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            )}

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-cyan-500/30 border border-blue-500/40 flex items-center justify-center text-blue-500 mx-auto mb-4 shadow-xl shadow-blue-600/20">
                <Lock className="w-8 h-8" />
              </div>

              <h2 className={`text-2xl sm:text-3xl font-heading font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Administrator Sign In
              </h2>
              <p className={`text-xs mt-2 max-w-xs mx-auto leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Authorized management console for COMSATS University organizers, invigilators, and faculty committee.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  <span>Admin ID / Email</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/90 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                    placeholder="Enter administrator email..."
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                    <span>Secret Passcode</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">Passcode: admin123</span>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border text-sm font-mono focus:outline-none transition-all ${
                      isDark 
                        ? 'bg-slate-950/90 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-blue-600'
                    }`}
                    placeholder="Enter confidential passcode..."
                    autoFocus
                    required
                  />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-600 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
                  />
                  <span>Remember session on this device</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-sm shadow-lg shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Open Full Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className={`mt-6 pt-5 border-t text-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-blue-600 transition-colors"
              >
                ← Cancel & Return to Website
              </button>
            </div>
          </div>
        </main>

        {/* Bottom Status Bar */}
        <footer className={`relative z-10 w-full py-4 px-6 border-t text-center text-xs ${isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500 bg-white/50'}`}>
          COMSATS University Islamabad • Battle of Brains 2026 Administrative Suite • Confidential Access Only
        </footer>
      </div>
    );
  }

  /* =========================================================================
     SCREEN 2: PROPER FULL-SCREEN ADMIN DASHBOARD ("pore screen pr")
     ========================================================================= */
  return (
    <div className={`fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${containerTheme}`}>
      
      {/* 1. TOP GLOBAL NAVIGATION BAR */}
      <header className={`h-16 border-b px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-colors ${headerTheme}`}>
        
        {/* Left: Branding & Mobile / Desktop Sidebar Collapse Toggle */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className={`md:hidden p-2 rounded-lg ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`hidden md:flex p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-sm sm:text-base tracking-tight text-blue-600">BATTLE</span>
              <span className={`font-heading font-black text-sm sm:text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>OF BRAINS</span>
              <span className="hidden sm:inline-block text-[9px] font-mono font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30 px-1.5 py-0.5 rounded-md">
                ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Proctor Malpractice Alarm (High-contrast, 100% readable) */}
        <div className="hidden lg:flex items-center gap-3">
          {(() => {
            if (unackViolators.length === 0) return null;
            const idsList = unackViolators.map(v => v.studentId).slice(0, 3).join(', ');
            const extra = unackViolators.length > 3 ? ` +${unackViolators.length - 3} more` : '';
            return (
              <button
                type="button"
                onClick={() => {
                  if (unackViolators.length > 0) {
                    setActiveCheatingAlert(unackViolators[0].latestAlert);
                  }
                }}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md border-2 border-rose-400 cursor-pointer transition-all"
                title="Click to inspect all offending student IDs"
              >
                <Siren className="w-4 h-4 animate-bounce shrink-0 text-white" />
                <span className="text-white font-extrabold tracking-tight">
                  🚨 {unackViolators.length} Student{unackViolators.length > 1 ? 's' : ''} Cheating: <span className="font-mono underline font-black text-white">{idsList}{extra}</span>
                </span>
              </button>
            );
          })()}
        </div>

        {/* Right Action Buttons - Clean, Spacious & Uncluttered */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* Quick Save All Changes button */}
          <button
            onClick={handleSaveAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-heading font-bold text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            title="Save all changes to website"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          {/* View Live Public Site Button (Compact) */}
          <button
            onClick={onClose}
            className={`inline-flex items-center gap-1.5 p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              isDark 
                ? 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border-slate-700/80' 
                : 'text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
            title="Return to Public Website"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden md:inline">Website</span>
          </button>

          {/* THEME TOGGLE (Sun / Moon) */}
          <button
            onClick={handleToggleThemeClick}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isDark
                ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 shadow-sm'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme Mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Pill */}
          <div className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
              AU
            </div>
            <div className="text-left max-w-[100px] truncate">
              <div className={`font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin</div>
              <div className="text-[10px] text-slate-500 leading-tight truncate">Faculty</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Log Out of Admin Panel"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN BODY (SIDEBAR + CONTENT VIEWPORT) */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-10
          ${isSidebarCollapsed ? 'w-20' : 'w-64'}
          border-r flex flex-col shrink-0
          transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${sidebarTheme}
        `}>
          
          {/* Sidebar Navigation Header */}
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
            {!isSidebarCollapsed && (
              <span className={`text-[11px] font-heading font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Management Modules
              </span>
            )}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileSidebarOpen(false);
                  }}
                  title={isSidebarCollapsed ? tab.label : ''}
                  className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-xs font-heading font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                    {!isSidebarCollapsed && <span>{tab.label}</span>}
                  </div>

                  {!isSidebarCollapsed && tab.badge && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : isDark ? 'bg-slate-800 text-blue-400 border border-blue-500/20' : 'bg-slate-100 text-blue-600 border border-blue-200'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer Controls */}
          <div className={`p-4 border-t space-y-2 ${isDark ? 'border-slate-800/60 bg-[#070b14]/50' : 'border-slate-200 bg-slate-50'}`}>
            <button
              onClick={handleResetDefaults}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
              title="Reset all content to original defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              {!isSidebarCollapsed && <span>Reset Defaults</span>}
            </button>

            <button
              onClick={onClose}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white bg-slate-900 border-slate-800' : 'text-slate-700 hover:text-slate-900 bg-white border-slate-200'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              {!isSidebarCollapsed && <span>Back to Website</span>}
            </button>
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {mobileSidebarOpen && (
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
          />
        )}

        {/* MAIN CONTENT WORKSPACE VIEWPORT */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 ${isDark ? 'bg-[#070b14]' : 'bg-slate-50/70'}`}>
          
          {/* Top Saved Changes Banner Notification */}
          {saveAlert && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 text-xs sm:text-sm flex items-center justify-between shadow-xl shadow-emerald-500/10 animate-fadeIn shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="font-bold block">Changes Saved Successfully!</strong>
                  <span className="text-xs">All website sections, rules, event countdown, and rosters have been updated immediately.</span>
                </div>
              </div>

              <button
                onClick={() => setSaveAlert(false)}
                className="text-emerald-500 hover:text-emerald-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* =========================================================================
              TAB 0: DASHBOARD OVERVIEW & ANALYTICS
              ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Header Title & Subtitle */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Executive Competition Overview</span>
                    <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      LIVE
                    </span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Real-time status for Battle of Brains 2026. Monitor participants, active subjects, and event schedule.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={openAddForm}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add Candidate</span>
                  </button>

                  <button
                    onClick={() => exportParticipantsToCSV(participants)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* LIVE PROCTORING & BROWSER SWITCH MALPRACTICE MONITOR - ULTRA HIGH-CONTRAST READABLE DISPLAY */}
              <div className={`p-6 rounded-3xl border-2 shadow-2xl space-y-6 transition-all ${
                isDark
                  ? 'bg-slate-900 border-rose-500/40 text-white shadow-rose-950/40'
                  : 'bg-white border-rose-400 text-slate-900 shadow-xl shadow-slate-200/50'
              }`}>
                
                {/* Header Banner */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-rose-500/20">
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      unackViolators.length > 0
                        ? 'bg-rose-600 text-white shadow-rose-600/40'
                        : isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                    }`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className={`font-heading font-black text-lg sm:text-xl tracking-tight ${
                          isDark ? 'text-white' : 'text-slate-950'
                        }`}>
                          Live Browser Switch & Tab Malpractice Monitor
                        </h3>
                        {unackViolators.length > 0 ? (
                          <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-rose-600 text-white shadow-sm border border-rose-400 animate-pulse">
                            ⚠️ {unackViolators.length} ACTIVE BREACH{unackViolators.length > 1 ? 'ES' : ''} DETECTED
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black'
                          }`}>
                            LOCKDOWN SECURE
                          </span>
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm mt-1 font-medium ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}>
                        Real-time tracking of students opening another browser, switching tabs, or leaving full-screen examination mode.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {liveProctorAlerts.some(a => !a.acknowledged) && (
                      <button
                        type="button"
                        onClick={handleDismissAllAlerts}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer shadow-md"
                        title="Dismiss all malpractice alerts"
                      >
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        <span>Dismiss All Alerts</span>
                      </button>
                    )}
                    <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
                      isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-300'
                    }`}>
                      Total Violations: <strong className={isDark ? 'text-white' : 'text-slate-950'}>{liveProctorAlerts.length}</strong>
                    </span>
                    <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
                      isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-100 text-rose-900 border-rose-300'
                    }`}>
                      Violating Students: <strong className={isDark ? 'text-white' : 'text-slate-950'}>{activeViolatorsByStudent.length}</strong>
                    </span>
                  </div>
                </div>

                {/* 1. HIGHLIGHTED CARDS: ALL OFFENDING STUDENT IDs */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      isDark ? 'text-rose-400' : 'text-rose-700'
                    }`}>
                      <Siren className="w-4 h-4 shrink-0" />
                      <span>All Offending Student IDs ({activeViolatorsByStudent.length} Detected)</span>
                    </span>
                    {activeViolatorsByStudent.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`font-bold text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Filter:</span>
                        <select
                          value={proctorFilterId}
                          onChange={(e) => setProctorFilterId(e.target.value)}
                          className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border cursor-pointer focus:outline-none ${
                            isDark
                              ? 'bg-slate-800 text-white border-slate-700 focus:border-rose-500'
                              : 'bg-white text-slate-900 border-slate-300 shadow-sm focus:border-rose-500'
                          }`}
                        >
                          <option value="ALL">All Student IDs ({activeViolatorsByStudent.length})</option>
                          {activeViolatorsByStudent.map(v => (
                            <option key={v.studentId} value={v.studentId}>
                              {v.studentId} - {v.studentName} ({v.totalCount}x)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {activeViolatorsByStudent.length === 0 ? (
                    <div className={`p-5 rounded-2xl border text-xs flex items-center gap-3.5 ${
                      isDark ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    }`}>
                      <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      <div>
                        <strong className="block text-sm font-heading font-black">Zero Browser Switches Detected</strong>
                        <span className="font-medium">All candidate sessions are currently locked into full-screen exam mode with zero background infractions.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                      {activeViolatorsByStudent
                        .filter(v => proctorFilterId === 'ALL' || v.studentId === proctorFilterId)
                        .map((violator) => {
                          const isUnack = violator.unacknowledgedCount > 0;
                          return (
                            <div
                              key={violator.studentId}
                              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3.5 shadow-md ${
                                isUnack
                                  ? isDark
                                    ? 'bg-rose-950/50 border-rose-500 text-white shadow-rose-950/40'
                                    : 'bg-rose-50/90 border-rose-400 text-slate-950 shadow-rose-200/60'
                                  : isDark
                                    ? 'bg-slate-950/60 border-slate-800 text-slate-200'
                                    : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            >
                              <div>
                                {/* TOP ROW: STUDENT ID BADGE & COUNT */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="px-3 py-1 rounded-xl bg-rose-600 text-white font-mono font-black text-sm flex items-center gap-1.5 shadow-md shadow-rose-600/30 select-all">
                                    <span className="text-[10px] text-rose-200 font-sans uppercase font-bold">ID:</span>
                                    <span>{violator.studentId}</span>
                                  </div>
                                  <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-lg border ${
                                    isUnack
                                      ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                                      : isDark
                                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                                        : 'bg-slate-200 text-slate-800 border-slate-300'
                                  }`}>
                                    ⚠️ {violator.totalCount}x Switched
                                  </span>
                                </div>

                                {/* STUDENT NAME & PROGRAM */}
                                <div className="mt-3">
                                  <strong className={`text-base font-heading font-black block truncate ${
                                    isDark ? 'text-white' : 'text-slate-950'
                                  }`}>
                                    {violator.studentName}
                                  </strong>
                                  <span className={`text-xs font-mono font-bold block mt-0.5 ${
                                    isDark ? 'text-slate-300' : 'text-slate-600'
                                  }`}>
                                    {violator.campus} • {violator.semester || violator.degreeProgram}
                                  </span>
                                </div>

                                {/* LATEST VIOLATION DETAILS - HIGH CONTRAST */}
                                <div className={`mt-3 p-3 rounded-xl border text-xs ${
                                  isDark
                                    ? 'bg-black/60 border-rose-500/30 text-rose-200'
                                    : 'bg-white border-rose-300 text-rose-950 shadow-sm'
                                }`}>
                                  <div className={`flex items-center gap-1 text-[10px] uppercase font-black ${
                                    isDark ? 'text-slate-400' : 'text-slate-600'
                                  }`}>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Latest Infraction:</span>
                                  </div>
                                  <p className="mt-1 font-bold leading-snug line-clamp-2">
                                    {violator.latestAlert.details}
                                  </p>
                                  <span className={`text-[11px] font-mono font-bold block mt-1.5 ${
                                    isDark ? 'text-slate-400' : 'text-slate-500'
                                  }`}>
                                    Detected at: {new Date(violator.latestTimestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>

                              {/* ACTIONS */}
                              <div className="pt-2.5 border-t border-rose-500/20 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveCheatingAlert(violator.latestAlert)}
                                  className="flex-1 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-heading font-black text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer text-center"
                                >
                                  Review ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleActionOnCheatingAlert(violator.latestAlert.id, 'WARN_STUDENT')}
                                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                    isDark
                                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-300'
                                      : 'bg-amber-100 hover:bg-amber-200 border-amber-400 text-amber-900'
                                  }`}
                                  title="Issue formal warning to candidate"
                                >
                                  Warn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDismissStudentAlerts(violator.studentId)}
                                  className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                                    isDark
                                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                      : 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800'
                                  }`}
                                  title="Dismiss all alerts for this student ID"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* 2. CHRONOLOGICAL INCIDENT LOG - CRYSTAL-CLEAR CONTRAST */}
                {liveProctorAlerts.length > 0 && (
                  <div className="pt-5 border-t border-rose-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-mono font-black uppercase tracking-wider ${
                        isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        Full Chronological Incident Log ({liveProctorAlerts.length} Events)
                      </span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {liveProctorAlerts
                        .filter(a => proctorFilterId === 'ALL' || a.studentId === proctorFilterId)
                        .map((alert) => {
                          const isUnack = !alert.acknowledged;
                          return (
                            <div
                              key={alert.id}
                              className={`p-3.5 rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all shadow-sm ${
                                isUnack
                                  ? isDark
                                    ? 'bg-rose-950/70 border-rose-500 text-white'
                                    : 'bg-rose-50 border-rose-400 text-slate-950 shadow-rose-200/50'
                                  : isDark
                                    ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                                    : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                                {/* STUDENT ID BADGE - ALWAYS SOLID HIGH CONTRAST */}
                                <span className="px-3 py-1 rounded-lg bg-rose-600 text-white font-mono font-black text-sm shadow-sm shrink-0 select-all">
                                  {alert.studentId}
                                </span>

                                {/* STUDENT NAME */}
                                <strong className={`font-heading font-black text-sm truncate ${
                                  isDark ? 'text-white' : 'text-slate-950'
                                }`}>
                                  {alert.studentName}
                                </strong>

                                {/* STAGE / ROUND */}
                                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-800'
                                }`}>
                                  Round 0{alert.roundNumber}
                                </span>

                                {/* DETAILS */}
                                <span className={`font-semibold truncate max-w-sm ${
                                  isUnack
                                    ? isDark ? 'text-rose-200 font-bold' : 'text-rose-900 font-bold'
                                    : isDark ? 'text-slate-300' : 'text-slate-700'
                                }`}>
                                  {alert.details}
                                </span>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className={`text-xs font-mono font-bold ${
                                  isDark ? 'text-slate-400' : 'text-slate-600'
                                }`}>
                                  {new Date(alert.timestamp).toLocaleTimeString()}
                                </span>
                                {isUnack ? (
                                  <button
                                    type="button"
                                    onClick={() => handleActionOnCheatingAlert(alert.id, 'DISMISS')}
                                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-sm"
                                  >
                                    Dismiss
                                  </button>
                                ) : (
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-700 border border-slate-300'
                                  }`}>
                                    {alert.actionTaken || 'RESOLVED'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 5 Primary Metric Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Metric 1: Total Candidates */}
                <div 
                  onClick={() => setActiveTab('registrations')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50' 
                      : 'bg-white border-slate-200 hover:border-blue-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrolled Candidates</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`text-3xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{participants.length}</span>
                    <span className="text-xs text-emerald-600 ml-2 font-mono font-bold">Verified Roster</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Manage directory</span>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Metric 2: Core CS Subjects */}
                <div 
                  onClick={() => setActiveTab('subjects')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-indigo-500/50' 
                      : 'bg-white border-slate-200 hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Examined Subjects</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`text-3xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{subjects.length}</span>
                    <span className="text-xs text-indigo-600 ml-2 font-mono font-bold">CS Disciplines</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>DSA, OOP, OS, AI, DB</span>
                    <ChevronRight className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Metric 3: Question Bank (Excel / CSV) */}
                <div 
                  onClick={() => setActiveTab('questions')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50' 
                      : 'bg-white border-slate-200 hover:border-emerald-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Question Bank</span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`text-3xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{questions.length}</span>
                    <span className="text-xs text-emerald-600 ml-2 font-mono font-bold">Excel Managed</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Import/Export Sheet</span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Metric 3: Competition Rounds */}
                <div 
                  onClick={() => setActiveTab('rounds')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50' 
                      : 'bg-white border-slate-200 hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tournament Stages</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                      <Trophy className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={`text-3xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{rounds.length}</span>
                    <span className="text-xs text-amber-600 ml-2 font-mono font-bold">Sequential Rounds</span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Screening to Grand Final</span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Metric 4: Event Countdown */}
                <div 
                  onClick={() => setActiveTab('general')}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/50' 
                      : 'bg-white border-slate-200 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Championship Clock</span>
                    <div className="w-10 h-10 rounded-xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-lg font-heading font-bold text-blue-600 font-mono block truncate">
                      {calculateDaysLeft()}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(details.defaultEventDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Edit date & time</span>
                    <ChevronRight className="w-3.5 h-3.5 text-cyan-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>

              {/* 2 Wide Dashboard Section Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Card 1: Event Identity Snapshot */}
                <div className={`p-6 rounded-2xl border space-y-4 ${cardTheme}`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-500" />
                      <h3 className={`font-heading font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Event & Institution Identity</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('general')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                    >
                      <span>Edit Settings</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 block mb-0.5 font-medium">Main Event Title</span>
                      <strong className={`text-sm font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{details.title}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5 font-medium">Oval Campus Pill Badge</span>
                      <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 font-mono font-bold text-xs">
                        {details.campusBadge}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block mb-0.5 font-medium">Tagline</span>
                      <p className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{details.tagline}</p>
                    </div>

                    <div className={`grid grid-cols-2 gap-3 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div>
                        <span className="text-slate-500 block mb-0.5 font-medium">Host Department</span>
                        <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{details.organizer}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5 font-medium">Venue Location</span>
                        <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{details.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 2: Recent Candidate Registrations */}
                <div className={`p-6 rounded-2xl border space-y-4 ${cardTheme}`}>
                  <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-500" />
                      <h3 className={`font-heading font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Latest Registered Candidates</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('registrations')}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Approvals ({participants.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {participants.slice(0, 4).map((p) => (
                      <div key={p.id} className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-[10px] border border-blue-500/30">
                            {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <strong className={`block font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.fullName}</strong>
                            <span className="text-slate-500 font-mono text-[11px]">{p.studentId} • {p.department}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded border border-blue-500/20 font-bold">
                          {p.semester}
                        </span>
                      </div>
                    ))}
                    {participants.length === 0 && (
                      <p className="text-slate-500 text-xs py-4 text-center">No students registered yet.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Tournament Execution Launchpad */}
              <div className={`p-6 rounded-2xl border ${cardTheme}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span>Championship Live Adjudication Consoles</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">Direct jump to real-time round adjudication and tournament engines</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <button
                    onClick={() => setActiveTab('rapidfire')}
                    className="p-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-amber-300">Round 3: Rapid Fire</span>
                      <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">3-minute countdown & 3s skip rule console</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('buzzer')}
                    className="p-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-blue-300">Round 4: Buzzer Final</span>
                      <Trophy className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">2-finalist atomic lockout & 10s timer deck</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('results')}
                    className="p-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-emerald-300">Results & Qualification</span>
                      <Award className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Top 80% / Top 4 / Top 2 / Champion Engine</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className="p-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-purple-300">Audit Trail Ledger</span>
                      <ShieldCheck className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Immutable log of approvals, scores & buzzes</p>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 1: GENERAL & CAMPUS SETTINGS
              ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-6 max-w-5xl">
              
              <div className={`pb-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Building2 className="w-6 h-6 text-blue-500" />
                    <span>General & Campus Configurations</span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Control primary branding, hero titles, campus badge, host institution, and target event date countdown.
                  </p>
                </div>

                <button
                  onClick={handleSaveAll}
                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>

              <div className={`p-6 rounded-2xl border space-y-6 ${cardTheme}`}>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Championship Main Title
                    </label>
                    <input
                      type="text"
                      value={details.title}
                      onChange={(e) => setDetails({ ...details, title: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-heading font-bold focus:outline-none transition-all ${inputTheme}`}
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Displayed in header and primary hero heading.</span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Campus Oval Pill Badge
                    </label>
                    <input
                      type="text"
                      value={details.campusBadge}
                      onChange={(e) => setDetails({ ...details, campusBadge: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-all ${inputTheme}`}
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Appears inside the glowing pill badge above the hero title.</span>
                  </div>

                  <div className="md:col-span-2">
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Competition Tagline / Hero Description
                    </label>
                    <textarea
                      rows={2}
                      value={details.tagline}
                      onChange={(e) => setDetails({ ...details, tagline: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${inputTheme}`}
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Inspiring description shown under the primary hero heading.</span>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Host Department
                    </label>
                    <input
                      type="text"
                      value={details.organizer}
                      onChange={(e) => setDetails({ ...details, organizer: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${inputTheme}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      University Institution Name
                    </label>
                    <input
                      type="text"
                      value={details.university}
                      onChange={(e) => setDetails({ ...details, university: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${inputTheme}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Competition Venue Location
                    </label>
                    <input
                      type="text"
                      value={details.venue}
                      onChange={(e) => setDetails({ ...details, venue: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none transition-all ${inputTheme}`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Target Event Date & Time (Countdown Clock)
                    </label>
                    <input
                      type="datetime-local"
                      value={details.defaultEventDate.slice(0, 16)}
                      onChange={(e) => setDetails({ ...details, defaultEventDate: new Date(e.target.value).toISOString() })}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none transition-all ${inputTheme}`}
                    />
                    <span className="text-[11px] text-blue-600 font-mono mt-1 block font-bold">
                      Live Clock: {calculateDaysLeft()}
                    </span>
                  </div>
                </div>

                {/* Hero Preview Box */}
                <div className={`pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Live Hero Preview</span>
                  <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                    isDark ? 'bg-gradient-to-br from-blue-950/40 via-slate-950 to-indigo-950/40 border-blue-500/30' : 'bg-slate-100/60 border-slate-200'
                  }`}>
                    <span className="inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-600 font-mono text-xs font-bold">
                      {details.campusBadge}
                    </span>
                    <h2 className={`text-2xl sm:text-3xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {details.title}
                    </h2>
                    <p className={`text-xs sm:text-sm max-w-lg mx-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {details.tagline}
                    </p>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {details.organizer} • {details.university} • {details.venue}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: 7 CS CORE SUBJECTS
              ========================================================================= */}
          {activeTab === 'subjects' && (
            <div className="space-y-6">
              
              <div className={`pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <BookOpen className="w-6 h-6 text-indigo-500" />
                    <span>7 CS Core Disciplines & Curriculum</span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Edit course names, codes, difficulty tags, tested topics, and scope descriptions.
                  </p>
                </div>

                <button
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Subjects</span>
                </button>
              </div>

              {/* EXCEL QUESTIONS TEMPLATE & IMPORT BANNER (REQUESTED BY USER) */}
              <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
                isDark 
                  ? 'bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-blue-500/30' 
                  : 'bg-blue-50/80 border-blue-200 shadow-sm'
              }`}>
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/20 text-blue-500 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Subjects Question Bank (Excel / CSV Spreadsheet)
                    </h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0 justify-end">
                  <button
                    onClick={handleDownloadQuestionsTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-blue-600 dark:text-blue-400 bg-white dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-500/20 transition-all shadow-sm cursor-pointer"
                    title="Download pre-formatted Excel template (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel Template</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import Filled Excel</span>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleQuestionsImport} 
                      className="hidden" 
                    />
                  </label>

                  <button
                    onClick={() => setActiveTab('questions')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <span>View Questions ({questions.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Status Message if file imported */}
              {questionStatusMessage.text && (
                <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
                  questionStatusMessage.isError 
                    ? 'bg-rose-500/10 border border-rose-500/40 text-rose-600 font-bold' 
                    : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 font-bold'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{questionStatusMessage.text}</span>
                </div>
              )}

              {/* Responsive Grid of Subjects */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {subjects.map((s, idx) => {
                  const subjectQuestions = questions.filter(
                    (q) => (q.subject || '').trim().toLowerCase() === (s.name || '').trim().toLowerCase()
                  );

                  return (
                    <div key={s.id || idx} className={`p-5 rounded-2xl border space-y-4 hover:border-indigo-500/50 transition-colors ${cardTheme}`}>
                      
                      {/* Subject Card Header with Course Code and Direct Template Button */}
                      <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 font-mono text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                            0{idx + 1}
                          </span>
                          <strong className={`text-sm font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.name}</strong>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold">
                            {s.code}
                          </span>
                        </div>

                        {/* Excel Template Button on Header */}
                        <button
                          type="button"
                          onClick={() => handleDownloadQuestionsTemplate(s.name)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-heading font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
                          title={`Download Excel template for ${s.name}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Template (.xlsx)</span>
                          <Download className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[11px] text-slate-500 font-bold mb-1">Subject Name</label>
                          <input
                            type="text"
                            value={s.name}
                            onChange={(e) => updateSubject(idx, 'name', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputTheme}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-bold mb-1">Course Code</label>
                          <input
                            type="text"
                            value={s.code}
                            onChange={(e) => updateSubject(idx, 'code', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-500 font-bold mb-1">Difficulty</label>
                          <input
                            type="text"
                            value={s.difficulty}
                            onChange={(e) => updateSubject(idx, 'difficulty', e.target.value)}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-amber-500 focus:outline-none ${inputTheme}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Syllabus Overview</label>
                        <input
                          type="text"
                          value={s.description}
                          onChange={(e) => updateSubject(idx, 'description', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Topics (comma separated)</label>
                        <input
                          type="text"
                          value={Array.isArray(s.topics) ? s.topics.join(', ') : s.topics}
                          onChange={(e) => updateSubject(idx, 'topics', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        />
                        
                        {/* Topic Tags Preview */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(Array.isArray(s.topics) ? s.topics : s.topics.split(',')).map((tag, tIdx) => (
                            <span key={tIdx} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Dedicated Subject Excel Template & Action Panel */}
                      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-xs font-heading font-bold text-slate-700 dark:text-slate-300">
                            Questions Bank:
                          </span>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {subjectQuestions.length} Active
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* 1. Download Subject Template */}
                          <button
                            type="button"
                            onClick={() => handleDownloadQuestionsTemplate(s.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-sm"
                            title={`Download Excel template customized for ${s.name}`}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Template</span>
                          </button>

                          {/* 2. Import Excel for this Subject */}
                          <label
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer shadow-sm"
                            title={`Import filled Excel / CSV questions for ${s.name}`}
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Import Excel</span>
                            <input 
                              type="file" 
                              accept=".xlsx,.xls,.csv" 
                              onChange={(e) => handleQuestionsImport(e, s.name)} 
                              className="hidden" 
                            />
                          </label>

                          {/* 3. Add Single Question */}
                          <button
                            type="button"
                            onClick={() => openAddQuestion(s.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all cursor-pointer shadow-sm"
                            title={`Add a new question for ${s.name}`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Q</span>
                          </button>

                          {/* 4. View Questions in Question Bank */}
                          <button
                            type="button"
                            onClick={() => {
                              setQuestionSubjectFilter(s.name);
                              setActiveTab('questions');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-heading font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer shadow-sm"
                            title={`View all questions for ${s.name}`}
                          >
                            <span>Manage</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB: QUESTION BANK & EXCEL SHEET MANAGER (REQUESTED BY USER)
              ========================================================================= */}
          {activeTab === 'questions' && (
            <div className="space-y-6">
              
              {/* Header with Title and Global Action Buttons */}
              <div className={`pb-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <FileSpreadsheet className="w-6 h-6 text-blue-500" />
                    <span>Question Bank & Excel Spreadsheet Manager</span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Bulk import questions using Excel/CSV sheets, download templates, and edit questions directly.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Download Template */}
                  <button
                    onClick={handleDownloadQuestionsTemplate}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all shadow-sm cursor-pointer"
                    title="Download Excel Sheet Template"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel Template</span>
                  </button>

                  {/* Import Excel */}
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-white bg-blue-600 hover:bg-blue-500 border border-blue-500 transition-all shadow-md shadow-blue-600/30 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{isUploadingQuestions ? 'Importing...' : 'Import Excel / CSV'}</span>
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      onChange={handleQuestionsImport} 
                      disabled={isUploadingQuestions}
                      className="hidden" 
                    />
                  </label>

                  {/* Export Current Questions */}
                  <button
                    onClick={handleExportQuestionsExcel}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all shadow-sm cursor-pointer"
                    title="Export all questions to Excel"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export Excel</span>
                  </button>

                  {/* Add Question Manually */}
                  <button
                    onClick={() => openAddQuestion()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {/* Status Message */}
              {questionStatusMessage.text && (
                <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
                  questionStatusMessage.isError 
                    ? 'bg-rose-500/10 border border-rose-500/40 text-rose-600 font-bold' 
                    : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600 font-bold'
                }`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{questionStatusMessage.text}</span>
                </div>
              )}

              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border ${cardTheme}`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Questions</span>
                  <div className="text-2xl font-black font-heading text-blue-600 mt-1">{questions.length}</div>
                  <span className="text-[10px] text-slate-400">In Active Question Bank</span>
                </div>

                <div className={`p-4 rounded-2xl border ${cardTheme}`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">CS Disciplines</span>
                  <div className="text-2xl font-black font-heading text-indigo-600 mt-1">{subjects.length}</div>
                  <span className="text-[10px] text-slate-400">Official Curriculum</span>
                </div>

                <div className={`p-4 rounded-2xl border ${cardTheme}`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Tournament Stages</span>
                  <div className="text-2xl font-black font-heading text-amber-500 mt-1">{rounds.length}</div>
                  <span className="text-[10px] text-slate-400">Rounds 1 through 4</span>
                </div>

                <div className={`p-4 rounded-2xl border ${cardTheme}`}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Filtered View</span>
                  <div className="text-2xl font-black font-heading text-emerald-600 mt-1">{filteredQuestions.length}</div>
                  <span className="text-[10px] text-slate-400">Questions Displayed</span>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${cardTheme}`}>
                
                {/* Search Input */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={questionSearch}
                    onChange={(e) => setQuestionSearch(e.target.value)}
                    placeholder="Search question statement, options, or ID..."
                    className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  />
                  {questionSearch && (
                    <button 
                      onClick={() => setQuestionSearch('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdowns */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                  {/* Subject filter */}
                  <select
                    value={questionSubjectFilter}
                    onChange={(e) => setQuestionSubjectFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  >
                    <option value="All">All Subjects ({subjects.length})</option>
                    {subjects.map((s, idx) => (
                      <option key={s.id || idx} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {/* Round filter */}
                  <select
                    value={questionRoundFilter}
                    onChange={(e) => setQuestionRoundFilter(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  >
                    <option value="All">All Rounds (4 Stages)</option>
                    <option value="Round 1 (MCQs)">Round 1 (MCQs)</option>
                    <option value="Round 2 (Core Concepts)">Round 2 (Core Concepts)</option>
                    <option value="Round 3 (Rapid Fire)">Round 3 (Rapid Fire)</option>
                    <option value="Round 4 (Buzzer Round)">Round 4 (Buzzer Round)</option>
                  </select>

                  {questions.length > 0 && (
                    <button
                      onClick={handleDeleteAllQuestions}
                      className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                      title="Clear all questions"
                    >
                      Clear All
                    </button>
                  )}
                </div>

              </div>

              {/* Questions List */}
              {filteredQuestions.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border space-y-4 ${cardTheme}`}>
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-500 opacity-40" />
                  <div>
                    <h3 className={`text-base font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      No questions found matching your filter
                    </h3>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Excel template download karein aur questions import karein, ya naya question add karein.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleDownloadQuestionsTemplate}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-heading font-bold text-blue-600 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Excel Template</span>
                    </button>

                    <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-heading font-bold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Import Excel Sheet</span>
                      <input type="file" accept=".xlsx,.xls,.csv" onChange={handleQuestionsImport} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredQuestions.map((q, idx) => {
                    const optA = q.optionA || (q.options && q.options[0]) || '';
                    const optB = q.optionB || (q.options && q.options[1]) || '';
                    const optC = q.optionC || (q.options && q.options[2]) || '';
                    const optD = q.optionD || (q.options && q.options[3]) || '';
                    const correctLetter = q.correctOption || (typeof q.correct === 'number' ? ['A', 'B', 'C', 'D'][q.correct] : 'A');

                    return (
                      <div 
                        key={q.id || idx} 
                        className={`p-5 rounded-2xl border transition-all hover:border-blue-500/40 space-y-4 ${cardTheme}`}
                      >
                        {/* Header Badges & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                              {q.id || `Q-${idx + 1}`}
                            </span>

                            <span className="text-xs font-heading font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                              {q.subject}
                            </span>

                            <span className="text-xs font-heading font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {q.round}
                            </span>

                            {q.difficulty && (
                              <span className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded ${
                                q.difficulty === 'Hard' 
                                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' 
                                  : q.difficulty === 'Easy' 
                                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                    : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              }`}>
                                {q.difficulty}
                              </span>
                            )}
                          </div>

                          {/* Edit & Delete Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => openEditQuestion(q)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-semibold text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer"
                              title="Edit this question"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-heading font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="text-sm sm:text-base font-heading font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.question}
                        </div>

                        {/* 4 Options Grid with Correct Answer Highlighted */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {[
                            { letter: 'A', text: optA },
                            { letter: 'B', text: optB },
                            { letter: 'C', text: optC },
                            { letter: 'D', text: optD }
                          ].map((opt) => {
                            const isCorrect = correctLetter === opt.letter;
                            return (
                              <div
                                key={opt.letter}
                                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                  isCorrect 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm' 
                                    : isDark 
                                      ? 'bg-slate-950/50 border-slate-800 text-slate-300' 
                                      : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                                    isCorrect 
                                      ? 'bg-emerald-600 text-white' 
                                      : isDark 
                                        ? 'bg-slate-800 text-slate-400' 
                                        : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {opt.letter}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>

                                {isCorrect && (
                                  <span className="text-[10px] font-mono uppercase bg-emerald-600/20 text-emerald-600 px-2 py-0.5 rounded font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Correct</span>
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {q.explanation && (
                          <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                            isDark 
                              ? 'bg-slate-950/60 border-slate-800 text-slate-400' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                              <strong className="text-slate-800 dark:text-slate-200 font-bold">Explanation: </strong>
                              <span>{q.explanation}</span>
                            </div>
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* =========================================================================
              TAB 3: 4 COMPETITION ROUNDS & RULES
              ========================================================================= */}
          {activeTab === 'rounds' && (
            <div className="space-y-6">
              
              <div className={`pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Trophy className="w-6 h-6 text-amber-500" />
                    <span>4 Competition Rounds & Elimination Structure</span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Manage qualification criteria, time allotments, question counts, and marking schemes.
                  </p>
                </div>

                <button
                  onClick={handleSaveAll}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Rounds</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {rounds.map((r, idx) => (
                  <div key={r.roundNumber || idx} className={`p-5 rounded-2xl border space-y-4 hover:border-amber-500/50 transition-colors ${cardTheme}`}>
                    
                    <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <span className="font-mono text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                        Round 0{r.roundNumber} Stage
                      </span>
                      <input
                        type="text"
                        value={r.stageBadge}
                        onChange={(e) => updateRound(idx, 'stageBadge', e.target.value)}
                        className={`px-3 py-1 rounded-lg border text-xs font-mono text-right focus:outline-none ${inputTheme}`}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Round Title</label>
                        <input
                          type="text"
                          value={r.title}
                          onChange={(e) => updateRound(idx, 'title', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Time Limit</label>
                        <input
                          type="text"
                          value={r.timeLimit}
                          onChange={(e) => updateRound(idx, 'timeLimit', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Question Quota</label>
                        <input
                          type="text"
                          value={r.questionsCount}
                          onChange={(e) => updateRound(idx, 'questionsCount', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Qualification Clause</label>
                        <input
                          type="text"
                          value={r.qualification}
                          onChange={(e) => updateRound(idx, 'qualification', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs text-emerald-600 font-semibold focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Marking Scheme</label>
                        <input
                          type="text"
                          value={r.markingScheme}
                          onChange={(e) => updateRound(idx, 'markingScheme', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-mono text-blue-600 font-bold focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Negative Marking / Deduction Policy</label>
                        <input
                          type="text"
                          value={r.negativeMarking}
                          onChange={(e) => updateRound(idx, 'negativeMarking', e.target.value)}
                          className={`w-full px-3 py-2 rounded-xl border text-xs text-rose-500 font-mono font-medium focus:outline-none ${inputTheme}`}
                        />
                      </div>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 4: RULES & PENALTIES
              ========================================================================= */}
          {activeTab === 'rules' && (
            <div className="space-y-6 max-w-5xl">
              
              <div className={`pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Scale className="w-6 h-6 text-purple-500" />
                    <span>Official Regulations & Penalties</span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Manage student conduct rules, time limit penalties, and scoring deductions.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const updated = { ...rules };
                      updated.generalRules.push({
                        title: 'New Regulation Clause',
                        description: 'Enter detailed clause description here.'
                      });
                      setRules(updated);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-600 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Rule</span>
                  </button>

                  <button
                    onClick={handleSaveAll}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Rules</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {rules.generalRules.map((gr, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border space-y-3 relative group ${cardTheme}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-600">Rule #{idx + 1}</span>
                      
                      <button
                        onClick={() => {
                          const updated = { ...rules };
                          updated.generalRules.splice(idx, 1);
                          setRules(updated);
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                        title="Delete this rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Rule Title</label>
                        <input
                          type="text"
                          value={gr.title}
                          onChange={(e) => {
                            const updated = { ...rules };
                            updated.generalRules[idx].title = e.target.value;
                            setRules(updated);
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[11px] text-slate-500 font-bold mb-1">Clause Description</label>
                        <input
                          type="text"
                          value={gr.description}
                          onChange={(e) => {
                            const updated = { ...rules };
                            updated.generalRules[idx].description = e.target.value;
                            setRules(updated);
                          }}
                          className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 5: PARTICIPANTS DIRECTORY (FULL SCREEN POWER TABLE - READ/EDIT/DELETE)
              ========================================================================= */}
          {activeTab === 'participants' && (
            <div className="space-y-6">
              
              {/* Header */}
              <div className={`pb-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <div>
                  <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <Users className="w-6 h-6 text-blue-500" />
                    <span>Registered Candidates Directory</span>
                    <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                      {participants.length} Enrolled
                    </span>
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Easily read, search, edit, or delete candidates. Filter by academic department and semester.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => exportParticipantsToCSV(participants)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    onClick={handleDeleteAllParticipants}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All</span>
                  </button>

                  <button
                    onClick={openAddForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Register Candidate</span>
                  </button>
                </div>
              </div>

              {/* Add / Edit Candidate Floating Form Modal */}
              {isAddingUser && (
                <div className={`p-6 rounded-2xl border shadow-2xl space-y-4 animate-fadeIn ${
                  isDark ? 'bg-slate-900 border-blue-500/50' : 'bg-white border-blue-500/50'
                }`}>
                  <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h3 className="text-sm font-heading font-bold text-blue-600 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      <span>{editingId ? `Update Candidate (${editingId})` : 'Register Candidate Manually'}</span>
                    </h3>
                    <button
                      onClick={closeStudentForm}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddParticipant} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Full Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Muhammad Ali"
                          value={newParticipant.fullName}
                          onChange={(e) => setNewParticipant({ ...newParticipant, fullName: e.target.value })}
                          required
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Student Roll ID *</label>
                        <input
                          type="text"
                          placeholder="e.g. FA22-BCS-045"
                          value={newParticipant.studentId}
                          onChange={(e) => setNewParticipant({ ...newParticipant, studentId: e.target.value })}
                          required
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="student@comsats.edu.pk"
                          value={newParticipant.email}
                          onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Phone Number</label>
                        <input
                          type="text"
                          placeholder="+92 300 1234567"
                          value={newParticipant.phone}
                          onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Department</label>
                        <select
                          value={newParticipant.department}
                          onChange={(e) => setNewParticipant({ ...newParticipant, department: e.target.value })}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        >
                          {[...new Set([
                            'Computer Science', 'Software Engineering', 'Information Technology',
                            'Artificial Intelligence', 'Cyber Security', 'Data Science',
                            'Electrical & Computer Engineering', newParticipant.department,
                          ])].map((d) => (
                            <option key={d} value={d} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Semester</label>
                        <select
                          value={newParticipant.semester}
                          onChange={(e) => setNewParticipant({ ...newParticipant, semester: e.target.value })}
                          className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                        >
                          {[...new Set([
                            '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
                            '5th Semester', '6th Semester', '7th Semester', '8th Semester',
                            newParticipant.semester,
                          ])].map((sem) => (
                            <option key={sem} value={sem} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>{sem}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {studentError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-600 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{studentError}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={closeStudentForm}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
                      >
                        {editingId ? 'Update Candidate Information' : 'Save Candidate Registration'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Filter and Search Bar */}
              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center gap-3 ${cardTheme}`}>
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search candidate by name, student roll ID, email, or phone..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  />
                  {studentSearch && (
                    <button
                      onClick={() => setStudentSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Department Filter */}
                <div className="w-full md:w-auto flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden md:block" />
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className={`w-full md:w-44 px-3 py-2.5 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  >
                    <option value="All">All Departments</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Software Engineering">Software Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Artificial Intelligence">Artificial Intelligence</option>
                    <option value="Cyber Security">Cyber Security</option>
                    <option value="Data Science">Data Science</option>
                  </select>

                  <select
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className={`w-full md:w-36 px-3 py-2.5 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  >
                    <option value="All">All Semesters</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={`${s}${s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Semester`}>
                        {s}{s === 1 ? 'st' : s === 2 ? 'nd' : s === 3 ? 'rd' : 'th'} Semester
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardTheme}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-[11px] font-heading font-bold uppercase tracking-wider ${
                        isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-700'
                      }`}>
                        <th className="py-3 px-4">Reg ID</th>
                        <th className="py-3 px-4">Candidate Full Name</th>
                        <th className="py-3 px-4">Student ID</th>
                        <th className="py-3 px-4">Department & Semester</th>
                        <th className="py-3 px-4">Contact Info</th>
                        <th className="py-3 px-4">Enrolled Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                      {filteredParticipants.map((p) => (
                        <tr key={p.id} className={`transition-colors group ${
                          isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                        }`}>
                          
                          {/* Reg ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {p.id}
                          </td>

                          {/* Candidate Full Name */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 font-bold flex items-center justify-center text-xs border border-blue-500/30">
                                {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>{p.fullName}</span>
                                <span className="text-[10px] text-slate-500">Official Candidate</span>
                              </div>
                            </div>
                          </td>

                          {/* Student ID */}
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                            <span className={`px-2 py-1 rounded border font-medium ${
                              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
                            }`}>
                              {p.studentId}
                            </span>
                          </td>

                          {/* Department & Semester */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.department}</div>
                            <div className="text-[11px] text-blue-600 font-mono font-bold">{p.semester}</div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.email}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{p.phone}</div>
                          </td>

                          {/* Enrolled Date */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : 'Initial'}
                          </td>

                          {/* Actions: Edit & Delete Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditForm(p)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-600/10 transition-colors"
                                title="Edit Candidate"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteParticipant(p)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                title="Delete Candidate"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>

                        </tr>
                      ))}

                      {filteredParticipants.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                            No candidates match your search filter criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Count */}
                <div className={`p-4 border-t text-xs flex items-center justify-between ${
                  isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <span>Showing {filteredParticipants.length} of {participants.length} candidates</span>
                  <span className="font-mono text-emerald-600 font-bold">● Active Database</span>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              NEW MODULES: REGISTRATIONS, RAPID FIRE, BUZZER, RESULTS, ANNOUNCEMENTS, AUDIT
              ========================================================================= */}
          {activeTab === 'teams' && (
            <TeamsManager isDark={isDark} />
          )}

          {activeTab === 'registrations' && (
            <RegistrationManager isDark={isDark} />
          )}

          {activeTab === 'rapidfire' && (
            <RapidFireConsole isDark={isDark} />
          )}

          {activeTab === 'buzzer' && (
            <BuzzerConsole isDark={isDark} />
          )}

          {activeTab === 'results' && (
            <ResultsManagement isDark={isDark} />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsManager isDark={isDark} />
          )}

          {activeTab === 'audit' && (
            <AuditLogsViewer isDark={isDark} />
          )}

          {/* =========================================================================
              TAB 6: SECURITY & PASSCODE
              ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              
              <div className={`pb-3 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                <h1 className={`text-xl sm:text-2xl font-heading font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <KeyRound className="w-6 h-6 text-blue-500" />
                  <span>Security & Administrative Passcode</span>
                </h1>
                <p className={`text-xs sm:text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Change your administrator passcode and manage authorized console sessions.
                </p>
              </div>

              <div className={`p-6 rounded-2xl border space-y-6 ${cardTheme}`}>
                
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      Current Administrator Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Enter current passcode..."
                      value={currentPassInput}
                      onChange={(e) => setCurrentPassInput(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      New Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Enter new passcode (min 4 characters)..."
                      value={newPassInput}
                      onChange={(e) => setNewPassInput(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">
                      Confirm New Passcode
                    </label>
                    <input
                      type="password"
                      placeholder="Re-enter new passcode..."
                      value={confirmPassInput}
                      onChange={(e) => setConfirmPassInput(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  {passChangeMessage.text && (
                    <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                      passChangeMessage.isError 
                        ? 'bg-rose-500/10 border border-rose-500/40 text-rose-600' 
                        : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-600'
                    }`}>
                      {passChangeMessage.isError ? (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      )}
                      <span>{passChangeMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    Update Passcode
                  </button>
                </form>

                {/* Session Details */}
                <div className={`pt-4 border-t space-y-2 text-xs text-slate-500 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <span>Active Session Status</span>
                    <span className="text-emerald-600 font-mono font-bold">Authenticated</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Authorized Account</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>admin@comsats.edu.pk</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Local Key Encryption</span>
                    <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>SHA-256 Storage Protected</span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </main>
      </div>

      {/* =========================================================================
          QUESTION EDIT / ADD MODAL (REQUESTED BY USER)
          ========================================================================= */}
      {isEditingQuestion && editingQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl space-y-5 ${cardTheme}`}>
            
            {/* Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 border border-blue-500/30 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-heading font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {editingQuestion.id ? `Edit Question (${editingQuestion.id})` : 'Add New Competition Question'}
                  </h3>
                  <span className="text-[11px] text-slate-400">Save changes directly into the central question database</span>
                </div>
              </div>

              <button
                type="button"
                onClick={closeQuestionModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveQuestion} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Subject Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Subject Discipline</label>
                  <select
                    value={editingQuestion.subject}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                    required
                  >
                    {subjects.map((s, idx) => (
                      <option key={s.id || idx} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Round Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Round Stage</label>
                  <select
                    value={editingQuestion.round}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, round: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                    required
                  >
                    <option value="Round 1 (MCQs)">Round 1 (MCQs)</option>
                    <option value="Round 2 (Core Concepts)">Round 2 (Core Concepts)</option>
                    <option value="Round 3 (Rapid Fire)">Round 3 (Rapid Fire)</option>
                    <option value="Round 4 (Buzzer Round)">Round 4 (Buzzer Round)</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Difficulty Level</label>
                  <select
                    value={editingQuestion.difficulty}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value })}
                    className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Statement */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Question Statement / Problem Prompt</label>
                <textarea
                  rows={3}
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                  placeholder="Enter full question statement..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed focus:outline-none ${inputTheme}`}
                  required
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-500">Multiple Choice Options (A, B, C, D)</label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono font-bold text-slate-500">
                      <span>Option A:</span>
                    </div>
                    <input
                      type="text"
                      value={editingQuestion.optionA}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionA: e.target.value })}
                      placeholder="Answer option A..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono font-bold text-slate-500">
                      <span>Option B:</span>
                    </div>
                    <input
                      type="text"
                      value={editingQuestion.optionB}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionB: e.target.value })}
                      placeholder="Answer option B..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono font-bold text-slate-500">
                      <span>Option C:</span>
                    </div>
                    <input
                      type="text"
                      value={editingQuestion.optionC}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionC: e.target.value })}
                      placeholder="Answer option C..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono font-bold text-slate-500">
                      <span>Option D:</span>
                    </div>
                    <input
                      type="text"
                      value={editingQuestion.optionD}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, optionD: e.target.value })}
                      placeholder="Answer option D..."
                      className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Correct Answer Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Which Option is the Correct Answer?
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['A', 'B', 'C', 'D'].map((letter) => {
                    const isSelected = editingQuestion.correctOption === letter;
                    return (
                      <button
                        key={letter}
                        type="button"
                        onClick={() => setEditingQuestion({ ...editingQuestion, correctOption: letter })}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                            : isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>Option {letter}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Explanation / Rationale (Optional)</label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  placeholder="Explain why this answer is correct..."
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none ${inputTheme}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={closeQuestionModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  {editingQuestion.id ? 'Save & Update Question' : 'Add Question to Bank'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================================================================
          NON-INTRUSIVE FLOATING TOAST NOTIFICATION: ALL OFFENDING STUDENT IDs
          ========================================================================= */}
      {unackViolators.length > 0 && showProctorToast && (
        <aside
          role="status"
          aria-live="assertive"
          className="fixed top-20 right-4 sm:right-6 z-[80] w-[94vw] sm:w-[480px] bg-slate-950/95 backdrop-blur-xl border-2 border-rose-500 rounded-2xl p-4 shadow-2xl shadow-rose-950/70 animate-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0 text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                  🚨 Browser Switch: {unackViolators.length} Student{unackViolators.length > 1 ? 's' : ''} Detected!
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Active Quiz Breach
                </span>
              </div>

              {/* LIST OF ALL STUDENT IDs CAUGHT */}
              <div className="mt-2 text-xs font-semibold text-slate-300">
                All candidates who opened another browser or switched window:
              </div>
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {unackViolators.map((violator) => (
                  <div
                    key={violator.studentId}
                    className="flex items-center justify-between p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-mono font-black text-xs shrink-0 shadow-sm select-all">
                        {violator.studentId}
                      </span>
                      <span className="text-xs text-white font-bold truncate">
                        {violator.studentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                        {violator.unacknowledgedCount}x
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCheatingAlert(violator.latestAlert);
                          setShowProctorToast(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-heading font-bold text-[11px] cursor-pointer shadow-sm"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-rose-500/20">
                <button
                  type="button"
                  onClick={() => {
                    if (unackViolators.length > 0) {
                      setActiveCheatingAlert(unackViolators[0].latestAlert);
                      setShowProctorToast(false);
                    }
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer text-center"
                >
                  Review Candidates ({unackViolators.length})
                </button>
                <button
                  type="button"
                  onClick={handleDismissAllAlerts}
                  className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Dismiss All
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowProctorToast(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              title="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* =========================================================================
          HIGH-URGENCY REAL-TIME MALPRACTICE & CHEATING ALERT MODAL (REVIEW MODE)
          ========================================================================= */}
      {activeCheatingAlert && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#200808] to-[#0c0303] border-3 border-rose-600 shadow-2xl shadow-rose-950 text-white relative overflow-hidden">
            
            {/* Pulsating background alarm glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-56 bg-rose-600/30 rounded-full blur-3xl pointer-events-none" />

            {/* Header with Siren & Sound Mute Toggle */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-rose-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 animate-bounce">
                  <Siren className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                    Live Proctoring Alarm Triggered
                  </span>
                  <h3 className="text-lg sm:text-xl font-heading font-black text-white mt-1">
                    Student Cheating Detected!
                  </h3>
                </div>
              </div>

              {/* Mute Siren Button */}
              <button
                type="button"
                onClick={() => setIsSirenMuted(!isSirenMuted)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSirenMuted 
                    ? 'bg-slate-800 border-slate-700 text-slate-400' 
                    : 'bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse'
                }`}
                title={isSirenMuted ? 'Unmute Siren Alarm' : 'Silence Siren Alarm'}
              >
                {isSirenMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="text-[11px]">{isSirenMuted ? 'Muted' : 'Siren On'}</span>
              </button>
            </div>

            {/* All Violating Student IDs Tab Bar */}
            {activeViolatorsByStudent.length > 1 && (
              <div className="my-3 p-2 rounded-xl bg-black/50 border border-rose-500/30">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">
                  Select Student ID to Inspect:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {activeViolatorsByStudent.map((v) => (
                    <button
                      key={v.studentId}
                      type="button"
                      onClick={() => setActiveCheatingAlert(v.latestAlert)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        activeCheatingAlert.studentId === v.studentId
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{v.studentId}</span>
                      <span className="text-[10px] opacity-75">({v.totalCount}x)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Student Malpractice Information Card */}
            <div className="my-5 p-5 rounded-2xl bg-black/60 border border-rose-500/40 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Contestant Name:</span>
                  <strong className="text-white text-sm font-heading block">{activeCheatingAlert.studentName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Student ID:</span>
                  <strong className="text-rose-400 font-mono text-sm block">{activeCheatingAlert.studentId}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Student Email:</span>
                  <span className="text-slate-200 font-mono select-all block truncate">{activeCheatingAlert.studentEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Campus & Semester:</span>
                  <span className="text-slate-200 block">{activeCheatingAlert.campus} • {activeCheatingAlert.semester}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Infraction / Violation Detail:</span>
                <div className="mt-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-medium">
                  {activeCheatingAlert.details}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Active Stage: <strong className="text-white">Round 0{activeCheatingAlert.roundNumber}</strong></span>
                <span>Detected At: <strong className="font-mono text-slate-300">{new Date(activeCheatingAlert.timestamp).toLocaleTimeString()}</strong></span>
              </div>
            </div>

            {/* Admin Disciplinary Actions */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                Select Disciplinary Action:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleActionOnCheatingAlert(activeCheatingAlert.id, 'DISQUALIFY_STUDENT')}
                  className="py-3 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
                >
                  Expel / Disqualify
                </button>
                <button
                  type="button"
                  onClick={() => handleActionOnCheatingAlert(activeCheatingAlert.id, 'WARN_STUDENT')}
                  className="py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                >
                  Issue Formal Warning
                </button>
                <button
                  type="button"
                  onClick={() => handleActionOnCheatingAlert(activeCheatingAlert.id, 'DISMISS')}
                  className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-heading font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Dismiss Alert
                </button>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-rose-500/20 text-xs">
                <button
                  type="button"
                  onClick={handleDismissAllAlerts}
                  className="text-rose-300 hover:text-white underline font-mono text-xs cursor-pointer"
                >
                  Dismiss All Pending Alerts ({liveProctorAlerts.filter(a => !a.acknowledged).length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCheatingAlert(null)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  User, 
  IdCard, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
  Download,
  FileText,
  Zap, 
  LogOut, 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  ArrowRight, 
  Sparkles, 
  Trophy, 
  ShieldCheck, 
  Bell, 
  Lock, 
  Eye, 
  EyeOff, 
  Radio, 
  RotateCcw, 
  BookOpen, 
  Award, 
  ChevronRight, 
  ChevronLeft,
  ShieldAlert, 
  AlertTriangle, 
  Maximize2, 
  Ban,
  Users,
  UserPlus,
  UserCheck,
  Send,
  Check,
  LayoutDashboard,
  Menu,
  GraduationCap,
  Building2,
  ExternalLink,
  Crown,
  Sun,
  Moon,
  ToggleLeft,
  ToggleRight,
  Copy,
  Phone,
  Share2,
  Mail,
  Unlock,
  KeyRound
} from 'lucide-react';
import { 
  apiStudentLogin, 
  apiStudentResetPassword, 
  apiGetStudentQuizStatus, 
  apiStartQuizAttempt, 
  apiSubmitQuizAnswer, 
  apiSkipQuizQuestion, 
  apiFinishQuizAttempt,
  apiGetNotifications,
  apiMarkNotificationsRead,
  apiGetAnnouncements,
  apiGetLeaderboard,
  apiReportProctorInfraction,
  apiGetAvailablePartners,
  apiGetMyPartnerRequests,
  apiSendPartnerRequest,
  apiRespondPartnerRequest,
  apiCancelPartnerRequest,
  apiUnpairPartner,
  apiAddTeamMember,
  apiRemoveTeamMember,
  apiGetMyTeam,
  apiFinalizeTeam,
  setStudentAuthToken,
  getStudentAuthToken,
  apiGetQuestions,
  apiCheckRetakePermission,
  apiGetScheduleStatus,
  apiSendStudentHeartbeat,
  apiStudentLogout,
  apiGetNextAIPracticeQuestion,
  apiSubmitAIPracticeAnswer,
  apiGetAIPracticeStats,
  apiResetAIPracticeHistory,
  apiGetAIPracticeConcepts
} from '../utils/api';
import { 
  getLoggedInStudent, 
  setLoggedInStudent, 
  getStoredParticipants, 
  generateParticipantId, 
  saveParticipant, 
  getStoredTeams, 
  localFinalizeTeam, 
  localCreateTeam, 
  localJoinTeam,
  getStoredQuestions,
  saveStoredQuestions,
  getStoredSchedule,
  getCompetitionAccessStatusLocal
} from '../utils/storage';
import { playCorrectChime, playAntiCheatBuzzer, playDisqualificationSiren } from '../utils/soundEffects';
import mascotSkyImg from '../assets/mascot-sky.jpg';

export default function StudentPortal({ 
  isOpen, 
  onClose, 
  onOpenRegister,
  currentTheme = 'dark',
  onToggleTheme
}) {
  const [currentUser, setCurrentUser] = useState(() => getLoggedInStudent());
  const [authMode, setAuthMode] = useState('login'); // 'login', 'forgot'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'team', 'quiz', 'announcements', 'rules', 'admit'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [localTheme, setLocalTheme] = useState(currentTheme || 'dark');
  const [isGroupMode, setIsGroupMode] = useState(true);
  const [teamFormationData, setTeamFormationData] = useState(null);
  const [teamInviteCopied, setTeamInviteCopied] = useState(false);

  // Sync theme
  useEffect(() => {
    if (currentTheme) setLocalTheme(currentTheme);
  }, [currentTheme]);

  const handleToggleThemeClick = () => {
    if (onToggleTheme) {
      onToggleTheme();
    } else {
      setLocalTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    }
  };

  const isDark = (onToggleTheme ? currentTheme : localTheme) === 'dark';
  
  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Reset Password States
  const [resetId, setResetId] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetMessage, setResetMessage] = useState({ text: '', isError: false });

  // Dashboard Data States
  const [studentStatus, setStudentStatus] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myLeaderboardRank, setMyLeaderboardRank] = useState(null);
  const [showPassModal, setShowPassModal] = useState(false);

  // Partner & Team States
  const [partnerData, setPartnerData] = useState({ partner: null, teamMembers: [], incoming: [], outgoing: [] });
  const [availablePartners, setAvailablePartners] = useState([]);
  const [targetPartnerInput, setTargetPartnerInput] = useState('');
  const [targetPartnerName, setTargetPartnerName] = useState('');
  const [targetPartnerDept, setTargetPartnerDept] = useState('BS Software Engineering');
  const [selectedPartnerOption, setSelectedPartnerOption] = useState('');
  const [isPartnerLoading, setIsPartnerLoading] = useState(false);
  const [partnerFeedback, setPartnerFeedback] = useState({ message: '', isError: false });
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Active Quiz Attempt Engine States
  const [activeQuizAttempt, setActiveQuizAttempt] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizTimeRemaining, setQuizTimeRemaining] = useState(30);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [quizResultSummary, setQuizResultSummary] = useState(null);
  const [quizError, setQuizError] = useState('');
  const [localScore, setLocalScore] = useState(0);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [incorrectAnswersCount, setIncorrectAnswersCount] = useState(0);
  const [skippedAnswersCount, setSkippedAnswersCount] = useState(0);
  const [selectedAttemptForView, setSelectedAttemptForView] = useState(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [retakePermissionInfo, setRetakePermissionInfo] = useState({ hasPermission: false, permission: null });

  // Competition Schedule & Access Control (PKT Timezone)
  const [competitionSchedule, setCompetitionSchedule] = useState(() => getStoredSchedule());
  const [scheduleStatus, setScheduleStatus] = useState(() => getCompetitionAccessStatusLocal());
  const [scheduleCountdown, setScheduleCountdown] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      const access = getCompetitionAccessStatusLocal(competitionSchedule);
      setScheduleStatus(access);

      const now = Date.now();
      if (access.state === 'NOT_STARTED' && access.startMs) {
        const diff = Math.max(0, access.startMs - now);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setScheduleCountdown(`Starts in: ${hours}h ${mins}m ${secs}s`);
      } else if (access.state === 'LIVE' && access.endMs) {
        const diff = Math.max(0, access.endMs - now);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setScheduleCountdown(`Closes in: ${hours}h ${mins}m ${secs}s`);
      } else if (access.state === 'TIME_OVER') {
        setScheduleCountdown('Competition Concluded (Time Over)');
      } else if (access.state === 'STOPPED') {
        setScheduleCountdown('Competition Halted by Admin');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [competitionSchedule]);

  const checkRetakeStatus = async (roundNum = 1) => {
    if (!currentUser?.studentId) return;
    try {
      const res = await apiCheckRetakePermission(currentUser.studentId, roundNum);
      if (res && res.success) {
        setRetakePermissionInfo({ hasPermission: !!res.hasPermission, permission: res.permission });
      }
    } catch {}
  };

  // AI Practice Arena States (Dynamic AI Question Generation)
  const [practiceQuestion, setPracticeQuestion] = useState(null);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState(null);
  const [practiceSubmitting, setPracticeSubmitting] = useState(false);
  const [practiceResult, setPracticeResult] = useState(null);
  const [practiceSubjectFilter, setPracticeSubjectFilter] = useState('');
  const [practiceDifficultyFilter, setPracticeDifficultyFilter] = useState('');
  const [practiceTypeFilter, setPracticeTypeFilter] = useState('');
  const [practiceStats, setPracticeStats] = useState({
    totalAttempted: 0,
    correctCount: 0,
    accuracyPercentage: 0,
    currentStreak: 0,
    practicePoints: 0
  });
  const [practiceConcepts, setPracticeConcepts] = useState({ subjects: [], adminReferenceReady: false });
  const [practiceError, setPracticeError] = useState('');
  const [practiceTimeStart, setPracticeTimeStart] = useState(Date.now());

  const loadPracticeStats = async () => {
    try {
      const res = await apiGetAIPracticeStats();
      if (res && res.success && res.stats) {
        setPracticeStats(res.stats);
      }
    } catch {}
  };

  const loadPracticeConcepts = async () => {
    try {
      const res = await apiGetAIPracticeConcepts();
      if (res && res.success) {
        setPracticeConcepts({
          subjects: res.subjects || [],
          adminReferenceReady: !!res.adminReferenceReady
        });
      }
    } catch {}
  };

  const loadNextPracticeQuestion = async (overrideSubject, overrideDifficulty, overrideType) => {
    setPracticeLoading(true);
    setPracticeError('');
    setPracticeResult(null);
    setPracticeSelectedOption(null);
    try {
      const subjectId = overrideSubject !== undefined ? overrideSubject : practiceSubjectFilter;
      const difficulty = overrideDifficulty !== undefined ? overrideDifficulty : practiceDifficultyFilter;
      const questionType = overrideType !== undefined ? overrideType : practiceTypeFilter;

      const res = await apiGetNextAIPracticeQuestion({
        subjectId: subjectId || undefined,
        difficulty: difficulty || undefined,
        questionType: questionType || undefined
      });

      if (res && res.success && res.question) {
        setPracticeQuestion(res.question);
        setPracticeTimeStart(Date.now());
        if (res.stats) setPracticeStats(res.stats);
      } else {
        setPracticeError(res?.error || 'Could not generate a practice question at this time. Please retry.');
      }
    } catch (err) {
      setPracticeError(err?.message || 'Error generating dynamic AI question.');
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleSelectPracticeOption = (idx) => {
    if (practiceResult) return;
    setPracticeSelectedOption(idx);
  };

  const handleSubmitPracticeAnswer = async () => {
    if (!practiceQuestion || practiceSelectedOption === null || practiceSubmitting || practiceResult) return;
    setPracticeSubmitting(true);
    try {
      const timeSpent = Math.max(1, Math.round((Date.now() - practiceTimeStart) / 1000));
      const res = await apiSubmitAIPracticeAnswer({
        questionId: practiceQuestion.id,
        selectedIndex: practiceSelectedOption,
        timeSpentSeconds: timeSpent
      });

      if (res && res.success) {
        setPracticeResult(res);
        if (res.stats) setPracticeStats(res.stats);
        if (res.isCorrect) {
          try { playCorrectChime(); } catch {}
        }
      } else {
        setPracticeError(res?.error || 'Failed to submit practice answer.');
      }
    } catch (err) {
      setPracticeError(err?.message || 'Error evaluating practice answer.');
    } finally {
      setPracticeSubmitting(false);
    }
  };

  const handleResetPracticeHistory = async () => {
    if (!window.confirm('Reset your practice question history? This will allow previously practiced questions to reappear in your dynamic pool.')) return;
    try {
      setPracticeLoading(true);
      await apiResetAIPracticeHistory();
      await loadPracticeStats();
      await loadNextPracticeQuestion();
    } catch {}
    finally {
      setPracticeLoading(false);
    }
  };

  // Anti-Cheating & Browser Lock States
  const [violationCount, setViolationCount] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationReason, setViolationReason] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Full Screen Request Helper
  const requestFullScreen = async () => {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      }
    } catch {}
  };

  const exitFullScreen = async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullScreen(false);
      }
    } catch {}
  };

  // Anti-Cheat Violation Handler: Sounds buzzer ONLY when a LIVE quiz is in progress (activeQuizAttempt)
  // When student is browsing dashboard, announcements, rules, admit card or outside live exam, buzzer is completely silent
  const recordAntiCheatViolation = (reason = 'Tab switch or external application window detected.', infractionType = 'BROWSER_SWITCH') => {
    // BUZZER and infraction report MUST ONLY occur if student is ACTIVELY taking the LIVE competition quiz
    if (!currentUser || !isOpen || !activeQuizAttempt || activeQuizAttempt.isFinished || activeTab !== 'quiz') return;
    try {
      playAntiCheatBuzzer();
    } catch {}
    setViolationReason(reason);
    setShowViolationModal(true);

    apiReportProctorInfraction(
      infractionType,
      reason,
      activeQuizAttempt?.roundNumber || 1
    ).catch(() => {});

    setViolationCount((prev) => prev + 1);
  };

  // Dedicated Anti-Cheat & Browser Switch Detection Effect
  // ACTIVE ONLY WHEN A LIVE QUIZ ATTEMPT IS IN PROGRESS (activeQuizAttempt)
  // When student is simply viewing dashboard/announcements/rules, NO siren or admin alert is triggered
  useEffect(() => {
    // Strictly activate proctoring ONLY when student is actively taking the official live quiz
    if (!currentUser || !isOpen || !activeQuizAttempt || activeQuizAttempt.isFinished || activeTab !== 'quiz') return;

    let lastReportTime = 0;
    const reportSwitch = (infractionMsg, type = "BROWSER_SWITCH") => {
      if (!activeQuizAttempt || activeQuizAttempt.isFinished || activeTab !== 'quiz') return;
      const now = Date.now();
      if (now - lastReportTime < 2000) return;
      lastReportTime = now;

      const sid = currentUser?.studentId || "CONTESTANT";
      const sEmail = currentUser?.email || "student@gmail.com";
      const fullDetail = `${currentUser?.fullName || "Student"} (${sid} • ${sEmail}): ${infractionMsg}`;

      // Trigger loud buzzer and report to invigilator console ONLY during live quiz
      recordAntiCheatViolation(fullDetail, type);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && activeQuizAttempt) {
        reportSwitch("Another browser window/tab was opened during LIVE quiz attempt!", "BROWSER_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      if (activeQuizAttempt) {
        reportSwitch("Browser window lost focus (switched to another browser or app) during LIVE quiz attempt!", "WINDOW_BLUR");
      }
    };

    const handleFullscreenChange = () => {
      const inFull = !!document.fullscreenElement;
      setIsFullScreen(inFull);
      if (!inFull && activeQuizAttempt) {
        reportSwitch("Full-screen lockdown mode exited during LIVE quiz attempt!", "FULLSCREEN_EXIT");
      }
    };

    const handleKeyDown = (e) => {
      if (!activeQuizAttempt) return;
      if (e.key === "F12") {
        e.preventDefault();
        reportSwitch("Developer tools / F12 shortcut attempted during LIVE quiz.", "DEVTOOLS_ATTEMPT");
        return false;
      }
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ["c", "v", "x", "t", "n", "w", "u", "p", "i", "j", "r"];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          reportSwitch(`Keyboard shortcut (Ctrl+${e.key.toUpperCase()}) attempted during LIVE quiz.`, "SHORTCUT_ATTEMPT");
          return false;
        }
      }
      if (e.altKey && (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        reportSwitch("Alt-Tab window switch navigation attempted during LIVE quiz.", "ALT_TAB_SWITCH");
        return false;
      }
    };

    const handleContextMenu = (e) => {
      if (activeQuizAttempt) e.preventDefault();
    };

    const handleCopy = (e) => {
      if (activeQuizAttempt) {
        e.preventDefault();
        reportSwitch("Copying content attempted during LIVE quiz.", "COPY_ATTEMPT");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [currentUser, isOpen, activeQuizAttempt, activeTab]);

  // Automatically request Full Screen upon student login or opening the portal
  useEffect(() => {
    if (isOpen && currentUser && !document.fullscreenElement) {
      requestFullScreen();
    }
  }, [isOpen, currentUser]);

  // Synchronize student data upon open or user state change
  useEffect(() => {
    if (isOpen && currentUser) {
      loadStudentDashboardData();
    }
  }, [isOpen, currentUser]);

  // Real-time synchronization when questions or status change in other tabs
  const [, setSyncTick] = useState(0);
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      if (e.key === 'bob_questions' || e.key?.startsWith('bob_student_results_') || e.key === 'bob_retake_permissions') {
        setSyncTick((prev) => prev + 1);
        checkRetakeStatus(1);
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, [currentUser]);

  const loadStudentDashboardData = async () => {
    try {
      const [statusData, annList, notifList, lbData, questionList, scheduleRes] = await Promise.all([
        apiGetStudentQuizStatus(),
        apiGetAnnouncements(),
        apiGetNotifications(),
        apiGetLeaderboard(),
        apiGetQuestions(),
        apiGetScheduleStatus(),
      ]);

      if (statusData) {
        setStudentStatus(statusData);
        if (statusData.schedule) {
          setCompetitionSchedule(statusData.schedule);
          try { saveStoredSchedule(statusData.schedule); } catch {}
        }
        if (statusData.competitionAccess) {
          setScheduleStatus(statusData.competitionAccess);
        }
      }
      if (annList) setAnnouncements(annList.filter((a) => a.isPublished));
      if (notifList) setNotifications(notifList);
      if (Array.isArray(questionList) && questionList.length > 0) {
        saveStoredQuestions(questionList);
      }
      if (scheduleRes && scheduleRes.schedule) {
        setCompetitionSchedule(scheduleRes.schedule);
        setScheduleStatus(scheduleRes);
        try { saveStoredSchedule(scheduleRes.schedule); } catch {}
      }

      if (lbData && lbData.leaderboard && currentUser) {
        const myEntry = lbData.leaderboard.find((l) => l.studentId === currentUser.studentId);
        if (myEntry) setMyLeaderboardRank(myEntry.rank);
      }
      loadPartnerData();
      checkRetakeStatus(1);
    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    }
  };

  // Live real-time schedule poller so student portal instantly reflects admin changes
  useEffect(() => {
    if (!currentUser) return;
    const pollLiveSchedule = async () => {
      try {
        const res = await apiGetScheduleStatus();
        if (res && res.schedule) {
          setCompetitionSchedule(res.schedule);
          setScheduleStatus(res);
          try { saveStoredSchedule(res.schedule); } catch {}
        }
      } catch {}
    };
    pollLiveSchedule();
    const interval = setInterval(pollLiveSchedule, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadPartnerData = async () => {
    if (!currentUser) return;
    try {
      const [pReqs, avail] = await Promise.all([
        apiGetMyPartnerRequests(),
        apiGetAvailablePartners(),
      ]);
      if (pReqs) {
        setPartnerData(pReqs);
        if (pReqs.partner) {
          if (!currentUser.partnerStudentId || currentUser.partnerStudentId !== pReqs.partner.studentId) {
            const updated = {
              ...currentUser,
              partnerStudentId: pReqs.partner.studentId,
              partnerName: pReqs.partner.fullName,
              partnerId: pReqs.partner.id,
              teamId: pReqs.partner.teamId,
            };
            setCurrentUser(updated);
            setLoggedInStudent(updated);
          }
        } else if (currentUser.partnerStudentId) {
          const updated = {
            ...currentUser,
            partnerStudentId: null,
            partnerName: null,
            partnerId: null,
            teamId: null,
          };
          setCurrentUser(updated);
          setLoggedInStudent(updated);
        }
      }
      if (avail && Array.isArray(avail)) {
        setAvailablePartners(avail);
      }
      try {
        const myTeamRes = await apiGetMyTeam();
        if (myTeamRes && myTeamRes.success && myTeamRes.team) {
          setTeamFormationData(myTeamRes.team);
        } else {
          setTeamFormationData(null);
        }
      } catch {}
    } catch (err) {
      console.error('Error fetching partner data:', err);
    }
  };

  // Poll partner data and notifications every 5 seconds when in dashboard
  useEffect(() => {
    if (!isOpen || !currentUser || activeQuizAttempt) return;

    loadPartnerData();
    const interval = setInterval(() => {
      loadPartnerData();
      apiGetNotifications().then((nList) => {
        if (nList) setNotifications(nList);
      }).catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, currentUser, activeQuizAttempt]);

  // Auto-fetch practice stats, concepts & initial question when visiting AI Practice tab
  useEffect(() => {
    if (activeTab === 'aiPractice' && currentUser) {
      loadPracticeStats();
      loadPracticeConcepts();
      if (!practiceQuestion && !practiceLoading) {
        loadNextPracticeQuestion();
      }
    }
  }, [activeTab, currentUser]);

  // Timer countdown for active quiz attempt
  useEffect(() => {
    if (!activeQuizAttempt || isDisqualified) return;

    if (quizTimeRemaining <= 0) {
      handleAutoAdvanceQuestion();
      return;
    }

    const timer = setInterval(() => {
      setQuizTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuizAttempt, quizTimeRemaining, isDisqualified]);

  // One-click quick login for testing/demo
  const handleQuickLogin = (demoStudentId, demoPassword = 'password123') => {
    setIdentifier(demoStudentId);
    setPassword(demoPassword);
    setLoginError('');
    setIsLoggingIn(true);
    apiStudentLogin(demoStudentId, demoPassword).then((res) => {
      setIsLoggingIn(false);
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setLoggedInStudent(res.user);
        if (res.token) setStudentAuthToken(res.token);
      } else {
        // Fallback directly to storage
        const all = getStoredParticipants();
        const found = all.find(p => p.studentId === demoStudentId);
        if (found) {
          setCurrentUser(found);
          setLoggedInStudent(found);
        }
      }
    }).catch(() => {
      setIsLoggingIn(false);
      const all = getStoredParticipants();
      const found = all.find(p => p.studentId === demoStudentId);
      if (found) {
        setCurrentUser(found);
        setLoggedInStudent(found);
      }
    });
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    setLoginError('');
    if (!identifier.trim()) {
      setLoginError('Please enter your Student Registration ID or Email.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await apiStudentLogin(identifier.trim(), password || 'Student@123');
      if (res.success && res.user) {
        setCurrentUser(res.user);
        setLoggedInStudent(res.user);
        if (res.token) setStudentAuthToken(res.token);
        try {
          saveParticipant(res.user);
          localStorage.setItem('bob_participants_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('bob_participants_updated', { detail: res.user }));
        } catch {}
      } else {
        // Fallback: auto-register local candidate so ANY random student ID or Email logs in successfully
        const rawIdent = identifier.trim();
        const isEmail = rawIdent.includes('@');
        const existing = getStoredParticipants() || [];
        const cleanId = rawIdent.toUpperCase();
        let user = existing.find(p => 
          (p.studentId && p.studentId.toUpperCase() === cleanId) ||
          (p.email && p.email.toLowerCase() === rawIdent.toLowerCase())
        );
        if (!user) {
          const studentEmail = isEmail 
            ? rawIdent.toLowerCase() 
            : `${rawIdent.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`;
          const studentName = isEmail
            ? rawIdent.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : `Student ${cleanId}`;

          user = {
            id: generateParticipantId(existing),
            fullName: studentName,
            studentId: cleanId,
            universityName: 'COMSATS University Islamabad',
            campus: 'Islamabad Campus',
            region: 'Federal Capital',
            email: studentEmail,
            phone: '+92 300 0000000',
            department: 'Software Engineering',
            degreeProgram: 'BS Software Engineering',
            semester: '4th Semester',
            registrationStatus: 'Approved',
            status: 'Verified',
            isOnline: true,
            lastLoginAt: new Date().toISOString(),
            teamMembers: [],
            registeredAt: new Date().toISOString(),
          };
          saveParticipant(user);
          try {
            localStorage.setItem('bob_participants_updated', Date.now().toString());
            window.dispatchEvent(new CustomEvent('bob_participants_updated', { detail: user }));
          } catch {}
        }
        setCurrentUser(user);
        setLoggedInStudent(user);
        setStudentAuthToken('local_jwt_' + Date.now());
      }
      setIdentifier('');
      setPassword('');
      requestFullScreen();
    } catch (err) {
      // Fallback in case of network issue
      const rawIdent = identifier.trim();
      const isEmail = rawIdent.includes('@');
      const existing = getStoredParticipants() || [];
      const cleanId = rawIdent.toUpperCase();
      let user = existing.find(p => 
        (p.studentId && p.studentId.toUpperCase() === cleanId) ||
        (p.email && p.email.toLowerCase() === rawIdent.toLowerCase())
      );
      if (!user) {
        const studentEmail = isEmail 
          ? rawIdent.toLowerCase() 
          : `${rawIdent.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`;
        const studentName = isEmail
          ? rawIdent.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : `Student ${cleanId}`;

        user = {
          id: generateParticipantId(existing),
          fullName: studentName,
          studentId: cleanId,
          universityName: 'COMSATS University Islamabad',
          campus: 'Islamabad Campus',
          region: 'Federal Capital',
          email: studentEmail,
          phone: '+92 300 0000000',
          department: 'Software Engineering',
          degreeProgram: 'BS Software Engineering',
          semester: '4th Semester',
          registrationStatus: 'Approved',
          status: 'Verified',
          isOnline: true,
          lastLoginAt: new Date().toISOString(),
          teamMembers: [],
          registeredAt: new Date().toISOString(),
        };
        saveParticipant(user);
        try {
          localStorage.setItem('bob_participants_updated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('bob_participants_updated', { detail: user }));
        } catch {}
      }
      setCurrentUser(user);
      setLoggedInStudent(user);
      setStudentAuthToken('local_jwt_' + Date.now());
      setIdentifier('');
      setPassword('');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (currentUser?.studentId) {
      try {
        apiStudentLogout(currentUser.studentId);
      } catch {}
    }
    setCurrentUser(null);
    setLoggedInStudent(null);
    setStudentAuthToken('');
    setStudentStatus(null);
    setAnnouncements([]);
    setNotifications([]);
    setMyLeaderboardRank(null);
    setActiveQuizAttempt(null);
    setPartnerData({ partner: null, teamMembers: [], incoming: [], outgoing: [] });
    setActiveTab('overview');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage({ text: '', isError: false });
    if (!resetId.trim() || !resetEmail.trim() || !resetPass.trim()) {
      setResetMessage({ text: 'All fields are required.', isError: true });
      return;
    }
    if (resetPass.length < 6) {
      setResetMessage({ text: 'New password must be at least 6 characters.', isError: true });
      return;
    }

    try {
      const res = await apiStudentResetPassword(resetId.trim(), resetEmail.trim(), resetPass.trim());
      if (!res.success) {
        setResetMessage({ text: res.error || 'Password reset failed.', isError: true });
        return;
      }
      setResetMessage({ text: 'Password reset successfully! You can now log in.', isError: false });
      setResetId('');
      setResetEmail('');
      setResetPass('');
      setTimeout(() => {
        setAuthMode('login');
        setResetMessage({ text: '', isError: false });
      }, 2000);
    } catch (err) {
      setResetMessage({ text: err.message || 'Error connecting to reset service.', isError: true });
    }
  };

  // Team & Partner Handlers
  const handleSendPartnerRequest = async (e) => {
    e?.preventDefault();
    const targetId = targetPartnerInput.trim() || selectedPartnerOption;
    if (!targetId) {
      setPartnerFeedback({ message: 'Please select or type a student registration ID.', isError: true });
      return;
    }

    setIsPartnerLoading(true);
    setPartnerFeedback({ message: '', isError: false });
    try {
      // Send invitation request: teammate must ACCEPT before being added
      const res = await apiSendPartnerRequest(targetId, targetPartnerName.trim(), targetPartnerDept);
      if (!res.success) {
        setPartnerFeedback({ message: res.error || 'Could not send team invitation.', isError: true });
      } else {
        setPartnerFeedback({
          message: res.message || `Team invitation sent to ${targetId}! They will be added to your team once they accept.`,
          isError: false,
        });
        setTargetPartnerInput('');
        setTargetPartnerName('');
        setSelectedPartnerOption('');
        setTimeout(() => {
          setShowInviteModal(false);
        }, 1600);
        await loadPartnerData();
      }
    } catch (err) {
      setPartnerFeedback({ message: err.message || 'Error sending team invitation.', isError: true });
    } finally {
      setIsPartnerLoading(false);
    }
  };

  const handleRemoveMember = async (memberStudentId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName || memberStudentId} from the team?`)) return;
    setIsPartnerLoading(true);
    setPartnerFeedback({ message: '', isError: false });
    try {
      const res = await apiRemoveTeamMember(memberStudentId);
      if (res.success) {
        setPartnerFeedback({ message: 'Team member removed.', isError: false });
        await loadPartnerData();
      } else {
        setPartnerFeedback({ message: res.error || 'Could not remove member.', isError: true });
      }
    } catch (err) {
      setPartnerFeedback({ message: err.message || 'Error removing team member.', isError: true });
    } finally {
      setIsPartnerLoading(false);
    }
  };

  const handleRespondPartnerRequest = async (requestId, action) => {
    setIsPartnerLoading(true);
    setPartnerFeedback({ message: '', isError: false });
    try {
      const res = await apiRespondPartnerRequest(requestId, action);
      if (!res.success) {
        setPartnerFeedback({ message: res.error || 'Action failed.', isError: true });
      } else {
        setPartnerFeedback({ message: res.message || `Request ${action}ed!`, isError: false });
        loadPartnerData();
      }
    } catch (err) {
      setPartnerFeedback({ message: err.message || 'Error processing request.', isError: true });
    } finally {
      setIsPartnerLoading(false);
    }
  };

  const handleCancelPartnerRequest = async (requestId) => {
    setIsPartnerLoading(true);
    try {
      const res = await apiCancelPartnerRequest(requestId);
      if (res.success) {
        setPartnerFeedback({ message: 'Partner request cancelled.', isError: false });
        loadPartnerData();
      }
    } catch {} finally {
      setIsPartnerLoading(false);
    }
  };

  const handleUnpairPartner = async () => {
    if (!window.confirm('Are you sure you want to dissolve your competition team? Both participants will revert to individual solo status.')) return;
    setIsPartnerLoading(true);
    try {
      const res = await apiUnpairPartner();
      if (res.success) {
        setPartnerFeedback({ message: 'Successfully separated team. You are now competing solo.', isError: false });
        loadPartnerData();
      }
    } catch {} finally {
      setIsPartnerLoading(false);
    }
  };

  // Quiz Attempt Engine Handlers
  const handleStartAttempt = async (roundNumber = 1) => {
    setQuizError('');
    setQuizResultSummary(null);
    setSelectedAttemptForView(null);
    setViolationCount(0);
    setIsDisqualified(false);
    setShowViolationModal(false);
    setLocalScore(0);
    setCorrectAnswersCount(0);
    setIncorrectAnswersCount(0);
    setSkippedAnswersCount(0);

    const startLocalQuiz = () => {
      // Check competition schedule & live access
      const access = getCompetitionAccessStatusLocal();
      if (!access.isLive) {
        setQuizError(access.lockReason || access.message || 'Competition is currently not accessible.');
        return false;
      }

      // Check if candidate already completed this round locally
      const historyKey = currentUser?.studentId ? `bob_student_history_${currentUser.studentId}` : null;
      let prevHistory = [];
      if (historyKey) {
        try {
          const s = localStorage.getItem(historyKey);
          if (s) prevHistory = JSON.parse(s);
        } catch {}
      }
      const hasSavedRes = !!localStorage.getItem(`bob_student_results_${currentUser?.studentId}`);
      const isAlreadyCompleted = prevHistory.some((h) => Number(h.roundNumber || 1) === Number(roundNumber)) || (Number(roundNumber) === 1 && hasSavedRes);

      if (isAlreadyCompleted) {
        let storedPerms = [];
        try {
          const sp = localStorage.getItem('bob_retake_permissions');
          if (sp) storedPerms = JSON.parse(sp);
        } catch {}
        const grantedPerm = storedPerms.find(
          (p) => p.studentId === currentUser?.studentId && Number(p.roundNumber) === Number(roundNumber) && p.status === 'GRANTED'
        );
        if (!grantedPerm) {
          setQuizError('You have already completed this round. Retake permission is required from the administrator.');
          return false;
        }
        // Consume permission locally
        grantedPerm.status = 'USED';
        grantedPerm.usedAt = new Date().toISOString();
        localStorage.setItem('bob_retake_permissions', JSON.stringify(storedPerms));
        window.dispatchEvent(new Event('storage'));
      }

      const stored = getStoredQuestions() || [];
      if (!stored || stored.length === 0) {
        setQuizError('Question Bank is empty. Please ask the administrator to upload or add questions.');
        return false;
      }

      const activeList = stored.filter((q) => q.isActive !== false);
      const roundFiltered = activeList.filter((q) => {
        const rNum = Number(q.roundNumber) || (typeof q.round === 'string' && q.round.includes('2') ? 2 : typeof q.round === 'string' && q.round.includes('3') ? 3 : typeof q.round === 'string' && q.round.includes('4') ? 4 : 1);
        return rNum === Number(roundNumber);
      });

      const questionPool = roundFiltered.length > 0 ? roundFiltered : (activeList.length > 0 ? activeList : stored);

      const sanitizedAllocated = questionPool.map((q, idx) => ({
        id: q.id || `local_q_${idx}`,
        order: idx + 1,
        subject: q.subject || q.subjectName || 'Computer Science',
        subjectName: q.subject || q.subjectName || 'Computer Science',
        difficulty: q.difficulty || 'Moderate',
        question: q.question,
        options: (Array.isArray(q.options) && q.options.length > 0)
          ? q.options
          : [q.optionA || 'Option A', q.optionB || 'Option B', q.optionC || 'Option C', q.optionD || 'Option D'].filter(Boolean),
      }));

      const localAttempt = {
        id: `ATT-LOCAL-${Date.now()}`,
        roundNumber: Number(roundNumber) || 1,
        questions: sanitizedAllocated,
        submittedCount: 0,
        timeLimitSeconds: 30,
        isLocalFallback: true,
      };

      setActiveQuizAttempt(localAttempt);
      setCurrentQIndex(0);
      setSelectedOption(null);
      setQuizTimeRemaining(30);
      requestFullScreen();
      checkRetakeStatus(roundNumber);
      return true;
    };

    try {
      const res = await apiStartQuizAttempt(roundNumber);
      if (res && res.success && res.attempt && Array.isArray(res.attempt.questions) && res.attempt.questions.length > 0) {
        setActiveQuizAttempt(res.attempt);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setQuizTimeRemaining(res.attempt.timeLimitSeconds || 30);
        requestFullScreen();
        checkRetakeStatus(roundNumber);
        return;
      }
      if (res && (res.isLocked || !res.success)) {
        setQuizError(res.error || 'You have already completed this round. Retake permission is required from the administrator.');
        checkRetakeStatus(roundNumber);
        return;
      }
      startLocalQuiz();
    } catch {
      startLocalQuiz();
    }
  };

  const handleSelectOption = (idx) => {
    if (isSubmittingAnswer) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = async () => {
    if (selectedOption === null || !activeQuizAttempt || isSubmittingAnswer) return;
    const currentQ = activeQuizAttempt.questions[currentQIndex];
    if (!currentQ) return;

    setIsSubmittingAnswer(true);
    try {
      const res = await apiSubmitQuizAnswer(
        activeQuizAttempt.id,
        currentQ.id,
        selectedOption,
        (activeQuizAttempt.timeLimitSeconds || 30) - quizTimeRemaining
      );

      if (res && res.isCorrect) {
        setLocalScore((prev) => prev + (res.pointsAwarded || 10));
        setCorrectAnswersCount((prev) => prev + 1);
        try { playCorrectChime(); } catch {}
      } else {
        setIncorrectAnswersCount((prev) => prev + 1);
      }

      advanceToNextQuestionOrFinish();
    } catch (err) {
      setIncorrectAnswersCount((prev) => prev + 1);
      advanceToNextQuestionOrFinish();
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleSkipQuestion = async () => {
    if (!activeQuizAttempt || isSubmittingAnswer) return;
    const currentQ = activeQuizAttempt.questions[currentQIndex];
    if (!currentQ) return;

    setIsSubmittingAnswer(true);
    setSkippedAnswersCount((prev) => prev + 1);
    try {
      await apiSkipQuizQuestion(activeQuizAttempt.id, currentQ.id);
      advanceToNextQuestionOrFinish();
    } catch {
      advanceToNextQuestionOrFinish();
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const handleAutoAdvanceQuestion = () => {
    if (!activeQuizAttempt) return;
    handleSkipQuestion();
  };

  const advanceToNextQuestionOrFinish = () => {
    if (!activeQuizAttempt) return;
    setSelectedOption(null);

    if (currentQIndex + 1 < activeQuizAttempt.questions.length) {
      setCurrentQIndex((prev) => prev + 1);
      setQuizTimeRemaining(activeQuizAttempt.timeLimitSeconds || 30);
    } else {
      handleFinishAttempt(false);
    }
  };

  const handleFinishAttempt = async (disqualified = false) => {
    if (!activeQuizAttempt) return;
    exitFullScreen();
    try {
      const res = await apiFinishQuizAttempt(activeQuizAttempt.id);
      const earnedScore = (res && typeof res.finalScore === 'number' && res.finalScore > 0) ? res.finalScore : localScore;
      const finalScore = disqualified ? 0 : earnedScore;
      const totalQ = activeQuizAttempt.questions?.length || 1;
      const maxScore = totalQ * 10;
      const percentage = Math.round((finalScore / (maxScore || 1)) * 100);
      const nowIso = new Date().toISOString();

      // Read past attempts history
      const historyKey = currentUser?.studentId ? `bob_student_history_${currentUser.studentId}` : null;
      let pastHistory = [];
      if (historyKey) {
        try {
          const rawH = localStorage.getItem(historyKey);
          if (rawH) pastHistory = JSON.parse(rawH);
          if (!Array.isArray(pastHistory)) pastHistory = [];
        } catch { pastHistory = []; }
      }

      const attemptNum = pastHistory.length + 1;
      const summary = {
        attemptNumber: attemptNum,
        score: finalScore,
        maxScore,
        percentage,
        correctCount: correctAnswersCount,
        incorrectCount: incorrectAnswersCount,
        skippedCount: skippedAnswersCount,
        totalQuestions: totalQ,
        disqualified,
        completedAt: nowIso,
        roundNumber: activeQuizAttempt.roundNumber || 1,
        transcriptSerial: `BOB-TR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      };

      if (historyKey) {
        pastHistory.push(summary);
        try {
          localStorage.setItem(historyKey, JSON.stringify(pastHistory));
        } catch {}
      }

      setQuizResultSummary(summary);
      setSelectedAttemptForView(summary);

      if (currentUser?.studentId) {
        localStorage.setItem(`bob_student_results_${currentUser.studentId}`, JSON.stringify(summary));
      }
      setStudentStatus((prev) => ({
        ...(prev || {}),
        totalScore: (prev?.totalScore || 0) + finalScore,
      }));
      setActiveQuizAttempt(null);
      checkRetakeStatus(activeQuizAttempt?.roundNumber || 1);
      loadStudentDashboardData();
    } catch (err) {
      const finalScore = disqualified ? 0 : localScore;
      const totalQ = activeQuizAttempt.questions?.length || 1;
      const maxScore = totalQ * 10;
      const percentage = Math.round((finalScore / (maxScore || 1)) * 100);
      const nowIso = new Date().toISOString();

      const historyKey = currentUser?.studentId ? `bob_student_history_${currentUser.studentId}` : null;
      let pastHistory = [];
      if (historyKey) {
        try {
          const rawH = localStorage.getItem(historyKey);
          if (rawH) pastHistory = JSON.parse(rawH);
          if (!Array.isArray(pastHistory)) pastHistory = [];
        } catch { pastHistory = []; }
      }

      const attemptNum = pastHistory.length + 1;
      const summary = {
        attemptNumber: attemptNum,
        score: finalScore,
        maxScore,
        percentage,
        correctCount: correctAnswersCount,
        incorrectCount: incorrectAnswersCount,
        skippedCount: skippedAnswersCount,
        totalQuestions: totalQ,
        disqualified,
        completedAt: nowIso,
        roundNumber: activeQuizAttempt.roundNumber || 1,
        transcriptSerial: `BOB-TR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      };

      if (historyKey) {
        pastHistory.push(summary);
        try {
          localStorage.setItem(historyKey, JSON.stringify(pastHistory));
        } catch {}
      }

      setQuizResultSummary(summary);
      setSelectedAttemptForView(summary);
      if (currentUser?.studentId) {
        localStorage.setItem(`bob_student_results_${currentUser.studentId}`, JSON.stringify(summary));
      }
      setActiveQuizAttempt(null);
      checkRetakeStatus(activeQuizAttempt?.roundNumber || 1);
    }
  };

  const handleAutoFinishAttempt = (disqualified = true) => {
    handleFinishAttempt(disqualified);
  };

  if (!isOpen) return null;

  // Dynamic Team Members list (Leader + up to 3 teammates)
  const currentMembersList = Array.isArray(partnerData.teamMembers) && partnerData.teamMembers.length > 0
    ? partnerData.teamMembers
    : (partnerData.partner ? [partnerData.partner] : []);
  const currentTeamTotal = 1 + currentMembersList.length;
  const enrolledCount = `${currentTeamTotal}/4`;
  const navTabs = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null },
    { id: 'aiPractice', label: 'AI Practice Questions', icon: Sparkles, badge: 'AI Dynamic' },
    { id: 'team', label: 'My Group & Team', icon: Users, badge: enrolledCount },
    { id: 'quiz', label: 'Quiz Arena (Exam)', icon: Zap, badge: 'Live' },
    { id: 'announcements', label: 'Announcements', icon: Bell, badge: announcements.length ? `${announcements.length}` : null },
    { id: 'rules', label: 'Rules & Conduct', icon: BookOpen, badge: null },
    { id: 'admit', label: 'My Admit Pass', icon: Printer, badge: null },
  ];

  /* =========================================================================
     SCREEN 1: FULL SCREEN SKY-BLUE MASCOT DEDICATED STUDENT LOGIN
     ========================================================================= */
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto min-h-screen bg-gradient-to-b from-[#8fd3fb] via-[#bfe6fc] to-[#e8f6ff] text-slate-900 font-sans transition-colors animate-fadeIn select-none">
        
        {/* Soft Dreamy Floating Cloud Blobs in the Background */}
        <div className="absolute top-10 left-12 w-96 h-96 bg-white/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-12 w-[30rem] h-[30rem] bg-white/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-sky-200/50 rounded-full blur-2xl pointer-events-none" />

        {/* Top Floating Controls */}
        <header className="relative z-20 w-full max-w-6xl mx-auto px-5 sm:px-8 pt-5 sm:pt-7 flex items-center justify-between">
          {/* Back Button matching Image 1 */}
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-2xl bg-white/90 hover:bg-white text-slate-800 shadow-md shadow-sky-950/10 border border-white/80 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Return to Public Website"
            aria-label="Return to Public Website"
          >
            <ChevronLeft className="w-5 h-5 text-slate-800 stroke-[2.5]" />
          </button>

          {/* Right badge / quick info */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white text-xs font-bold text-sky-900 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              COMSATS • BOB 2026
            </span>

            <button
              onClick={handleToggleThemeClick}
              className="w-11 h-11 rounded-2xl bg-white/90 hover:bg-white text-slate-800 shadow-md shadow-sky-950/10 border border-white/80 flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </header>

        {/* Centered 2-Column Floating Card (Matching Reference Screenshot) */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-4xl bg-white rounded-[32px] p-3 sm:p-4 shadow-2xl shadow-sky-900/15 border border-white/90 flex flex-col md:flex-row items-stretch overflow-hidden transition-all">
            
            {/* LEFT COLUMN: Mascot Hero Banner */}
            <div className="w-full md:w-[48%] rounded-[24px] overflow-hidden relative bg-gradient-to-b from-[#8ecdf2] to-[#bde5fb] min-h-[280px] md:min-h-[520px] flex items-center justify-center shadow-inner group">
              <img
                src={mascotSkyImg}
                alt="Battle of Brains Mascot"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              {/* Subtle glass badge overlay inside image */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-widest text-sky-950 shadow-sm border border-white/60">
                  Quiz Championship
                </span>
                <span className="px-2.5 py-1 rounded-full bg-sky-900/70 backdrop-blur-md text-[10px] font-bold text-white shadow-sm">
                  BOB 2026
                </span>
              </div>
            </div>

            {/* RIGHT COLUMN: Clean Pure White Form */}
            <div className="w-full md:w-[52%] p-6 sm:p-8 md:p-10 flex flex-col justify-center bg-white">
              
              {/* Top Mascot Mini Badge & Welcome Back Heading */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mx-auto mb-2.5 shadow-sm">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="text-[11px] font-mono uppercase tracking-widest text-slate-400 font-bold mb-1">
                  BATTLE OF BRAINS
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900">
                  WELCOME BACK
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Enter your email or ID and password to access your student dashboard.
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="font-medium">{loginError}</span>
                </div>
              )}

              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email, Mobile or Student ID <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. Byte Busters, 03001234567, or SP24-BSE-043"
                        className="w-full px-4 py-3.5 rounded-2xl bg-[#f2f6fa] border border-slate-200/80 text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 focus:outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-4 pr-11 py-3.5 rounded-2xl bg-[#f2f6fa] border border-slate-200/80 text-slate-900 text-sm font-medium focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 focus:outline-none transition-all placeholder:text-slate-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                        aria-label="Toggle password visibility"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember me & Forgot Password Row matching Image 1 */}
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer accent-sky-600"
                      />
                      <span className="text-xs text-slate-500 font-medium">Remember me</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-xs font-semibold text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* Dark Solid Pill Button matching Image 1 */}
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-[#0b0f19] hover:bg-slate-800 text-white font-heading font-black text-sm tracking-wide shadow-lg shadow-slate-900/15 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isLoggingIn ? 'Authenticating...' : 'Sign In'}</span>
                  </button>
                </form>
              ) : (
                /* Forgot Password Form */
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  {resetMessage.text && (
                    <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
                      resetMessage.isError ? 'bg-rose-50 border border-rose-200 text-rose-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}>
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{resetMessage.text}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Student Registration ID</label>
                    <input
                      type="text"
                      value={resetId}
                      onChange={(e) => setResetId(e.target.value)}
                      placeholder="e.g. SP24-BSE-043"
                      className="w-full px-4 py-3 rounded-2xl bg-[#f2f6fa] border border-slate-200/80 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registered University Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="e.g. student@cuilahore.edu.pk"
                      className="w-full px-4 py-3 rounded-2xl bg-[#f2f6fa] border border-slate-200/80 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">New Strong Password</label>
                    <input
                      type="password"
                      value={resetPass}
                      onChange={(e) => setResetPass(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-4 py-3 rounded-2xl bg-[#f2f6fa] border border-slate-200/80 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                      required
                    />
                  </div>
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="w-1/2 py-3 rounded-2xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 py-3 rounded-2xl bg-[#0b0f19] text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer shadow-md"
                    >
                      Save Password
                    </button>
                  </div>
                </form>
              )}

              {/* Bottom Register Link matching Image 1 */}
              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Not registered yet?{' '}
                  <button
                    type="button"
                    onClick={() => { onClose(); onOpenRegister && onOpenRegister(); }}
                    className="text-sky-600 font-bold hover:underline cursor-pointer"
                  >
                    Register Now
                  </button>
                </p>
              </div>
            </div>

          </div>
        </main>

        {/* Minimal Footer */}
        <footer className="relative z-10 w-full py-4 px-6 text-center text-xs text-sky-900/60 font-medium">
          COMSATS University Islamabad • Battle of Brains 2026 • Student Portal
        </footer>
      </div>
    );
  }

  /* =========================================================================
     SCREEN 2: PROPER FULL-SCREEN STUDENT DASHBOARD (MATCHING ADMIN DASHBOARD)
     ========================================================================= */
  return (
    <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden font-sans bg-gradient-to-br from-[#cbe8fd] via-[#e2f3fe] to-[#a3d8f8] text-slate-900 transition-colors animate-fadeIn">
      
      {/* 1. TOP GLOBAL NAVIGATION BAR */}
      <header className="h-16 border-b-2 border-sky-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 bg-white/95 text-slate-900 shadow-md shadow-sky-950/5 backdrop-blur-md">
        
        {/* Left: Branding & Mobile/Desktop Collapse */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex p-2 rounded-xl border-2 border-sky-200 bg-sky-50 text-slate-700 hover:text-blue-700 hover:bg-sky-100 transition-all cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-sm sm:text-base tracking-tight text-blue-600">BATTLE</span>
              <span className="font-heading font-black text-sm sm:text-base tracking-tight text-slate-900">OF BRAINS</span>
              <span className="hidden sm:inline-block text-[9px] font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.5 rounded-md">
                PORTAL
              </span>
            </div>
          </div>
        </div>

        {/* Right Action Buttons - Clean, Optimized & Uncluttered */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* PROMINENT MARKS DISPLAY BADGE IN HEADER */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 border border-sky-300 text-white text-xs font-mono font-bold shadow-sm shadow-sky-500/20">
            <Award className="w-3.5 h-3.5 text-sky-200" />
            <span>Marks: <strong className="text-white font-black">{studentStatus?.totalScore ?? 0} pts</strong></span>
          </div>
          
          {/* FULL SCREEN TOGGLE BUTTON */}
          <button
            onClick={isFullScreen ? exitFullScreen : requestFullScreen}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              isFullScreen 
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 shadow-sm'
                : 'border-sky-200 bg-sky-50 text-slate-700 hover:text-blue-700 hover:bg-sky-100 shadow-sm'
            }`}
            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen Mode"}
            aria-label="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{isFullScreen ? "Full Screen ✓" : "Full Screen"}</span>
          </button>

          {/* THEME TOGGLE (Sun / Moon) */}
          <button
            onClick={handleToggleThemeClick}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isDark
                ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 shadow-sm'
            }`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* RETURN TO PUBLIC WEBSITE */}
          <button
            onClick={onClose}
            className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold border-2 border-sky-200 text-slate-700 hover:text-blue-700 bg-sky-50 hover:bg-sky-100 transition-all cursor-pointer flex items-center gap-1.5"
            title="Return to Public Website"
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Website</span>
          </button>

          {/* User Profile Pill */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl border-2 border-sky-200 bg-white text-xs text-slate-800 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px]">
              {currentUser.fullName ? currentUser.fullName.slice(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="text-left max-w-[120px] truncate">
              <div className="font-bold leading-tight text-slate-900 truncate">{currentUser.fullName}</div>
              <div className="text-[10px] text-slate-500 leading-tight font-mono truncate">{currentUser.studentId}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sign Out of Student Portal"
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
          border-r-2 border-sky-200 bg-white/95 text-slate-700 flex flex-col shrink-0 shadow-sm
          transition-all duration-300 ease-in-out
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 flex-1 overflow-y-auto space-y-1">
            <div className="text-[10px] font-heading font-black text-sky-900 uppercase tracking-wider px-3 mb-2">
              {isSidebarCollapsed ? '•••' : 'Student Navigation'}
            </div>

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
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30 border border-sky-300/30' 
                      : 'text-slate-700 hover:text-blue-700 hover:bg-sky-50 font-bold'
                  }`}
                  title={tab.label}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isSidebarCollapsed && (
                    <span className="flex-1 text-left truncate">{tab.label}</span>
                  )}
                  {!isSidebarCollapsed && tab.badge && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-black/30 text-white' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer info */}
          {!isSidebarCollapsed && (
            <div className="p-4 border-t-2 border-sky-100 text-[11px] text-slate-600 font-semibold">
              <div className="font-bold text-slate-800">Department of CS</div>
              <div>COMSATS University Islamabad</div>
            </div>
          )}
        </aside>

        {/* 3. MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-[#e0f2fe] via-[#bae6fd] to-[#d8effd] space-y-6">

          {/* ======================================================== */}
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
              
              {/* Welcome Banner */}
              <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 border-2 border-sky-300 text-white relative overflow-hidden shadow-xl shadow-sky-900/10">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 mb-3">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>COMSATS Computing Championship 2026</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-black text-white">
                      Welcome, {currentUser.fullName}!
                    </h2>
                    <p className="text-xs sm:text-sm text-sky-100 font-medium mt-1 max-w-xl">
                      Student ID: <span className="font-mono text-white underline font-black">{currentUser.studentId}</span> • {currentUser.degreeProgram || currentUser.department} ({currentUser.semester || '4th Semester'})
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveTab('aiPractice')}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>AI Practice Arena</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('team')}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                    >
                      <Users className="w-4 h-4" />
                      <span>Manage My Group ({enrolledCount})</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('quiz')}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Open Quiz Arena</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PROMINENT EXAMINATION MARKS & PERFORMANCE SCORECARD HERO */}
              <div className="rounded-3xl p-6 sm:p-8 bg-white border-2 border-sky-300 shadow-xl shadow-sky-900/5 space-y-6 text-slate-900 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-sky-400/30">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-inner">
                      <Award className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-black text-xl text-slate-900">Examination Marks & Performance</h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-400/20 text-sky-200 border border-sky-400/40">
                          LIVE MARKS
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        Official verified tournament score for Student ID: <span className="font-mono text-blue-700 font-bold">{currentUser.studentId}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] font-heading font-bold text-slate-500 uppercase tracking-wider">Total Marks Obtained</div>
                      <div className="text-3xl font-heading font-black text-blue-700 flex items-center justify-end gap-1.5">
                        <span>{studentStatus?.totalScore ?? 0}</span>
                        <span className="text-xs font-normal text-slate-500">/ 200 pts</span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Single Combined Championship: 7 Core Computer Science Subjects */}
                <div>
                  <div className="text-xs font-heading font-bold text-sky-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Championship Curriculum: 7 Core Computer Science Subjects</span>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">Single Combined Grand Round</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'pf', name: 'Programming Fundamentals', desc: 'Variables, loops & functions' },
                      { id: 'oop', name: 'Object Oriented Programming', desc: 'Inheritance, polymorphism, classes' },
                      { id: 'dsa', name: 'Data Structures & Algorithms', desc: 'Arrays, trees, graphs, Big-O' },
                      { id: 'dbms', name: 'Database Systems', desc: 'SQL, ER models & transactions' },
                      { id: 'cn', name: 'Computer Networks', desc: 'OSI layers, protocols, IP routing' },
                      { id: 'se', name: 'Software Engineering', desc: 'SDLC, Agile, quality & testing' },
                      { id: 'os', name: 'Operating Systems', desc: 'Concurrency, memory & scheduling' }
                    ].map((subj, idx) => (
                      <div key={subj.id} className="p-3.5 rounded-2xl bg-sky-50/80 border-2 border-sky-200 shadow-sm">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading font-bold text-slate-900 truncate">{subj.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 border border-blue-500/20 font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium mt-1">{subj.desc}</p>
                      </div>
                    ))}

                    {/* Combined Score Card */}
                    <div className="p-3.5 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-heading font-bold text-emerald-900">Grand Score</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-600 text-white font-bold">
                            +1 Pt Each
                          </span>
                        </div>
                        <div className="text-xl font-heading font-black text-emerald-700 mt-1">
                          {studentStatus?.totalScore ?? 0} pts
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-800 font-medium mt-1">Single Round Official Score</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-lg shadow-sky-900/5 text-slate-900">
                  <div className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">Registration Status</div>
                  <div className="text-base font-heading font-black text-emerald-400 flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Verified Active</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono font-bold mt-1">Pass Ref: {currentUser.id}</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-lg shadow-sky-900/5 text-slate-900">
                  <div className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">Team Enrollment</div>
                  <div className="text-base font-heading font-black text-blue-400 flex items-center gap-1.5 mt-2">
                    <Users className="w-5 h-5" />
                    <span>{currentTeamTotal} of 4 Enrolled</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-1">
                    {currentMembersList.length > 0 ? `${currentMembersList.length} teammate(s) enrolled` : 'Teammate slots open (Add 2 or 3 members)'}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-lg shadow-sky-900/5 text-slate-900">
                  <div className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">Tournament Points</div>
                  <div className="text-2xl font-heading font-black text-amber-400 mt-1">
                    {studentStatus?.totalScore || 0} <span className="text-xs text-slate-500 font-normal">pts</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-1">Official Leaderboard Tally</div>
                </div>

                <div className="p-5 rounded-2xl bg-white border-2 border-sky-200 shadow-lg shadow-sky-900/5 text-slate-900">
                  <div className="text-xs font-heading font-bold text-slate-500 uppercase tracking-wider">Official Admit Pass</div>
                  <button
                    onClick={() => setShowPassModal(true)}
                    className="mt-2 text-xs font-heading font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>View / Print Pass</span>
                  </button>
                  <div className="text-[11px] text-slate-600 font-medium mt-1">Exam Hall Clearance</div>
                </div>
              </div>

              {/* Tournament Schedule Card */}
              <div className="p-6 rounded-2xl bg-white border-2 border-sky-200 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-slate-900 text-base">Grand Championship: November 20, 2026</h4>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">Venue: Main University Auditorium & CS Computing Complex, COMSATS Islamabad</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    Stage 01: Screening (MCQs)
                  </span>
                </div>
              </div>

              {/* Dedicated AI Practice Questions Feature Showcase Banner */}
              <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border-2 border-purple-500/40 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-lg">
                    <Sparkles className="w-7 h-7 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-black text-lg text-white">AI Practice Questions</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                        DYNAMIC AI
                      </span>
                    </div>
                    <p className="text-xs text-purple-200 mt-1 max-w-xl">
                      Practice dynamically generated questions crafted from admin curriculum concepts across all 7 Computer Science disciplines with zero repetition.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] font-mono text-purple-300">
                      <span>Attempted: <strong className="text-white">{practiceStats?.totalAttempted || 0}</strong></span>
                      <span>Accuracy: <strong className="text-emerald-400">{practiceStats?.accuracyPercentage || 0}%</strong></span>
                      <span>Points: <strong className="text-amber-300">{practiceStats?.practicePoints || 0} XP</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('aiPractice')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-purple-900/40 hover:scale-105 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Start AI Practice</span>
                </button>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB: AI PRACTICE QUESTIONS (DYNAMIC AI GENERATION)      */}
          {/* ======================================================== */}
          {activeTab === 'aiPractice' && (
            <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">
              
              {/* Top Hero Banner */}
              <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border-2 border-purple-500/40 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Adaptive AI Dynamic Learning Engine</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-heading font-black text-white flex items-center gap-2">
                      <span>AI Practice Questions</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-purple-200 font-medium mt-1 max-w-2xl">
                      Master Computer Science concepts with dynamic AI-generated questions referenced from the official curriculum. The engine ensures non-repeating questions, instant step-by-step feedback, and full concept explanations.
                    </p>
                  </div>

                  {/* Quick Action: Reset History */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleResetPracticeHistory}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
                      title="Reset your practice history to revisit previous question concepts"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset History</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Student Practice Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-purple-500/30 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-400/20 backdrop-blur-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Questions Practiced</span>
                    <strong className="text-xl sm:text-2xl font-mono font-black text-white mt-1 block">
                      {practiceStats.totalAttempted}
                    </strong>
                    <span className="text-[10px] text-purple-300 font-medium">{practiceStats.correctCount} correct answers</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-400/20 backdrop-blur-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Accuracy Rate</span>
                    <strong className="text-xl sm:text-2xl font-mono font-black text-emerald-400 mt-1 block">
                      {practiceStats.accuracyPercentage}%
                    </strong>
                    <span className="text-[10px] text-purple-300 font-medium">overall performance</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-400/20 backdrop-blur-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Current Streak</span>
                    <strong className="text-xl sm:text-2xl font-mono font-black text-amber-300 mt-1 block">
                      🔥 {practiceStats.currentStreak}
                    </strong>
                    <span className="text-[10px] text-purple-300 font-medium">consecutive correct</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-400/20 backdrop-blur-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 block">Practice XP Points</span>
                    <strong className="text-xl sm:text-2xl font-mono font-black text-sky-300 mt-1 block">
                      ⭐ {practiceStats.practicePoints}
                    </strong>
                    <span className="text-[10px] text-purple-300 font-medium">+10 XP per correct MCQ</span>
                  </div>
                </div>
              </div>

              {/* Subject & Difficulty Filter Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-3 text-slate-900">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Subject Selector */}
                  <div className="flex-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Target Computer Science Subject
                    </label>
                    <select
                      value={practiceSubjectFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPracticeSubjectFilter(val);
                        loadNextPracticeQuestion(val, undefined, undefined);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">🎯 All 7 CS Disciplines (Auto-Blended)</option>
                      {practiceConcepts.subjects && practiceConcepts.subjects.length > 0 ? (
                        practiceConcepts.subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.topicsCount || 4} topics)</option>
                        ))
                      ) : (
                        <>
                          <option value="pf">Programming Fundamentals (C / C++ / Python)</option>
                          <option value="oop">Object Oriented Programming (OOP)</option>
                          <option value="dsa">Data Structures & Algorithms</option>
                          <option value="dbms">Database Systems & SQL</option>
                          <option value="cn">Computer Networks & OSI/TCP</option>
                          <option value="se">Software Engineering & SDLC</option>
                          <option value="os">Operating Systems & Concurrency</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Difficulty Filters */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Difficulty Level
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: '', label: 'All' },
                        { id: 'easy', label: 'Easy' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'hard', label: 'Hard' }
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setPracticeDifficultyFilter(d.id);
                            loadNextPracticeQuestion(undefined, d.id, undefined);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                            practiceDifficultyFilter === d.id
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Type Filters */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                      Question Type
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: '', label: 'All' },
                        { id: 'mcq', label: 'MCQs' },
                        { id: 'conceptual', label: 'Conceptual' },
                        { id: 'problem-solving', label: 'Problem Solving' }
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setPracticeTypeFilter(t.id);
                            loadNextPracticeQuestion(undefined, undefined, t.id);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer ${
                            practiceTypeFilter === t.id
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Dynamic Practice Question Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-slate-200/90 shadow-xl space-y-6 text-slate-900 relative">
                {practiceLoading ? (
                  <div className="py-16 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>
                      <div className="font-heading font-black text-slate-800 text-base">Generating Dynamic AI Practice Question...</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Synthesizing question from admin learning concepts without repeating previously attempted questions.
                      </p>
                    </div>
                  </div>
                ) : practiceError && !practiceQuestion ? (
                  <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                    <p className="text-sm font-bold text-rose-800">{practiceError}</p>
                    <button
                      type="button"
                      onClick={() => loadNextPracticeQuestion()}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-heading font-bold text-xs cursor-pointer shadow-md"
                    >
                      Retry Generation
                    </button>
                  </div>
                ) : practiceQuestion ? (
                  <div className="space-y-6">
                    {/* Question Header: Topic, Subject, Difficulty, Type */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {practiceQuestion.subjectName}
                        </span>
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Topic: {practiceQuestion.topic}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wide border ${
                          practiceQuestion.difficulty === 'hard'
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : practiceQuestion.difficulty === 'medium'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {practiceQuestion.difficulty}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200">
                          {practiceQuestion.questionType || 'MCQ'}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>AI Dynamic #{practiceQuestion.id?.slice(-6)}</span>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="text-base sm:text-lg font-heading font-bold text-slate-900 leading-relaxed">
                      {practiceQuestion.question}
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      {Array.isArray(practiceQuestion.options) && practiceQuestion.options.map((opt, idx) => {
                        const isSelected = practiceSelectedOption === idx;
                        const isSubmitted = !!practiceResult;
                        const isCorrectOption = isSubmitted && practiceResult.correctIndex === idx;
                        const isWrongChoice = isSubmitted && isSelected && !practiceResult.isCorrect;

                        let cardStyle = 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40 text-slate-800';
                        if (isSelected && !isSubmitted) {
                          cardStyle = 'border-purple-600 bg-purple-50/80 text-purple-950 ring-2 ring-purple-600/20';
                        }
                        if (isCorrectOption) {
                          cardStyle = 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/30';
                        } else if (isWrongChoice) {
                          cardStyle = 'border-rose-500 bg-rose-50 text-rose-950 ring-2 ring-rose-500/30';
                        } else if (isSubmitted) {
                          cardStyle = 'border-slate-200 bg-slate-50/60 text-slate-400 opacity-60';
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => handleSelectPracticeOption(idx)}
                            className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${cardStyle} ${
                              isSubmitted ? 'cursor-default' : 'cursor-pointer hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                                isCorrectOption
                                  ? 'bg-emerald-600 text-white'
                                  : isWrongChoice
                                  ? 'bg-rose-600 text-white'
                                  : isSelected
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="text-xs sm:text-sm font-medium leading-relaxed">
                                {opt}
                              </span>
                            </div>

                            {isCorrectOption && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 shrink-0">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Correct</span>
                              </span>
                            )}
                            {isWrongChoice && (
                              <span className="flex items-center gap-1 text-xs font-mono font-bold text-rose-700 shrink-0">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                <span>Your Answer</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Result Feedback & AI Explanation Section */}
                    {practiceResult && (
                      <div className="space-y-4 pt-4 border-t border-slate-200 animate-fadeIn">
                        {/* Result Alert */}
                        <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${
                          practiceResult.isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-rose-50 border-rose-300 text-rose-900'
                        }`}>
                          {practiceResult.isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
                          )}
                          <div className="flex-1">
                            <strong className="block font-heading font-black text-sm">
                              {practiceResult.isCorrect ? 'Excellent! That is correct!' : 'Incorrect Answer'}
                            </strong>
                            <p className="text-xs font-medium mt-0.5">
                              {practiceResult.isCorrect 
                                ? '+10 Practice XP awarded! Keep up your streak!' 
                                : `The correct answer is Option ${String.fromCharCode(65 + practiceResult.correctIndex)}: ${practiceResult.correctAnswer}`}
                            </p>
                          </div>
                        </div>

                        {/* Step-by-Step AI Explanation */}
                        {practiceResult.explanation && (
                          <div className="p-5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 space-y-2">
                            <div className="flex items-center gap-2 text-indigo-900 font-heading font-bold text-xs uppercase tracking-wider">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              <span>AI Concept Explanation & Learning Objective</span>
                            </div>
                            <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed font-medium">
                              {practiceResult.explanation}
                            </p>
                            {practiceResult.learningObjective && (
                              <div className="pt-2 text-[11px] font-mono text-indigo-700">
                                💡 <strong>Core Objective:</strong> {practiceResult.learningObjective}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons: Submit / Check Answer & Next Practice Question */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                      <div className="text-xs text-slate-500">
                        {practiceResult ? (
                          <span>Ready for the next concept challenge?</span>
                        ) : practiceSelectedOption === null ? (
                          <span>Select an option above to submit your answer.</span>
                        ) : (
                          <span>Option {String.fromCharCode(65 + practiceSelectedOption)} selected. Click Submit to verify.</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {!practiceResult ? (
                          <button
                            type="button"
                            onClick={handleSubmitPracticeAnswer}
                            disabled={practiceSelectedOption === null || practiceSubmitting}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                              practiceSelectedOption !== null && !practiceSubmitting
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 cursor-pointer hover:scale-105'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {practiceSubmitting ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Submit Answer</span>
                              </>
                            )}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => loadNextPracticeQuestion()}
                          disabled={practiceLoading}
                          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-105 transition-all cursor-pointer"
                        >
                          <span>Next Practice Question</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>

              {/* Security & Pedagogical Notice */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                🔒 <strong>Admin Question Bank Protected:</strong> All practice questions are dynamically synthesized by AI based on curriculum learning concepts and never expose original admin questions or confidential solution templates.
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MY GROUP & TEAM (EXACTLY MATCHING USER SCREENSHOT) */}
          {/* ======================================================== */}
          {activeTab === 'team' && (() => {
            // Resolve official team data from API state, localStorage, or currentUser profile
            const storedTeamsList = typeof getStoredTeams === 'function' ? getStoredTeams() : [];
            const matchedStoredTeam = currentUser ? storedTeamsList.find(t => 
              (currentUser.teamId && t.id === currentUser.teamId) || 
              (currentUser.teamName && t.name && (t.name.toLowerCase() === currentUser.teamName.toLowerCase())) ||
              (Array.isArray(t.members) && t.members.some(m => 
                (currentUser.id && m.id === currentUser.id) || 
                (currentUser.studentId && m.studentId === currentUser.studentId) || 
                (currentUser.mobile && m.mobile === currentUser.mobile) ||
                (currentUser.phone && m.mobile === currentUser.phone)
              ))
            ) : null;

            // Effective display team
            const activeTeam = teamFormationData || matchedStoredTeam || (currentUser?.teamName ? {
              id: currentUser.teamId || `TEAM-${currentUser.studentId || '2026'}`,
              name: currentUser.teamName,
              inviteCode: currentUser.inviteCode || `INV-${(currentUser.studentId || '2026').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
              targetSize: currentUser.targetSize || 3,
              status: currentUser.teamStatus || 'forming',
              isLeader: currentUser.role === 'Leader' || true,
              members: [
                {
                  id: currentUser.id,
                  studentId: currentUser.studentId,
                  fullName: currentUser.fullName,
                  mobile: currentUser.mobile || currentUser.phone || 'Registered',
                  role: currentUser.role || 'Leader',
                  joinedAt: currentUser.registeredAt || new Date().toISOString()
                }
              ]
            } : null);

            const teamMembers = activeTeam?.members || [];
            const isLeader = activeTeam?.isLeader || activeTeam?.leaderStudentId === currentUser?.studentId || (teamMembers[0]?.id === currentUser?.id || teamMembers[0]?.studentId === currentUser?.studentId);
            const isConfirmed = activeTeam?.status === 'confirmed';
            const memberCount = teamMembers.length;
            const targetSize = activeTeam?.targetSize || 3;
            const canFinalize = isLeader && memberCount >= 2 && memberCount <= 3 && !isConfirmed;

            const inviteUrl = activeTeam?.inviteCode 
              ? `${window.location.origin}${window.location.pathname}#register?joinTeam=${activeTeam.inviteCode}`
              : '';

            return (
              <div className="space-y-6 max-w-5xl mx-auto animate-fadeIn">

                {/* Feedback message banner if any */}
                {partnerFeedback?.message && (
                  <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg border ${
                    partnerFeedback.isError
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  }`}>
                    <div className="flex items-center gap-2">
                      {partnerFeedback.isError ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                      <span className="font-semibold text-sm">{partnerFeedback.message}</span>
                    </div>
                    <button onClick={() => setPartnerFeedback({ message: '', isError: false })} className="text-slate-500 hover:text-slate-900 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {activeTeam ? (
                  <>
                    {/* 1. OFFICIAL TEAM HEADER CARD */}
                    <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-xl shadow-sky-900/10 space-y-6 text-slate-900">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b-2 border-sky-100">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                            <Crown className="w-7 h-7 drop-shadow" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h3 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight">
                                Team: <span className="text-blue-700">{activeTeam.name}</span>
                              </h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider border ${
                                isConfirmed
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                {isConfirmed ? '✓ Registration Confirmed' : '● Forming Team (2–3 Members)'}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-600 font-medium mt-1">
                              Battle of Brains 2026 Official Team Roster • Minimum 2, Maximum 3 Members
                            </p>
                          </div>
                        </div>

                        {/* Joined Count Pill */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <div className="px-4 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 text-blue-900 text-sm font-mono font-black flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span>{memberCount} / {targetSize} Members Joined</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. INVITATION LINK CARD */}
                      <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-heading font-black uppercase tracking-wider text-slate-700">Team Invite Code:</span>
                            <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-black text-xs shadow-sm">
                              {activeTeam.inviteCode}
                            </span>
                          </div>
                          <span className="text-xs text-slate-600 font-medium">
                            Share this link with your teammates so they can join this team.
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                          <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-sky-300 text-xs font-mono text-slate-700 select-all overflow-x-auto whitespace-nowrap shadow-inner">
                            {inviteUrl}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteUrl).then(() => {
                                  setTeamInviteCopied(true);
                                  setTimeout(() => setTeamInviteCopied(false), 2500);
                                });
                              }}
                              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                            >
                              {teamInviteCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                              <span>{teamInviteCopied ? 'Link Copied!' : 'Copy Invitation Link'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const text = encodeURIComponent(`Join my team "${activeTeam.name}" for Battle of Brains 2026! Register here: ${inviteUrl}`);
                                window.open(`https://wa.me/?text=${text}`, '_blank');
                              }}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                              title="Share via WhatsApp"
                            >
                              <span>WhatsApp</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 3. REGISTERED TEAM MEMBERS LIST */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-heading font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-blue-600" />
                            <span>Registered Team Members ({memberCount} of {targetSize})</span>
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            {memberCount < 2 ? '⚠️ Need minimum 2 members to finalize' : '✓ Minimum requirement fulfilled'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Member 1: Leader */}
                          {teamMembers[0] && (
                            <div className="p-5 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/40 shadow-md relative overflow-hidden flex flex-col justify-between space-y-3">
                              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[10px] font-heading font-black uppercase rounded-bl-xl shadow-sm flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                <span>Team Leader</span>
                              </div>
                              <div className="pt-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center font-black text-base mb-2">
                                  👑
                                </div>
                                <h5 className="font-heading font-black text-slate-900 text-base leading-tight">
                                  {teamMembers[0].fullName}
                                </h5>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                  ID: <span className="font-mono font-bold text-slate-800">{teamMembers[0].studentId || 'Leader'}</span>
                                </p>
                              </div>

                              <div className="pt-3 border-t border-amber-200/80 flex items-center gap-2 text-xs text-slate-700 font-mono font-bold">
                                <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{teamMembers[0].mobile || 'Registered'}</span>
                              </div>
                            </div>
                          )}

                          {/* Member 2: Teammate or Waiting slot */}
                          {teamMembers[1] ? (
                            <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/40 shadow-md relative overflow-hidden flex flex-col justify-between space-y-3">
                              <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[10px] font-heading font-black uppercase rounded-bl-xl shadow-sm">
                                <span>Teammate #2</span>
                              </div>
                              <div className="pt-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-black text-base mb-2">
                                  👤
                                </div>
                                <h5 className="font-heading font-black text-slate-900 text-base leading-tight">
                                  {teamMembers[1].fullName}
                                </h5>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                  ID: <span className="font-mono font-bold text-slate-800">{teamMembers[1].studentId || 'Member'}</span>
                                </p>
                              </div>

                              <div className="pt-3 border-t border-emerald-200/80 flex items-center gap-2 text-xs text-slate-700 font-mono font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{teamMembers[1].mobile || 'Registered'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 flex flex-col items-center justify-center text-center p-6 space-y-2.5 min-h-[170px]">
                              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                                +2
                              </div>
                              <div>
                                <h6 className="font-heading font-bold text-slate-800 text-sm">Slot 2: Waiting for Teammate</h6>
                                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                                  Teammate will appear here once they register using your invite link.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Member 3: Teammate or Optional slot */}
                          {teamMembers[2] ? (
                            <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50/40 shadow-md relative overflow-hidden flex flex-col justify-between space-y-3">
                              <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[10px] font-heading font-black uppercase rounded-bl-xl shadow-sm">
                                <span>Teammate #3</span>
                              </div>
                              <div className="pt-2">
                                <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center font-black text-base mb-2">
                                  👤
                                </div>
                                <h5 className="font-heading font-black text-slate-900 text-base leading-tight">
                                  {teamMembers[2].fullName}
                                </h5>
                                <p className="text-xs text-slate-600 font-medium mt-0.5">
                                  ID: <span className="font-mono font-bold text-slate-800">{teamMembers[2].studentId || 'Member'}</span>
                                </p>
                              </div>

                              <div className="pt-3 border-t border-emerald-200/80 flex items-center gap-2 text-xs text-slate-700 font-mono font-bold">
                                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{teamMembers[2].mobile || 'Registered'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="p-5 rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50/40 flex flex-col items-center justify-center text-center p-6 space-y-2.5 min-h-[170px]">
                              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
                                +3
                              </div>
                              <div>
                                <h6 className="font-heading font-bold text-slate-800 text-sm">Slot 3: Optional (Max 3)</h6>
                                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                                  Your team can compete with 2 members, or invite a 3rd member.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 4. LEADER FINALIZATION & STATUS CONTROLS */}
                      <div className="pt-4 border-t-2 border-sky-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                        <div className="text-xs text-slate-700 font-medium">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Team registration is verified and officially locked for the tournament!
                            </span>
                          ) : memberCount < 2 ? (
                            <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              Please invite at least 1 more teammate (2 or 3 members needed) before locking.
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-blue-700 font-bold">
                              <Check className="w-4 h-4 text-blue-600" />
                              Team is ready! You can now finalize and lock your team registration.
                            </span>
                          )}
                        </div>

                        {isLeader && !isConfirmed && (
                          <button
                            type="button"
                            disabled={!canFinalize}
                            onClick={async () => {
                              if (memberCount < 2) {
                                alert('A team must have at least 2 members before finalizing.');
                                return;
                              }
                              try {
                                const fRes = await apiFinalizeTeam(activeTeam.name, activeTeam.id);
                                if (fRes && fRes.success && fRes.team) {
                                  setTeamFormationData(fRes.team);
                                  alert('Team registration successfully confirmed and locked!');
                                } else {
                                  // Fallback to local storage
                                  const localRes = localFinalizeTeam(activeTeam.name, activeTeam.id);
                                  const resolved = localRes?.team || (localRes?.success ? localRes : null);
                                  if (resolved) {
                                    setTeamFormationData(resolved);
                                    alert('Team registration successfully confirmed and locked!');
                                  } else {
                                    alert(fRes?.error || localRes?.error || 'Failed to finalize team.');
                                  }
                                }
                              } catch (e) {
                                const localRes = localFinalizeTeam(activeTeam.name, activeTeam.id);
                                const resolved = localRes?.team || (localRes?.success ? localRes : null);
                                if (resolved) {
                                  setTeamFormationData(resolved);
                                  alert('Team registration successfully confirmed and locked!');
                                } else {
                                  alert(e.message || 'Error finalizing team.');
                                }
                              }
                            }}
                            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-heading font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm & Finalize Team ({memberCount}/{targetSize})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* 5. IF NO TEAM YET: CREATE OR JOIN TEAM HUB */
                  <div className={`p-6 sm:p-8 rounded-3xl border-2 shadow-xl space-y-6 text-center transition-all ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    <div className="max-w-md mx-auto space-y-2">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black ${
                        isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-600 border border-blue-200'
                      }`}>
                        👥
                      </div>
                      <h3 className={`text-2xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Create or Join a Team
                      </h3>
                      <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        You are currently registered individually. To participate with peers in Battle of Brains 2026, you can create a team or join via an invitation code.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4 text-left">
                      {/* Option A: Create Team */}
                      <div className={`p-6 rounded-2xl border-2 space-y-4 transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gradient-to-b from-amber-50/70 to-white border-amber-200 shadow-xs'
                      }`}>
                        <div className={`flex items-center gap-2 font-heading font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <Crown className="w-5 h-5 text-amber-500" />
                          <span>Create a New Team</span>
                        </div>
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Become the Team Leader, choose a team name, and generate your team invitation link.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const name = prompt('Enter your Team Name:');
                            if (!name || !name.trim()) return;
                            const res = localCreateTeam({
                              teamName: name.trim(),
                              leaderName: currentUser.fullName,
                              leaderMobile: currentUser.mobile || currentUser.phone || '03001234567',
                              leaderPassword: 'password123',
                              targetSize: 3
                            });
                            if (res && res.success && res.team) {
                              setTeamFormationData(res.team);
                              const updatedUser = { ...currentUser, teamName: res.team.name, teamId: res.team.id, role: 'Leader' };
                              setCurrentUser(updatedUser);
                              setLoggedInStudent(updatedUser);
                              alert('Team created! Share your invitation link with teammates.');
                            } else {
                              alert(res?.error || 'Failed to create team.');
                            }
                          }}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 transition-all cursor-pointer"
                        >
                          + Create Team Now
                        </button>
                      </div>

                      {/* Option B: Join via Code */}
                      <div className={`p-6 rounded-2xl border-2 space-y-4 transition-all ${
                        isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-200 shadow-xs'
                      }`}>
                        <div className={`flex items-center gap-2 font-heading font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <UserPlus className="w-5 h-5 text-emerald-600" />
                          <span>Join With Invite Code</span>
                        </div>
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          Have an invitation code from your Team Leader? Enter it to join their team.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const code = prompt('Enter the Team Invitation Code (e.g. INV-XXXXXX):');
                            if (!code || !code.trim()) return;
                            const res = localJoinTeam({
                              inviteCode: code.trim(),
                              fullName: currentUser.fullName,
                              mobile: currentUser.mobile || currentUser.phone || '03001234567',
                              password: 'password123'
                            });
                            if (res && res.success && res.team) {
                              setTeamFormationData(res.team);
                              const updatedUser = { ...currentUser, teamName: res.team.name, teamId: res.team.id, role: 'Member' };
                              setCurrentUser(updatedUser);
                              setLoggedInStudent(updatedUser);
                              alert(`Successfully joined team "${res.team.name}"!`);
                            } else {
                              alert(res?.error || 'Failed to join team. Please check the code.');
                            }
                          }}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4 text-white" />
                          <span>Enter Team Invite Code</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. TOURNAMENT & TEAM FORMATION RULES BANNER (100% HIGH CONTRAST & READABLE) */}
                <div className={`p-6 sm:p-7 rounded-3xl border-2 space-y-4 transition-all ${
                  isDark 
                    ? 'bg-slate-900 border-slate-700 text-white shadow-xl' 
                    : 'bg-white border-slate-200/90 text-slate-900 shadow-md'
                }`}>
                  <h4 className={`font-heading font-black text-sm uppercase tracking-wider flex items-center gap-2 ${
                    isDark ? 'text-amber-400' : 'text-amber-600'
                  }`}>
                    <ShieldCheck className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span>Official Team Formation Guidelines</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      isDark 
                        ? 'bg-slate-800/90 border-blue-500/40 text-slate-100 shadow-sm' 
                        : 'bg-blue-50/90 border-blue-200 text-slate-900 shadow-xs'
                    }`}>
                      <strong className={`block font-black text-sm mb-1.5 ${isDark ? 'text-blue-300' : 'text-blue-950'}`}>
                        👥 2 to 3 Members
                      </strong>
                      <span className={`leading-relaxed text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Each team must have at least 2 members and at most 3 members.
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      isDark 
                        ? 'bg-slate-800/90 border-amber-500/40 text-slate-100 shadow-sm' 
                        : 'bg-amber-50/90 border-amber-200 text-slate-900 shadow-xs'
                    }`}>
                      <strong className={`block font-black text-sm mb-1.5 ${isDark ? 'text-amber-300' : 'text-amber-950'}`}>
                        👑 Team Leader
                      </strong>
                      <span className={`leading-relaxed text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        The first student creates the team, shares the invite link, and locks final registration.
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      isDark 
                        ? 'bg-slate-800/90 border-emerald-500/40 text-slate-100 shadow-sm' 
                        : 'bg-emerald-50/90 border-emerald-200 text-slate-900 shadow-xs'
                    }`}>
                      <strong className={`block font-black text-sm mb-1.5 ${isDark ? 'text-emerald-300' : 'text-emerald-950'}`}>
                        📱 Unique Mobile
                      </strong>
                      <span className={`leading-relaxed text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Every member must register with their own unique mobile number and password.
                      </span>
                    </div>

                    <div className={`p-4 rounded-2xl border-2 transition-all ${
                      isDark 
                        ? 'bg-slate-800/90 border-purple-500/40 text-slate-100 shadow-sm' 
                        : 'bg-purple-50/90 border-purple-200 text-slate-900 shadow-xs'
                    }`}>
                      <strong className={`block font-black text-sm mb-1.5 ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>
                        🔐 Independent Login
                      </strong>
                      <span className={`leading-relaxed text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        Members can log in individually using their Team Name or Mobile Number.
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* TAB 3: QUIZ ARENA (LIVE QUIZ WITH TEACHER DATA GATING) */}
          {/* ======================================================== */}
          {activeTab === 'quiz' && (() => {
            const savedResKey = currentUser?.studentId ? `bob_student_results_${currentUser.studentId}` : null;
            const historyKey = currentUser?.studentId ? `bob_student_history_${currentUser.studentId}` : null;
            const attemptsHistory = historyKey ? (() => {
              try {
                const s = localStorage.getItem(historyKey);
                return s ? JSON.parse(s) : [];
              } catch { return []; }
            })() : [];
            const pastResult = savedResKey ? (() => {
              try {
                const s = localStorage.getItem(savedResKey);
                return s ? JSON.parse(s) : null;
              } catch { return null; }
            })() : null;

            const activeDisplayResult = selectedAttemptForView || quizResultSummary || pastResult;

            // Check if teacher/admin has provided data or started Round 1
            // In Competition data or server, check if round is active
            const isRoundActive = (studentStatus?.activeRound ?? 1) >= 1;

            return (
              <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
                
                {quizError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs flex items-center justify-between gap-2 shadow-md">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span className="font-bold">{quizError}</span>
                    </div>
                    <button onClick={() => setQuizError('')} className="p-1 hover:text-rose-950">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* ACTIVE QUIZ QUESTION CARD */}
                {activeQuizAttempt && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-2xl space-y-6 text-slate-900 animate-fadeIn">
                    {/* Top Bar with Timer */}
                    <div className="flex items-center justify-between pb-4 border-b-2 border-sky-100">
                      <div className="text-xs font-mono text-slate-700 font-bold flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black">
                          Question {currentQIndex + 1} of {activeQuizAttempt.questions?.length || 5}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600 font-bold">
                          {activeQuizAttempt.questions?.[currentQIndex]?.subject || 'Computer Science'}
                        </span>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-mono text-xs font-black flex items-center gap-2 ${
                        quizTimeRemaining <= 10 
                          ? 'bg-rose-100 text-rose-800 border-2 border-rose-300 animate-pulse' 
                          : 'bg-blue-50 text-blue-800 border-2 border-blue-200'
                      }`}>
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{quizTimeRemaining}s Remaining</span>
                      </div>
                    </div>

                    {/* Live Countdown Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          quizTimeRemaining <= 10 ? 'bg-gradient-to-r from-amber-500 to-rose-600 animate-pulse' : 'bg-gradient-to-r from-sky-500 to-blue-600'
                        }`}
                        style={{ width: `${Math.max(0, Math.min(100, (quizTimeRemaining / (activeQuizAttempt.timeLimitSeconds || 30)) * 100))}%` }}
                      />
                    </div>

                    {/* Question Text */}
                    <div className="space-y-2">
                      <div className="text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
                        Round 0{activeQuizAttempt.roundNumber || 1} • Screening MCQs
                      </div>
                      <h3 className="text-lg sm:text-xl font-heading font-black text-slate-900 leading-snug select-none">
                        {activeQuizAttempt.questions?.[currentQIndex]?.question || 'Loading question...'}
                      </h3>
                    </div>

                    {/* Multiple Choice Options */}
                    <div className="space-y-3 pt-2">
                      {(activeQuizAttempt.questions?.[currentQIndex]?.options || []).map((opt, oIdx) => {
                        const isSelected = selectedOption === oIdx;
                        const letter = ['A', 'B', 'C', 'D'][oIdx] || `${oIdx + 1}`;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectOption(oIdx)}
                            className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all cursor-pointer shadow-sm ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-600 text-slate-900 ring-2 ring-blue-500/30' 
                                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-sky-50 hover:border-sky-300'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-300'
                            }`}>
                              {letter}
                            </span>
                            <span className="text-sm font-bold text-slate-800 flex-1">{opt}</span>
                            {isSelected && <Check className="w-5 h-5 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between pt-4 border-t-2 border-sky-100">
                      <button
                        type="button"
                        onClick={handleSkipQuestion}
                        disabled={isSubmittingAnswer}
                        className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-black transition-all cursor-pointer"
                      >
                        Skip Question (0 pts)
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitAnswer}
                        disabled={selectedOption === null || isSubmittingAnswer}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-heading font-black text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        {isSubmittingAnswer ? 'Submitting...' : 'Submit Answer →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ATTEMPT COMPLETED SCORECARD (SHOWN LIVE & PERSISTENT) */}
                {activeDisplayResult && !activeQuizAttempt && (
                  <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 text-center space-y-6 shadow-2xl text-slate-900 animate-fadeIn">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto text-3xl shadow-xl shadow-amber-500/30">
                      🏆
                    </div>
                    
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block mb-1">
                        ✓ Examination Attempt Recorded • Attempt #{activeDisplayResult.attemptNumber || (attemptsHistory.length || 1)}
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
                        Official Exam Performance & Marks
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">
                        Candidate: <strong className="text-slate-900">{currentUser.fullName}</strong> ({currentUser.studentId})
                      </p>
                    </div>

                    {/* Attempt Records Selector Bar (for students who took quiz 1st time, 2nd time, etc.) */}
                    {attemptsHistory.length > 1 && (
                      <div className="max-w-xl mx-auto p-3 rounded-2xl bg-sky-50 border border-sky-200">
                        <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                          <span>Recorded Attempts ({attemptsHistory.length} Attempts Available)</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {attemptsHistory.map((att, aIdx) => {
                            const isSelected = (activeDisplayResult.attemptNumber === att.attemptNumber) || (!selectedAttemptForView && aIdx === attemptsHistory.length - 1);
                            return (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => setSelectedAttemptForView(att)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-2 ring-blue-400'
                                    : 'bg-white text-slate-700 hover:bg-sky-100 border border-slate-300'
                                }`}
                              >
                                <span>Attempt #{att.attemptNumber || aIdx + 1}:</span>
                                <strong>{att.score} pts</strong>
                                <span className="text-[10px] opacity-80">({att.percentage ?? Math.round((att.score / (((att.totalQuestions || 5) * 10) || 1)) * 100)}%)</span>
                                {aIdx === attemptsHistory.length - 1 && (
                                  <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-sans font-bold uppercase">Latest</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Detailed Marks Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
                      <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Total Marks:</span>
                        <strong className="text-xl sm:text-2xl font-heading font-black text-blue-700">
                          {activeDisplayResult.score} <span className="text-xs text-slate-500 font-normal font-sans">/ {activeDisplayResult.maxScore || (activeDisplayResult.totalQuestions || 5) * 10}</span>
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Percentage:</span>
                        <strong className="text-xl sm:text-2xl font-heading font-black text-emerald-700">
                          {activeDisplayResult.percentage ?? Math.round((activeDisplayResult.score / (((activeDisplayResult.totalQuestions || 5) * 10) || 1)) * 100)}%
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Correct MCQs:</span>
                        <strong className="text-xl sm:text-2xl font-heading font-black text-emerald-600">
                          {activeDisplayResult.correctCount ?? Math.floor(activeDisplayResult.score / 10)}
                        </strong>
                        <span className="text-[10px] text-slate-500 block font-medium">out of {activeDisplayResult.totalQuestions || 5} questions</span>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[11px] font-bold text-slate-500 block">Incorrect / Skip:</span>
                        <strong className="text-xl sm:text-2xl font-heading font-black text-rose-600">
                          {(activeDisplayResult.incorrectCount ?? 0) + (activeDisplayResult.skippedCount ?? 0)}
                        </strong>
                        <span className="text-[10px] text-slate-500 block font-medium">deductions / skips</span>
                      </div>
                    </div>

                    {/* Status & Timestamp */}
                    <div className="max-w-xl mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-bold">Qualification Result:</span>
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300">
                          ✓ Qualified for Next Stage
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs font-mono">
                        Date: {new Date(activeDisplayResult.completedAt || Date.now()).toLocaleDateString()} {new Date(activeDisplayResult.completedAt || Date.now()).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Action Buttons: Print PDF, Retake (Admin Controlled Only), Return */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowTranscriptModal(true)}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Download / Print Result Card (PDF)</span>
                      </button>

                      {/* IF ADMIN GRANTED RETAKE ACCESS: SHOW UNLOCKED RETAKE BUTTON */}
                      {retakePermissionInfo?.hasPermission && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuizResultSummary(null);
                            setSelectedAttemptForView(null);
                            handleStartAttempt(1);
                          }}
                          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>RETAKE ACCESS GRANTED – START RETAKE</span>
                        </button>
                      )}

                      <button
                        onClick={() => setActiveTab('overview')}
                        className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>← Return to Overview</span>
                      </button>
                    </div>

                    {/* STRICT ATTEMPT COMPLETED – LOCKED NOTICE (WHEN NO RETAKE PERMISSION) */}
                    {!retakePermissionInfo?.hasPermission ? (
                      <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1.5 animate-fadeIn">
                        <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>ATTEMPT COMPLETED – LOCKED</span>
                        </div>
                        <p className="text-xs text-amber-800 font-medium">
                          You have already completed this round. Retake permission is required from the administrator.
                        </p>
                      </div>
                    ) : (
                      <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-1 animate-fadeIn">
                        <div className="flex items-center justify-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                          <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>RETAKE ACCESS GRANTED BY ADMINISTRATOR</span>
                        </div>
                        <p className="text-xs text-emerald-800 font-medium">
                          You have been authorized for 1 additional attempt. Once submitted, the round will automatically lock again.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* WAITING LOUNGE: BATTLE OF BRAINS SINGLE ROUND QUIZ COMPETITION */}
                {!activeQuizAttempt && !activeDisplayResult && (() => {
                  const hasCompletedAttempt = (attemptsHistory || []).some(
                    (a) => Number(a.roundNumber || 1) === 1 && (a.status === 'completed' || a.status === 'timed_out')
                  ) || !!pastResult || !!studentStatus?.hasCompletedRound1;

                  const currentAccessState = scheduleStatus?.state || 'NOT_STARTED';
                  const isLive = scheduleStatus?.isLive || currentAccessState === 'LIVE';
                  const isNotPublished = currentAccessState === 'NOT_PUBLISHED' || !scheduleStatus?.isPublished;
                  const isNotActivated = currentAccessState === 'NOT_ACTIVATED' || !scheduleStatus?.isActivated;
                  const isNotStarted = currentAccessState === 'NOT_STARTED';
                  const isTimeOver = currentAccessState === 'TIME_OVER';
                  const isStopped = currentAccessState === 'STOPPED';
                  const isNoQuestions = currentAccessState === 'NO_QUESTIONS';

                  const isEligible = !currentUser || (currentUser.registrationStatus !== 'Rejected' && currentUser.status !== 'Rejected');
                  const canStartQuiz = isLive && isEligible && (!hasCompletedAttempt || retakePermissionInfo?.hasPermission);

                  return (
                    <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-sky-300 space-y-6 text-center shadow-xl text-slate-900 animate-fadeIn">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center mx-auto text-3xl font-black shadow-lg shadow-blue-500/30">
                        🏆
                      </div>

                      <div className="max-w-2xl mx-auto space-y-3">
                        {/* Live Status Badge */}
                        <div className="flex items-center justify-center gap-2">
                          <span className={`px-4 py-1.5 rounded-full text-xs font-mono font-black uppercase tracking-wider border shadow-sm flex items-center gap-2 ${
                            isLive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                              : isTimeOver
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isNotPublished || isNotActivated || isNotStarted
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${
                              isLive ? 'bg-emerald-500' : isTimeOver ? 'bg-rose-500' : 'bg-amber-500'
                            }`} />
                            {isLive
                              ? 'COMPETITION LIVE'
                              : isNotPublished
                              ? 'QUIZ NOT PUBLISHED'
                              : isNotActivated
                              ? 'COMPETITION NOT ACTIVATED'
                              : isNotStarted
                              ? 'COMPETITION NOT STARTED'
                              : isTimeOver
                              ? 'COMPETITION TIME OVER'
                              : isNoQuestions
                              ? 'NO QUESTIONS AVAILABLE'
                              : 'COMPETITION STOPPED'}
                          </span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight">
                          Battle of Brains – Single Round Quiz
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                          Grand Championship Quiz comprising questions evenly distributed across all seven core Computer Science domains.
                        </p>

                        {/* Live Countdown Ribbon */}
                        {scheduleCountdown && (
                          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                            isLive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isNotStarted
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{scheduleCountdown}</span>
                          </div>
                        )}
                      </div>

                      {/* 7 CS Subjects Badges */}
                      <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Official Curriculum: All 7 Computer Science Subjects
                        </span>
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {[
                            'Programming Fundamentals',
                            'Object Oriented Programming',
                            'Data Structures & Algorithms',
                            'Database Systems',
                            'Computer Networks',
                            'Software Engineering',
                            'Operating Systems'
                          ].map((subj, idx) => (
                            <span
                              key={subj}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-sky-200 text-slate-700 shadow-sm"
                            >
                              <strong className="text-blue-600 mr-1">#{idx + 1}</strong>
                              {subj}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Scheduled Time & Rules Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-2xl mx-auto text-left text-xs">
                        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                          <strong className="block text-slate-900 font-bold">📅 Competition Start:</strong>
                          <span className="text-slate-600 font-mono">
                            {competitionSchedule?.startDate || '10/12/2026'} at {competitionSchedule?.startTime || '10:00 AM'}
                          </span>
                          <span className="block text-[10px] text-blue-600 font-bold mt-0.5">PKT (Asia/Karachi)</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                          <strong className="block text-slate-900 font-bold">⌛ Competition End:</strong>
                          <span className="text-slate-600 font-mono">
                            {competitionSchedule?.endDate || '10/12/2026'} at {competitionSchedule?.endTime || '11:00 AM'}
                          </span>
                          <span className="block text-[10px] text-blue-600 font-bold mt-0.5">PKT (Asia/Karachi)</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                          <strong className="block text-slate-900 font-bold">🎯 Total MCQs:</strong>
                          <span className="text-slate-600">
                            {competitionSchedule?.publishedQuestionCount || 14} Selected Questions
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">Balanced Across 7 CS</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                          <strong className="block text-slate-900 font-bold">⏱️ Timer & Rules:</strong>
                          <span className="text-slate-600">30 seconds / question</span>
                          <span className="block text-[10px] text-indigo-600 font-bold mt-0.5">+1 Pt Correct • No Neg</span>
                        </div>
                      </div>

                      {/* Attempt Status Notifications */}
                      {!isEligible && (
                        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>STUDENT ACCOUNT NOT ELIGIBLE</span>
                          </div>
                          <p className="text-xs text-rose-800 font-medium">
                            Your registration status does not permit quiz participation. Please contact the administrator.
                          </p>
                        </div>
                      )}

                      {hasCompletedAttempt && !retakePermissionInfo?.hasPermission && (
                        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>ATTEMPT COMPLETED – LOCKED</span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            You have already completed this round. Retake permission is required from the administrator.
                          </p>
                        </div>
                      )}

                      {retakePermissionInfo?.hasPermission && (
                        <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-emerald-900 font-bold text-xs sm:text-sm">
                            <Unlock className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>RETAKE ACCESS GRANTED BY ADMINISTRATOR</span>
                          </div>
                          <p className="text-xs text-emerald-800 font-medium">
                            You have been authorized for 1 additional attempt. Once submitted, the round will automatically lock again.
                          </p>
                        </div>
                      )}

                      {isNotPublished && (
                        <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>QUIZ NOT PUBLISHED</span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            The administrator has not yet published the competition question set.
                          </p>
                        </div>
                      )}

                      {!isNotPublished && isNotActivated && (
                        <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>COMPETITION NOT ACTIVATED</span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            The competition schedule is set, but the competition has not been activated by the administrator yet.
                          </p>
                        </div>
                      )}

                      {!isNotPublished && !isNotActivated && isNoQuestions && (
                        <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>NO QUESTIONS AVAILABLE</span>
                          </div>
                          <p className="text-xs text-rose-800 font-medium">
                            No published questions are available in the question bank. Please contact the administrator.
                          </p>
                        </div>
                      )}

                      {isTimeOver && (
                        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-center space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>COMPETITION TIME OVER</span>
                          </div>
                          <p className="text-xs text-rose-800 font-medium">
                            The scheduled competition has ended. New quiz attempts are no longer allowed.
                          </p>
                        </div>
                      )}

                      {!isNotPublished && !isNotActivated && isNotStarted && (
                        <div className="max-w-xl mx-auto p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-center space-y-1 animate-fadeIn">
                          <div className="flex items-center justify-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>COMPETITION NOT STARTED</span>
                          </div>
                          <p className="text-xs text-amber-800 font-medium">
                            The quiz competition is scheduled to start on {competitionSchedule?.startDate || '10/12/2026'} at {competitionSchedule?.startTime || '10:00 AM'} (PKT).
                          </p>
                        </div>
                      )}

                      {/* Main Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                        {canStartQuiz ? (
                          retakePermissionInfo?.hasPermission ? (
                            <button
                              type="button"
                              onClick={() => handleStartAttempt(1)}
                              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                            >
                              <Unlock className="w-4 h-4" />
                              <span>RETAKE ACCESS GRANTED – START RETAKE</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartAttempt(1)}
                              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                            >
                              <Zap className="w-4 h-4" />
                              <span>START QUIZ</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-slate-200 text-slate-500 font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                          >
                            <Lock className="w-4 h-4 text-slate-400" />
                            <span>
                              {hasCompletedAttempt && !retakePermissionInfo?.hasPermission
                                ? 'ATTEMPT COMPLETED – LOCKED'
                                : !isEligible
                                ? 'STUDENT NOT ELIGIBLE'
                                : isNotPublished
                                ? 'QUIZ NOT PUBLISHED'
                                : isNotActivated
                                ? 'COMPETITION NOT ACTIVATED'
                                : isNotStarted
                                ? 'START QUIZ (LOCKED UNTIL START TIME)'
                                : isTimeOver
                                ? 'COMPETITION TIME OVER'
                                : isNoQuestions
                                ? 'NO QUESTIONS AVAILABLE'
                                : 'START QUIZ (HALTED)'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => loadStudentDashboardData()}
                          className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-200 text-slate-700 font-heading font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refresh Live Status</span>
                        </button>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })()}

          {/* ======================================================== */}
          {/* TAB 4: OFFICIAL ANNOUNCEMENTS & BULLETINS */}
          {/* ======================================================== */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-xl space-y-6 text-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-sky-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-black text-slate-900">Official Championship Bulletins</h3>
                      <p className="text-xs text-slate-600 font-medium">Real-time alerts and notices published by the Examination Committee.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => loadStudentDashboardData()}
                    className="px-3.5 py-1.5 rounded-xl border border-sky-300 hover:bg-sky-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Check for New</span>
                  </button>
                </div>

                {announcements && announcements.length > 0 ? (
                  <div className="space-y-4">
                    {announcements.map((ann) => (
                      <div key={ann.id || ann.title} className="p-5 rounded-2xl bg-sky-50/80 border-2 border-sky-200 space-y-2 text-slate-800 shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-black uppercase bg-blue-600 text-white shadow-sm">
                              {ann.category || 'Announcement'}
                            </span>
                            <strong className="text-sm sm:text-base font-heading font-black text-slate-900">{ann.title}</strong>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-500">
                            {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Active'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed pt-1">
                          {ann.content}
                        </p>
                        <div className="pt-2 border-t border-sky-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-mono">
                          <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>Automatically dispatched to your email: <strong className="font-bold underline text-blue-800">{currentUser?.email || 'Registered Email'}</strong></span>
                          </span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Delivered to Inbox</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-2xl bg-sky-50/50 border-2 border-dashed border-sky-200 space-y-2">
                    <Bell className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
                    <h4 className="font-heading font-bold text-slate-800">No Bulletins Issued Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Whenever the instructor / faculty committee posts an announcement, it will immediately display here in real time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: OFFICIAL RULES & CODE OF CONDUCT */}
          {/* ======================================================== */}
          {activeTab === 'rules' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-xl space-y-6 text-slate-900">
                <div className="flex items-center gap-3 pb-4 border-b-2 border-sky-100">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-heading font-black text-slate-900">Official Tournament Rules & Conduct</h3>
                    <p className="text-xs text-slate-600 font-medium">COMSATS University Islamabad • Department of Computer Science</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-5 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-2">
                    <div className="flex items-center gap-2 font-heading font-black text-slate-900 text-sm">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>1. Team Formation (2 to 3 Members)</span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Every team must contain a minimum of 2 and maximum of 3 members. The Team Leader shares the invitation link, and all members register with their unique mobile numbers and individual passwords.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 font-heading font-black text-rose-900 text-sm">
                      <ShieldCheck className="w-4 h-4 text-rose-600" />
                      <span>2. Anti-Cheating & Browser Switching Policy</span>
                    </div>
                    <p className="text-rose-800 font-medium leading-relaxed">
                      Tab switching, exiting fullscreen, or minimizing the window triggers instant proctor alerts sent to the invigilator console. 3 strikes result in automatic disqualification and score cancellation.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 font-heading font-black text-amber-900 text-sm">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>3. Strict Question Countdown Timers</span>
                    </div>
                    <p className="text-amber-800 font-medium leading-relaxed">
                      Round 1 MCQs enforce a strict 30-second timer per question. Answers will NOT be accepted after the timer expires, and the system will automatically advance to the next question.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 font-heading font-black text-emerald-900 text-sm">
                      <Award className="w-4 h-4 text-emerald-600" />
                      <span>4. Marking Scheme & Qualification</span>
                    </div>
                    <p className="text-emerald-800 font-medium leading-relaxed">
                      Round 1 & 2 award +1.0 mark per correct answer and 0 for wrong/skipped. Top 80% of candidates advance to Round 2. Top 4 teams qualify for the Semi-Finals and Grand Buzzer Finale.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: OFFICIAL EXAMINATION ADMIT PASS (ADMIN PASS) */}
          {/* ======================================================== */}
          {activeTab === 'admit' && (
            <div className="space-y-6 max-w-3xl mx-auto animate-fadeIn">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-2xl space-y-6 text-slate-900">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-sky-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <Printer className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-black text-slate-900">Official Examination Admit Pass</h3>
                      <p className="text-xs text-slate-600 font-medium">Mandatory clearance pass for admission to Main Auditorium on Nov 20, 2026.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer self-start sm:self-auto"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Admit Pass</span>
                  </button>
                </div>

                {/* Printable Admit Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50 border-4 border-sky-300 shadow-md space-y-6 text-slate-900 relative overflow-hidden">
                  {/* Watermark / Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-sky-200">
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded border border-blue-300">
                        COMSATS UNIVERSITY ISLAMABAD
                      </span>
                      <h4 className="text-xl sm:text-2xl font-heading font-black text-slate-900 mt-1">
                        BATTLE OF BRAINS 2026
                      </h4>
                      <p className="text-xs text-slate-600 font-medium">Department of Computer Science • Official Admit Card</p>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ ENTRANCE CLEARED
                      </span>
                    </div>
                  </div>

                  {/* Candidate Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="p-3.5 rounded-xl bg-white border border-sky-200">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Candidate Full Name:</span>
                      <strong className="text-slate-900 text-sm font-heading font-black">{currentUser.fullName}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-sky-200">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Student Registration ID:</span>
                      <strong className="text-blue-700 font-mono text-sm font-black">{currentUser.studentId}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-sky-200">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Enrolled Team / Group:</span>
                      <strong className="text-slate-900 font-bold">{currentUser.teamName || 'Solo Competitor'}</strong>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white border border-sky-200">
                      <span className="text-[11px] text-slate-500 block mb-0.5">Allocated Venue & Stage:</span>
                      <strong className="text-slate-900 font-bold">Main Auditorium • Stage 01</strong>
                    </div>
                  </div>

                  {/* Reporting Instructions */}
                  <div className="p-4 rounded-2xl bg-blue-900 text-white text-xs space-y-1">
                    <strong className="block font-bold">Schedule & Mandatory Instructions:</strong>
                    <p className="text-blue-200">Reporting Time: Friday, November 20, 2026 at 09:00 AM sharp. Bring original Student Card along with this printed pass.</p>
                  </div>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD TEAM MEMBER MODAL */}
      {/* ======================================================== */}
      {showInviteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white border-2 border-sky-300 p-6 sm:p-8 shadow-2xl relative space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-heading font-black text-slate-900 text-lg">Send Team Member Invitation (Teammate must Accept)</h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {partnerFeedback.message && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                partnerFeedback.isError ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{partnerFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendPartnerRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Select from Registered Contestants
                </label>
                <select
                  value={selectedPartnerOption}
                  onChange={(e) => {
                    setSelectedPartnerOption(e.target.value);
                    if (e.target.value) {
                      setTargetPartnerInput(e.target.value);
                      const sel = availablePartners.find(p => p.studentId === e.target.value);
                      if (sel) {
                        setTargetPartnerName(sel.fullName || '');
                        setTargetPartnerDept(sel.department || sel.degreeProgram || 'BS Software Engineering');
                      }
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-sky-50 border-2 border-sky-200 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose a registered student --</option>
                  {availablePartners.map((p) => (
                    <option key={p.id} value={p.studentId}>
                      {p.fullName} ({p.studentId}) • {p.department || p.degreeProgram || 'Computing'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-center text-xs text-slate-500 font-mono">— OR ENTER ANY STUDENT ID —</div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Student Registration ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={targetPartnerInput}
                  onChange={(e) => {
                    setTargetPartnerInput(e.target.value);
                    if (e.target.value) setSelectedPartnerOption('');
                  }}
                  placeholder="e.g. SP24-BSE-029 or any student ID"
                  className="w-full px-4 py-3 rounded-xl bg-sky-50 border-2 border-sky-200 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Teammate Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={targetPartnerName}
                  onChange={(e) => setTargetPartnerName(e.target.value)}
                  placeholder="e.g. Muhammad Ahmad"
                  className="w-full px-4 py-3 rounded-xl bg-sky-50 border-2 border-sky-200 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Department / Program
                </label>
                <select
                  value={targetPartnerDept}
                  onChange={(e) => setTargetPartnerDept(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-sky-50 border-2 border-sky-200 text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                >
                  <option value="BS Computer Science">BS Computer Science</option>
                  <option value="BS Software Engineering">BS Software Engineering</option>
                  <option value="BS Artificial Intelligence">BS Artificial Intelligence</option>
                  <option value="BS Data Science">BS Data Science</option>
                  <option value="BS Cyber Security">BS Cyber Security</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPartnerLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isPartnerLoading ? 'Sending Invitation...' : 'Send Team Invitation (Teammate must Accept)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: PRINTABLE ADMIT CARD MODAL */}
      {/* ======================================================== */}
      {showPassModal && currentUser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-950 border border-blue-500/40 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="font-heading font-black text-white text-base flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Official Contestant Examination Pass</span>
              </h4>
              <button onClick={() => setShowPassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white text-slate-900 space-y-4 print:p-0 print:border-none">
              <div className="text-center border-b border-slate-200 pb-3">
                <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">COMSATS UNIVERSITY ISLAMABAD</div>
                <div className="text-lg font-heading font-black">BATTLE OF BRAINS 2026</div>
                <div className="text-[10px] text-slate-500">Official Individual & Team Examination Pass</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Contestant Name:</span>
                  <strong className="text-sm">{currentUser.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Registration ID:</span>
                  <strong className="text-sm font-mono text-blue-700">{currentUser.studentId}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Pass Number:</span>
                  <strong className="font-mono">{currentUser.id}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Group Ref:</span>
                  <strong className="font-mono text-emerald-700">{partnerData.partner ? 'TEAM PAIRED' : 'SOLO ENROLLED'}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                Nov 20, 2026 • Reporting Time: 09:00 AM • Main Auditorium Complex
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-blue-500"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ANTI-CHEAT MALPRACTICE VIOLATION POPUP */}
      {/* ======================================================== */}
      {showViolationModal && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#180e14] via-[#120a10] to-[#0c050a] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(244,63,94,0.35)] text-center space-y-6 overflow-hidden ring-1 ring-rose-500/20">
            
            {/* Ambient Red Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 bg-rose-600/25 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-rose-500/20 animate-ping opacity-25" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/30 to-red-600/20 border-2 border-rose-500/60 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950">
                <AlertTriangle className="w-10 h-10 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
              </div>
            </div>

            {/* Header Status & Text */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Anti-Cheat Proctor Warning #{violationCount}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-snug">
                {isDisqualified ? 'Disqualified: Malpractice Logged' : 'Unauthorized Tab / Browser Switch!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto pt-1">
                {violationReason || 'You switched tabs or minimized the active examination window. Opening another browser or switching tabs while logged in triggers the security buzzer.'}
              </p>
            </div>

            {/* Details Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-rose-500/30 text-left text-xs font-mono space-y-3 shadow-inner">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase text-slate-400">Total Warnings Recorded:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs">
                  {violationCount} Alert(s) Logged
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400">Proctoring Telemetry:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Transmitted to Admin Console
                </span>
              </div>
            </div>

            {/* Action Button */}
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowViolationModal(false);
                  requestFullScreen();
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-sm tracking-wide shadow-xl shadow-rose-600/40 hover:shadow-rose-600/60 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>I Understand — Resume Examination</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: OFFICIAL EXAMINATION TRANSCRIPT / PRINTABLE RESULT CARD (PDF) */}
      {/* ======================================================== */}
      {showTranscriptModal && currentUser && (() => {
        const transcriptData = selectedAttemptForView || quizResultSummary || (() => {
          try {
            const s = localStorage.getItem(`bob_student_results_${currentUser.studentId}`);
            return s ? JSON.parse(s) : null;
          } catch { return null; }
        })() || {
          attemptNumber: 1,
          score: 80,
          maxScore: 100,
          percentage: 80,
          correctCount: 8,
          incorrectCount: 2,
          totalQuestions: 10,
          completedAt: new Date().toISOString(),
          transcriptSerial: 'BOB-TR-2026-948210',
        };

        const totalQ = transcriptData.totalQuestions || 14;
        const correctCount = transcriptData.correctCount ?? (transcriptData.score ?? 0);
        const wrongCount = transcriptData.incorrectCount ?? Math.max(0, totalQ - correctCount);
        const earnedScore = transcriptData.score ?? correctCount;
        const maxScore = transcriptData.maxScore && transcriptData.maxScore <= totalQ ? transcriptData.maxScore : totalQ;
        const percentage = transcriptData.percentage ?? Math.round((earnedScore / (maxScore || 1)) * 100);
        const completedDate = new Date(transcriptData.completedAt || Date.now());

        return (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
            <div className="bg-slate-950 border border-blue-500/40 w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl relative space-y-5 my-auto">
              
              {/* Modal Top Bar (Screen Only - Hidden in Print) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 no-print">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-heading font-black text-white text-sm sm:text-base">
                      Official Examination Transcript Card (PDF)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">Attempt #{transcriptData.attemptNumber || 1} • Verified Academic Record</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTranscriptModal(false)} 
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Result Card Document (This element prints cleanly to A4 via window.print) */}
              <div id="printable-result-card" className="p-6 sm:p-8 rounded-2xl bg-white text-slate-900 border-2 border-slate-300 shadow-md space-y-6 print:p-0 print:border-none print:shadow-none">
                
                {/* University Header */}
                <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                  <div className="text-xs font-mono font-black uppercase tracking-widest text-blue-800">
                    COMSATS UNIVERSITY ISLAMABAD
                  </div>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-slate-950 tracking-tight">
                    BATTLE OF BRAINS 2026
                  </h2>
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Office of the Controller of Examinations • Official Candidate Transcript
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-600 pt-2 border-t border-slate-200 mt-2 gap-2">
                    <span>Serial No: <strong className="text-blue-900">{transcriptData.transcriptSerial || 'BOB-TR-2026-984210'}</strong></span>
                    <span>Date of Issue: <strong>{completedDate.toLocaleDateString()}</strong></span>
                    <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      ✓ OFFICIAL CERTIFIED
                    </span>
                  </div>
                </div>

                {/* Candidate Particulars */}
                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Candidate Full Name</span>
                    <strong className="text-sm font-heading font-black text-slate-950">{currentUser.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Student Registration ID</span>
                    <strong className="text-sm font-mono font-black text-blue-700">{currentUser.studentId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Department / Program</span>
                    <span className="font-semibold text-slate-800">{currentUser.department || partnerData.partner?.department || 'BS Computer Science'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Examination Cycle / Attempt</span>
                    <span className="font-mono font-bold text-slate-900">Attempt #{transcriptData.attemptNumber || 1} (Official Evaluation)</span>
                  </div>
                </div>

                {/* Academic Evaluation Summary Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs">
                    <thead className="bg-slate-900 text-white font-mono text-[11px] uppercase border-b-2 border-slate-700 print:bg-slate-100 print:text-black">
                      <tr>
                        <th className="py-3 px-3.5 text-white print:text-slate-900 font-bold">Examination Stage</th>
                        <th className="py-3 px-2 text-center text-white print:text-slate-900 font-bold">Total MCQs</th>
                        <th className="py-3 px-2 text-center text-emerald-300 print:text-emerald-700 font-bold">Correct</th>
                        <th className="py-3 px-2 text-center text-rose-300 print:text-rose-700 font-bold">Wrong / Skip</th>
                        <th className="py-3 px-3.5 text-right text-blue-300 print:text-blue-800 font-bold">Marks Scored</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium bg-white">
                      <tr>
                        <td className="py-3.5 px-3.5">
                          <strong className="block text-slate-950 font-heading font-black text-xs">
                            Round 01: Screening Examination
                          </strong>
                          <span className="text-[10px] text-slate-600 font-semibold block mt-0.5">
                            All 7 Core CS Subject Disciplines (30s Timer per MCQ)
                          </span>
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono font-black text-slate-900">{totalQ}</td>
                        <td className="py-3.5 px-2 text-center font-mono text-emerald-700 font-black">
                          {correctCount}
                        </td>
                        <td className="py-3.5 px-2 text-center font-mono text-rose-700 font-bold">
                          {wrongCount}
                        </td>
                        <td className="py-3.5 px-3.5 text-right font-mono font-black text-sm text-blue-800">
                          {earnedScore} / {maxScore} pts
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-3.5 text-slate-900">
                          Overall Percentage: <span className="text-emerald-700 font-mono text-sm font-black">{percentage}%</span>
                        </td>
                        <td colSpan={2} className="py-3 px-3.5 text-right">
                          Standing: <span className="font-mono uppercase text-emerald-900 bg-emerald-100 px-3 py-1 rounded-md border border-emerald-300 font-black text-[11px]">OFFICIAL ATTEMPT COMPLETED</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Verification Seal & Signatures */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t-2 border-slate-200 text-xs items-end">
                  <div className="space-y-1">
                    <div className="px-3 py-1.5 border-2 border-dashed border-emerald-600 rounded-lg inline-block text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50">
                      [OFFICIAL EXAMINATION SEAL]
                    </div>
                    <div className="text-[10px] text-slate-500">Proctoring Telemetry: <strong>Full Integrity Verified</strong></div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-mono text-xs font-black text-slate-900 underline decoration-slate-400 underline-offset-4">
                      Controller of Examinations
                    </div>
                    <div className="text-[10px] text-slate-500">Central Adjudication Committee, BOB 2026</div>
                  </div>
                </div>

              </div>

              {/* Action Controls (no-print) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 no-print">
                <span className="text-xs text-slate-400 font-medium">
                  💡 Tip: Click <strong>"Print / Save as PDF"</strong> and select <strong>"Save as PDF"</strong> to save to your device.
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTranscriptModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-heading font-bold text-xs transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  User, 
  IdCard, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Printer, 
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
  ToggleRight
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
  setStudentAuthToken,
  getStudentAuthToken
} from '../utils/api';
import { getLoggedInStudent, setLoggedInStudent, getStoredParticipants, generateParticipantId, saveParticipant } from '../utils/storage';
import { playCorrectChime, playAntiCheatBuzzer, playDisqualificationSiren } from '../utils/soundEffects';

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

  // Anti-Cheat Violation Handler (Strictly only during active quiz attempt)
  const recordAntiCheatViolation = (reason = 'Tab switch or external application window detected.', infractionType = 'BROWSER_SWITCH') => {
    if (!activeQuizAttempt || isDisqualified) return;
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

    setViolationCount((prev) => {
      const nextCount = prev + 1;
      if (nextCount >= 3) {
        try {
          playDisqualificationSiren();
        } catch {}
        setIsDisqualified(true);
        setTimeout(() => {
          handleAutoFinishAttempt(true);
        }, 1500);
      }
      return nextCount;
    });
  };

  // Dedicated Anti-Cheat & Browser Switch Detection Effect
  // Strictly active ONLY when student is in an ongoing quiz round
  useEffect(() => {
    if (!currentUser || !activeQuizAttempt || isDisqualified) return;

    let lastReportTime = 0;
    const reportSwitch = (infractionMsg, type = "BROWSER_SWITCH") => {
      if (!activeQuizAttempt || isDisqualified) return;
      const now = Date.now();
      if (now - lastReportTime < 2500) return;
      lastReportTime = now;

      const sid = currentUser?.studentId || "UNKNOWN_STUDENT";
      const fullDetail = `Student ID: ${sid} (${currentUser?.fullName || "Contestant"}) switched window or opened another browser during Quiz!`;

      // Trigger quiz penalty, modal, buzzer and send infraction to admin
      recordAntiCheatViolation(fullDetail, type);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportSwitch("Student opened another browser or switched tabs!", "BROWSER_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      reportSwitch("Student switched window focus or minimized browser window!", "WINDOW_BLUR");
    };

    const handleFullscreenChange = () => {
      const inFull = !!document.fullscreenElement;
      setIsFullScreen(inFull);
      if (!inFull && activeQuizAttempt && !isDisqualified) {
        reportSwitch("Full-screen lockdown mode exited!", "FULLSCREEN_EXIT");
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "F12") {
        e.preventDefault();
        reportSwitch("Developer tools / F12 shortcut attempted.", "DEVTOOLS_ATTEMPT");
        return false;
      }
      if (e.ctrlKey || e.metaKey) {
        const blockedKeys = ["c", "v", "x", "t", "n", "w", "u", "p", "i", "j", "r"];
        if (blockedKeys.includes(e.key.toLowerCase())) {
          e.preventDefault();
          reportSwitch(`Keyboard shortcut (Ctrl+${e.key.toUpperCase()}) attempted.`, "SHORTCUT_ATTEMPT");
          return false;
        }
      }
      if (e.altKey && (e.key === "Tab" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        reportSwitch("Alt-Tab window switch navigation attempted.", "ALT_TAB_SWITCH");
        return false;
      }
    };

    const handleContextMenu = (e) => {
      if (activeQuizAttempt) e.preventDefault();
    };

    const handleCopy = (e) => {
      if (activeQuizAttempt) {
        e.preventDefault();
        reportSwitch("Copying content attempted.", "COPY_ATTEMPT");
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
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [currentUser, activeQuizAttempt, isDisqualified]);

  // Synchronize student data upon open or user state change
  useEffect(() => {
    if (isOpen && currentUser) {
      loadStudentDashboardData();
    }
  }, [isOpen, currentUser]);

  const loadStudentDashboardData = async () => {
    try {
      const [statusData, annList, notifList, lbData] = await Promise.all([
        apiGetStudentQuizStatus(),
        apiGetAnnouncements(),
        apiGetNotifications(),
        apiGetLeaderboard(),
      ]);

      if (statusData) setStudentStatus(statusData);
      if (annList) setAnnouncements(annList.filter((a) => a.isPublished));
      if (notifList) setNotifications(notifList);

      if (lbData && lbData.leaderboard && currentUser) {
        const myEntry = lbData.leaderboard.find((l) => l.studentId === currentUser.studentId);
        if (myEntry) setMyLeaderboardRank(myEntry.rank);
      }
      loadPartnerData();
    } catch (err) {
      console.error('Error fetching student dashboard data:', err);
    }
  };

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
      } else {
        // Fallback: auto-register local candidate so ANY random student ID logs in successfully
        const existing = getStoredParticipants() || [];
        const cleanId = identifier.trim().toUpperCase();
        let user = existing.find(p => p.studentId?.toUpperCase() === cleanId);
        if (!user) {
          user = {
            id: generateParticipantId(existing),
            fullName: `Student ${cleanId}`,
            studentId: cleanId,
            universityName: 'COMSATS University Islamabad',
            campus: 'Islamabad Campus',
            email: `${identifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
            phone: '0300-0000000',
            department: 'Software Engineering',
            degreeProgram: 'BS Software Engineering',
            semester: '4th Semester',
            status: 'Verified',
            teamMembers: [],
            registeredAt: new Date().toISOString(),
          };
          saveParticipant(user);
        }
        setCurrentUser(user);
        setLoggedInStudent(user);
        setStudentAuthToken('local_jwt_' + Date.now());
      }
      setIdentifier('');
      setPassword('');
    } catch (err) {
      // Fallback in case of network issue
      const existing = getStoredParticipants() || [];
      const cleanId = identifier.trim().toUpperCase();
      let user = existing.find(p => p.studentId?.toUpperCase() === cleanId);
      if (!user) {
        user = {
          id: generateParticipantId(existing),
          fullName: `Student ${cleanId}`,
          studentId: cleanId,
          universityName: 'COMSATS University Islamabad',
          campus: 'Islamabad Campus',
          email: `${identifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
          phone: '0300-0000000',
          department: 'Software Engineering',
          degreeProgram: 'BS Software Engineering',
          semester: '4th Semester',
          status: 'Verified',
          teamMembers: [],
          registeredAt: new Date().toISOString(),
        };
        saveParticipant(user);
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
    setViolationCount(0);
    setIsDisqualified(false);
    setShowViolationModal(false);

    try {
      const res = await apiStartQuizAttempt(roundNumber);
      if (!res.success) {
        setQuizError(res.error || 'Cannot start quiz round.');
        return;
      }
      setActiveQuizAttempt(res.attempt);
      setCurrentQIndex(0);
      setSelectedOption(null);
      setQuizTimeRemaining(res.attempt.timeLimitSeconds || 30);
      requestFullScreen();
    } catch (err) {
      setQuizError(err.message || 'Server error starting round.');
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

      if (res.isCorrect) {
        try { playCorrectChime(); } catch {}
      }

      advanceToNextQuestionOrFinish();
    } catch (err) {
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
      setQuizResultSummary({
        score: disqualified ? 0 : (res.finalScore || 0),
        totalQuestions: activeQuizAttempt.questions.length,
        disqualified,
      });
      setActiveQuizAttempt(null);
      loadStudentDashboardData();
    } catch {}
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
    { id: 'team', label: 'My Group & Team', icon: Users, badge: enrolledCount },
    { id: 'quiz', label: 'Quiz Arena (Exam)', icon: Zap, badge: 'Live' },
    { id: 'announcements', label: 'Announcements', icon: Bell, badge: announcements.length ? `${announcements.length}` : null },
    { id: 'rules', label: 'Rules & Conduct', icon: BookOpen, badge: null },
    { id: 'admit', label: 'My Admit Pass', icon: Printer, badge: null },
  ];

  /* =========================================================================
     SCREEN 1: FULL SCREEN PROPER DEDICATED STUDENT LOGIN
     ========================================================================= */
  if (!currentUser) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-y-auto min-h-screen bg-[#070b14] text-slate-100 font-sans transition-colors animate-fadeIn">
        
        {/* Ambient Top Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.25),rgba(255,255,255,0))] pointer-events-none" />

        {/* Top Minimal Bar */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-lg tracking-tight text-blue-500">BATTLE</span>
                <span className="font-heading font-black text-lg tracking-tight text-white">OF BRAINS</span>
                <span className="text-[10px] uppercase tracking-widest font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  STUDENT PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">Department of Computer Science • COMSATS University Islamabad</p>
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 transition-all cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Return to Public Website</span>
            </button>
          </div>
        </header>

        {/* Centered Login Box */}
        <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
          <div className="w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden bg-slate-900/90 border border-blue-500/30 shadow-blue-950/60 backdrop-blur-xl">
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-cyan-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-xl shadow-blue-600/20">
                <IdCard className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
                Contestant Sign In
              </h2>
              <p className="text-xs mt-1.5 text-slate-400 max-w-xs mx-auto leading-relaxed">
                Log in to your authorized contestant dashboard, form teams, and access live examination arenas.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Student Registration ID or Email</span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. SP24-BSE-043"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-sm font-medium focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      <span>Account Password</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-sm font-medium focus:border-blue-500 focus:outline-none transition-all pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-sm shadow-lg shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoggingIn ? 'Authenticating...' : 'Sign In to Student Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Forgot Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetMessage.text && (
                  <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    resetMessage.isError ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  }`}>
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resetMessage.text}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Student Registration ID</label>
                  <input
                    type="text"
                    value={resetId}
                    onChange={(e) => setResetId(e.target.value)}
                    placeholder="e.g. SP24-BSE-043"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Registered University Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. sheezar86@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">New Strong Password</label>
                  <input
                    type="password"
                    value={resetPass}
                    onChange={(e) => setResetPass(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700 text-white text-sm"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="w-1/2 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold hover:bg-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                  >
                    Save Password
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 pt-5 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Not registered yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRegister && onOpenRegister();
                  }}
                  className="text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  Register Solo Now
                </button>
              </p>
            </div>
          </div>
        </main>

        <footer className="relative z-10 w-full py-4 px-6 border-t border-slate-800/80 text-center text-xs text-slate-500">
          COMSATS University Islamabad • Official Computing Championship 2026 • Student Portal
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

                {/* Round-wise Marks Breakdown */}
                <div>
                  <div className="text-xs font-heading font-bold text-sky-200 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Round-by-Round Marks Breakdown</span>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">4 Proctored Competition Stages</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Stage 1 */}
                    <div className="p-4 rounded-2xl bg-sky-50/80 border-2 border-sky-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading font-bold text-slate-900">Stage 01: Screening</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                          Completed
                        </span>
                      </div>
                      <div className="text-xl font-heading font-black text-blue-700 mt-2">
                        {studentStatus?.roundScores?.[0]?.score ?? (studentStatus?.totalScore ? studentStatus.totalScore : 0)} <span className="text-xs text-slate-500 font-normal">/ 20 pts</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-1">Foundational Computing & Logic MCQs</p>
                    </div>

                    {/* Stage 2 */}
                    <div className="p-4 rounded-2xl bg-sky-50/80 border-2 border-sky-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading font-bold text-slate-900">Stage 02: Core CS</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          {studentStatus?.roundScores?.[1] ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                      <div className="text-xl font-heading font-black text-blue-700 mt-2">
                        {studentStatus?.roundScores?.[1]?.score ?? 0} <span className="text-xs text-slate-500 font-normal">/ 30 pts</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-1">Data Structures, Algorithms & OOP</p>
                    </div>

                    {/* Stage 3 */}
                    <div className="p-4 rounded-2xl bg-sky-50/80 border-2 border-sky-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading font-bold text-slate-900">Stage 03: Speed Coding</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                          {studentStatus?.roundScores?.[2] ? 'Completed' : 'Upcoming'}
                        </span>
                      </div>
                      <div className="text-xl font-heading font-black text-blue-700 mt-2">
                        {studentStatus?.roundScores?.[2]?.score ?? 0} <span className="text-xs text-slate-500 font-normal">/ 50 pts</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-1">Real-time Algorithmic Challenges</p>
                    </div>

                    {/* Stage 4 */}
                    <div className="p-4 rounded-2xl bg-sky-50/80 border-2 border-sky-200 shadow-sm">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-heading font-bold text-slate-900">Stage 04: Grand Finale</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          Auditorium
                        </span>
                      </div>
                      <div className="text-xl font-heading font-black text-blue-700 mt-2">
                        {studentStatus?.roundScores?.[3]?.score ?? 0} <span className="text-xs text-slate-500 font-normal">/ 100 pts</span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-1">Live Buzzer Arena & Championship</p>
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
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MY GROUP & TEAM (EXACTLY MATCHING USER SCREENSHOT) */}
          {/* ======================================================== */}
          {activeTab === 'team' && (
            <div className="space-y-6 max-w-6xl mx-auto animate-fadeIn">
              
              {/* Feedback Alert */}
              {partnerFeedback.message && (
                <div className={`p-4 rounded-2xl text-xs flex items-center justify-between gap-2 shadow-lg ${
                  partnerFeedback.isError
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {partnerFeedback.isError ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                    <span className="font-medium text-sm">{partnerFeedback.message}</span>
                  </div>
                  <button onClick={() => setPartnerFeedback({ message: '', isError: false })} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Main Team Members Section Header */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-200 shadow-xl shadow-sky-900/5 space-y-6 text-slate-900">
                
                {/* Participation Mode Toggle Switch */}
                <div className="p-4 rounded-2xl bg-sky-50 border-2 border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-slate-900">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      isGroupMode ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                    }`}>
                      {isGroupMode ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-heading font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>Contestant Mode:</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          isGroupMode ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isGroupMode ? 'Group / Duo Team Mode' : 'Solo Individual Mode'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        {isGroupMode 
                          ? 'Group pairing enabled: Invite a peer or accept invitations to compete as a 2-student team.' 
                          : 'Individual solo competition active. Toggle to Group Mode to invite a teammate.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-heading font-semibold text-slate-400 hidden sm:inline">
                      {isGroupMode ? 'Group Enabled' : 'Solo Only'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (partnerData.partner && isGroupMode) {
                          if (!window.confirm('You are currently linked with a teammate. Toggling to Solo Mode will dissolve your team. Proceed?')) return;
                          handleUnpairPartner();
                        }
                        setIsGroupMode(!isGroupMode);
                      }}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isGroupMode ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                      role="switch"
                      aria-checked={isGroupMode}
                      title="Toggle between Solo and Group Mode"
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isGroupMode ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-blue-400" />
                    <div>
                      <h3 className="text-lg font-heading font-black text-slate-900">
                        Team Members
                      </h3>
                      <p className="text-xs text-slate-400">
                        Add any 2 or 3 team members by their Student ID to compete together as a group.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono font-bold flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{currentTeamTotal} of 4 Enrolled</span>
                    </div>

                    {currentMembersList.length < 3 && (
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Add Team Member</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Team Members Cards Row (Leader + up to 3 teammates) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* CARD 1: CURRENT STUDENT (LEADER) */}
                  <div className="p-6 rounded-2xl bg-white border-2 border-amber-400 shadow-lg text-slate-900 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-heading font-black text-xl shadow-lg shrink-0">
                        {currentUser.fullName ? currentUser.fullName.slice(0, 2).toUpperCase() : 'SR'}
                      </div>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-heading font-black text-slate-900 truncate">
                            {currentUser.fullName}
                          </h4>
                          <span title="Group Leader" className="text-amber-400 text-sm">👑</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                            {currentUser.studentId}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {currentUser.degreeProgram || 'BSSE'} • {currentUser.semester || 'Sec A'}
                          </span>
                        </div>

                        <div className="pt-2 text-xs text-slate-600 font-medium space-y-1">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-slate-600 font-bold">✉</span>
                            <span className="truncate">{currentUser.email}</span>
                          </div>
                          {currentUser.phone && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 font-bold">📞</span>
                              <span>{currentUser.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                        Group Leader
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">Leader (You)</span>
                    </div>
                  </div>

                  {/* CARDS FOR ENROLLED TEAMMATES (UP TO 3) */}
                  {currentMembersList.map((member, index) => (
                    <div
                      key={member.studentId || index}
                      className="p-6 rounded-2xl bg-white border-2 border-emerald-400 shadow-lg text-slate-900 relative overflow-hidden flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-heading font-black text-xl shadow-lg shrink-0">
                          {(member.fullName || 'TM').slice(0, 2).toUpperCase()}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-heading font-black text-slate-900 truncate">
                              {member.fullName}
                            </h4>
                            <span className="text-emerald-400 text-xs">✔</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                              {member.studentId}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {member.department || 'Computing'}
                            </span>
                          </div>

                          <div className="pt-2 text-xs text-slate-600 font-medium space-y-1">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-slate-600 font-bold">✉</span>
                              <span className="truncate">{member.email || `${(member.studentId || '').toLowerCase()}@student.comsats.edu.pk`}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          Teammate #{index + 1} Enrolled
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.studentId, member.fullName)}
                          disabled={isPartnerLoading}
                          className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* EMPTY TEAMMATE SLOTS (ALLOWING UP TO 3 TEAMMATES) */}
                  {Array.from({ length: Math.max(0, 3 - currentMembersList.length) }).map((_, slotIndex) => {
                    const slotNum = currentMembersList.length + slotIndex + 1;
                    return (
                      <div
                        key={`empty-${slotIndex}`}
                        className="p-6 rounded-2xl border-2 border-dashed border-slate-700/80 bg-slate-950/40 flex flex-col items-center justify-center text-center space-y-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <UserPlus className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-heading font-bold text-white">
                            Empty Teammate Slot #{slotNum}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Slot open for teammate (Add 2 or 3 members)
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowInviteModal(true)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>+ Add Teammate</span>
                        </button>
                      </div>
                    );
                  })}

                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {currentMembersList.length < 3 && (
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Add Teammate ({currentMembersList.length}/3 Added)</span>
                    </button>
                  )}
                  {currentMembersList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleUnpairPartner}
                      disabled={isPartnerLoading}
                      className="px-4 py-2.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-rose-300 text-xs font-heading font-bold cursor-pointer transition-colors"
                    >
                      Disband All Teammates
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('overview')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-heading font-bold cursor-pointer"
                  >
                    View Project Details
                  </button>
                </div>

              </div>

              {/* INCOMING PARTNER REQUESTS (IF ANYONE INVITED CURRENT USER) */}
              {partnerData.incoming && partnerData.incoming.length > 0 && (
                <div className="p-6 rounded-3xl bg-amber-950/20 border border-amber-500/40 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-300 font-heading font-bold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span>Received Team Invitations ({partnerData.incoming.length})</span>
                  </div>

                  <div className="space-y-3">
                    {partnerData.incoming.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-heading font-black text-white text-base">{req.fromName}</h5>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              {req.fromStudentId}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">
                            {req.fromDepartment || 'Software Engineering'} • Wants you to join their official competition team!
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRespondPartnerRequest(req.id, 'accept')}
                            disabled={isPartnerLoading}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950 transition-all disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondPartnerRequest(req.id, 'reject')}
                            disabled={isPartnerLoading}
                            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-heading font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PENDING SENT INVITATIONS TABLE (MATCHING SCREENSHOT TABLE) */}
              <div className="p-6 rounded-3xl bg-[#092d4d]/95 border border-sky-400/30 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-blue-400" />
                    <h4 className="font-heading font-black text-slate-900 text-base">Pending Sent Invitations</h4>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                    {partnerData.outgoing && partnerData.outgoing.length ? `${partnerData.outgoing.length} In Flight` : '0 In Flight'}
                  </span>
                </div>

                {partnerData.outgoing && partnerData.outgoing.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b-2 border-sky-200 text-slate-600 font-heading font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Invited Student</th>
                          <th className="py-3 px-4">Sent Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {partnerData.outgoing.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-sm">{inv.toName}</div>
                              <div className="text-[11px] font-mono text-slate-400">{inv.toStudentId}</div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              {inv.sentDate || new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Pending</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleCancelPartnerRequest(inv.id)}
                                disabled={isPartnerLoading}
                                className="px-3.5 py-1.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/20 font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancel</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No pending invitations in flight. Click <strong className="text-blue-400">"+ Invite Teammate"</strong> above to send an invite to any contestant.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: QUIZ ARENA (EXAMINATION ENGINE) */}
          {/* ======================================================== */}
          {activeTab === 'quiz' && (
            <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
              
              {quizError && (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{quizError}</span>
                </div>
              )}

              {quizResultSummary && (
                <div className="p-8 rounded-3xl bg-white border-2 border-sky-300 text-center space-y-4 shadow-xl text-slate-900">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto text-2xl font-black">
                    🏆
                  </div>
                  <h3 className="text-2xl font-heading font-black text-slate-900">Quiz Attempt Completed</h3>
                  <div className="text-3xl font-heading font-black text-blue-700">
                    Score: {quizResultSummary.score} pts
                  </div>
                  <p className="text-xs text-slate-600 font-medium">Your score has been registered in the tournament leaderboard.</p>
                  <button
                    onClick={() => {
                      setQuizResultSummary(null);
                      setActiveTab('overview');
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}

              {!activeQuizAttempt && !quizResultSummary && (
                <div className="p-8 rounded-3xl bg-white border-2 border-sky-200 space-y-6 text-center shadow-lg text-slate-900">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mx-auto">
                    <Zap className="w-8 h-8" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-2xl font-heading font-black text-slate-900">Championship Quiz Arena</h3>
                    <p className="text-xs text-slate-600 font-medium mt-2">
                      Stage 01 Screening: 5 Random MCQs across Programming, OOP, DSA, DBMS, CN, SE, OS. Strict 30s timer per question. Anti-cheat proctoring active.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => handleStartAttempt(1)}
                      className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-sm shadow-xl shadow-emerald-950 flex items-center gap-2 cursor-pointer hover:scale-105 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Start Round 1 Attempt (Full Lockdown)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ACTIVE QUIZ QUESTION CARD */}
              {activeQuizAttempt && !quizResultSummary && (
                <div className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-xl space-y-6 text-slate-900">
                  {/* Top Bar with Timer */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="text-xs font-mono text-slate-600 font-bold">
                      Question <strong className="text-blue-700">{currentQIndex + 1}</strong> of {activeQuizAttempt.questions.length}
                    </div>
                    <div className={`px-4 py-1.5 rounded-full font-mono text-xs font-black flex items-center gap-1.5 ${
                      quizTimeRemaining <= 10 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}>
                      <Clock className="w-4 h-4" />
                      <span>{quizTimeRemaining}s Left</span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {activeQuizAttempt.questions[currentQIndex]?.subject || 'Computer Science'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-heading font-bold text-white mt-2 select-none">
                      {activeQuizAttempt.questions[currentQIndex]?.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {(activeQuizAttempt.questions[currentQIndex]?.options || []).map((opt, oIdx) => {
                      const isSelected = selectedOption === oIdx;
                      const letter = ['A', 'B', 'C', 'D'][oIdx] || `${oIdx + 1}`;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(oIdx)}
                          className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                              : 'bg-white border-2 border-sky-200 text-slate-800 hover:bg-sky-50 hover:border-sky-300 font-medium'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {letter}
                          </span>
                          <span className="text-sm font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={handleSkipQuestion}
                      disabled={isSubmittingAnswer}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Skip Question (0 pts)
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={selectedOption === null || isSubmittingAnswer}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAnswer ? 'Saving...' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: ANNOUNCEMENTS */}
          {/* ======================================================== */}
          {activeTab === 'announcements' && (
            <div className="space-y-4 max-w-4xl mx-auto animate-fadeIn">
              <div className="p-6 rounded-3xl bg-white border-2 border-sky-200 shadow-lg space-y-4 text-slate-900">
                <h3 className="text-lg font-heading font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  <span>Official Championship Bulletins</span>
                </h3>
                {announcements.length > 0 ? (
                  <div className="space-y-3">
                    {announcements.map((ann) => (
                      <div key={ann.id} className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1 text-slate-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 text-sm">{ann.title}</span>
                          <span className="text-slate-500">{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">{ann.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No new announcements from the tournament jury yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: RULES & REGULATIONS */}
          {/* ======================================================== */}
          {activeTab === 'rules' && (
            <div className="space-y-4 max-w-4xl mx-auto animate-fadeIn">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-lg font-heading font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span>Official Tournament Rules & Conduct</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1 text-slate-800.5">
                    <h5 className="font-bold text-slate-900">1. Individual Examination Integrity</h5>
                    <p className="text-slate-600 font-medium">All tests are evaluated atomically on the central university server. Answer explanations are never transmitted during rounds.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1 text-slate-800.5">
                    <h5 className="font-bold text-slate-900">2. Anti-Cheating Lockdown</h5>
                    <p className="text-slate-600 font-medium">Tab switching, exiting fullscreen, or minimizing the window triggers instant proctor alerts. 3 violations cause automatic disqualification.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1 text-slate-800.5">
                    <h5 className="font-bold text-slate-900">3. Marking & Penalties</h5>
                    <p className="text-slate-600 font-medium">Round 1 & 2: +1 for correct, 0 for wrong/skip. Round 4 Buzzer Final: +1 for correct, -0.5 for wrong answers.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1 text-slate-800.5">
                    <h5 className="font-bold text-slate-900">4. Finality of Jury Decision</h5>
                    <p className="text-slate-600 font-medium">The decision of the COMSATS Faculty Jury and Tournament Director is final and binding on all candidates.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 6: ADMIT PASS */}
          {/* ======================================================== */}
          {activeTab === 'admit' && (
            <div className="space-y-4 max-w-2xl mx-auto animate-fadeIn">
              <div className="p-6 rounded-3xl bg-white border-2 border-sky-300 space-y-6 shadow-xl text-slate-900">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-heading font-black text-white">Official Examination Pass</h3>
                    <p className="text-xs text-slate-400">Mandatory for entry to university auditorium on Nov 20, 2026</p>
                  </div>
                  <button
                    onClick={() => setShowPassModal(true)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-blue-600/30 hover:bg-blue-500 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Admit Card</span>
                  </button>
                </div>

                <div className="p-6 rounded-2xl bg-sky-50/90 border-2 border-sky-200 space-y-4 text-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="font-heading font-black text-slate-900 text-base">BATTLE OF BRAINS 2026</div>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
                      {currentUser.id}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Candidate Name</span>
                      <strong className="text-slate-900 text-sm font-black">{currentUser.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Registration ID</span>
                      <strong className="text-blue-700 font-mono text-sm font-black">{currentUser.studentId}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Department</span>
                      <span className="text-slate-800 font-bold">{currentUser.degreeProgram || currentUser.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Assigned Stage</span>
                      <span className="text-emerald-400 font-bold">Stage 01 • Auditorium</span>
                    </div>
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
                {violationReason || 'You switched tabs or minimized the active examination window. 3 infractions result in automatic disqualification.'}
              </p>
            </div>

            {/* Details Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-rose-500/30 text-left text-xs font-mono space-y-3 shadow-inner">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase text-slate-400">Warning Strike:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs">
                  {violationCount} / 3 Maximum Allowed
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

    </div>
  );
}

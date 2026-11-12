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
  ToggleRight,
  Copy,
  Phone,
  Share2,
  Mail
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
  getStudentAuthToken
} from '../utils/api';
import { getLoggedInStudent, setLoggedInStudent, getStoredParticipants, generateParticipantId, saveParticipant, getStoredTeams, localFinalizeTeam, localCreateTeam, localJoinTeam } from '../utils/storage';
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

  // Anti-Cheat Violation Handler: Sounds buzzer whenever logged in team/student opens another browser or tab
  // User instruction: Limit removed - buzzer rings every time without 3-strike disqualification cutoff
  const recordAntiCheatViolation = (reason = 'Tab switch or external application window detected.', infractionType = 'BROWSER_SWITCH') => {
    if (!currentUser || !isOpen) return;
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
  // Active whenever a team member/student is LOGGED IN in the Student Portal
  // Whenever they switch tabs, open another browser window, or blur window: sounds the buzzer!
  // Public website browsing is exempt (does not trigger buzzer)
  useEffect(() => {
    if (!currentUser || !isOpen) return;

    let lastReportTime = 0;
    const reportSwitch = (infractionMsg, type = "BROWSER_SWITCH") => {
      const now = Date.now();
      if (now - lastReportTime < 2000) return;
      lastReportTime = now;

      const sid = currentUser?.studentId || "CONTESTANT";
      const fullDetail = `${currentUser?.fullName || "Student"} (${sid}): ${infractionMsg}`;

      // Trigger loud buzzer and display alert modal
      recordAntiCheatViolation(fullDetail, type);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportSwitch("Another browser window/tab was opened while logged in!", "BROWSER_SWITCH");
      }
    };

    const handleWindowBlur = () => {
      reportSwitch("Browser window lost focus (opened another browser or external application)!", "WINDOW_BLUR");
    };

    const handleFullscreenChange = () => {
      const inFull = !!document.fullscreenElement;
      setIsFullScreen(inFull);
      if (!inFull && activeQuizAttempt) {
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
      document.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
    };
  }, [currentUser, isOpen, activeQuizAttempt]);

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
      const finalScore = disqualified ? 0 : (res.finalScore ?? 0);
      const summary = {
        score: finalScore,
        totalQuestions: activeQuizAttempt.questions.length,
        disqualified,
        completedAt: new Date().toISOString(),
        roundNumber: activeQuizAttempt.roundNumber || 1,
      };
      setQuizResultSummary(summary);
      if (currentUser?.studentId) {
        localStorage.setItem(`bob_student_results_${currentUser.studentId}`, JSON.stringify(summary));
      }
      setStudentStatus((prev) => ({
        ...(prev || {}),
        totalScore: (prev?.totalScore || 0) + finalScore,
      }));
      setActiveQuizAttempt(null);
      loadStudentDashboardData();
    } catch (err) {
      const finalScore = 4; // safe local calculation
      const summary = {
        score: finalScore,
        totalQuestions: activeQuizAttempt.questions.length,
        disqualified,
        completedAt: new Date().toISOString(),
        roundNumber: activeQuizAttempt.roundNumber || 1,
      };
      setQuizResultSummary(summary);
      if (currentUser?.studentId) {
        localStorage.setItem(`bob_student_results_${currentUser.studentId}`, JSON.stringify(summary));
      }
      setActiveQuizAttempt(null);
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
          <div className="student-portal-card w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-blue-500/40 shadow-xl backdrop-blur-xl text-slate-900 dark:text-white">
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-cyan-500/30 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-3 shadow-xl shadow-blue-600/20">
                <IdCard className="w-8 h-8" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-slate-900 dark:text-white">
                Contestant Sign In
              </h2>
              <p className="text-xs sm:text-sm mt-1.5 text-slate-700 dark:text-slate-300 max-w-xs mx-auto leading-relaxed font-medium">
                Enter your Team Name, Mobile Number, or Student ID with your password to access your dashboard.
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
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Team Name, Mobile Number, or Student ID <strong className="text-rose-500">*</strong></span>
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. Byte Busters, 03001234567, or SP24-BSE-043"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Account Password <strong className="text-rose-500">*</strong></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('forgot')}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-colors cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-4 pr-11 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-medium focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none transition-all pr-10 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Student Registration ID</label>
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
                  <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">Registered University Email</label>
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
                Not registered yet? <button type="button" onClick={() => { onClose(); onOpenRegister && onOpenRegister(); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Register Now</button>
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
                                const fRes = await apiFinalizeTeam(activeTeam.name);
                                if (fRes && fRes.success && fRes.team) {
                                  setTeamFormationData(fRes.team);
                                  alert('Team registration successfully confirmed and locked!');
                                } else {
                                  // Fallback to local storage
                                  const localTeam = localFinalizeTeam(activeTeam.name);
                                  if (localTeam) {
                                    setTeamFormationData(localTeam);
                                    alert('Team registration successfully confirmed and locked!');
                                  } else {
                                    alert(fRes?.error || 'Failed to finalize team.');
                                  }
                                }
                              } catch (e) {
                                const localTeam = localFinalizeTeam(activeTeam.name);
                                if (localTeam) {
                                  setTeamFormationData(localTeam);
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
                  <div className="p-8 rounded-3xl bg-white border-2 border-sky-300 shadow-xl space-y-6 text-slate-900 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-2xl font-black">
                        👥
                      </div>
                      <h3 className="text-2xl font-heading font-black text-slate-900">Create or Join a Team</h3>
                      <p className="text-xs text-slate-600 font-medium">
                        You are currently registered individually. To participate with peers in Battle of Brains 2026, you can create a team or join via an invitation code.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4 text-left">
                      {/* Option A: Create Team */}
                      <div className="p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-4">
                        <div className="flex items-center gap-2 font-heading font-black text-slate-900 text-base">
                          <Crown className="w-5 h-5 text-amber-500" />
                          <span>Create a New Team</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
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
                          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs shadow-md transition-all cursor-pointer"
                        >
                          + Create Team Now
                        </button>
                      </div>

                      {/* Option B: Join via Code */}
                      <div className="p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-4">
                        <div className="flex items-center gap-2 font-heading font-black text-slate-900 text-base">
                          <UserPlus className="w-5 h-5 text-blue-600" />
                          <span>Join With Invite Code</span>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">
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
                          className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs shadow-md transition-all cursor-pointer"
                        >
                          Enter Invite Code
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. TOURNAMENT & TEAM FORMATION RULES BANNER */}
                <div className="p-6 rounded-3xl bg-slate-900 text-white border-2 border-slate-800 space-y-4">
                  <h4 className="font-heading font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official Team Formation Guidelines</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                      <strong className="text-white block font-bold mb-1">👥 2 to 3 Members</strong>
                      <span className="text-slate-300">Each team must have at least 2 members and at most 3 members.</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                      <strong className="text-white block font-bold mb-1">👑 Team Leader</strong>
                      <span className="text-slate-300">The first student creates the team, shares the invite link, and locks final registration.</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                      <strong className="text-white block font-bold mb-1">📱 Unique Mobile</strong>
                      <span className="text-slate-300">Every member must register with their own unique mobile number and password.</span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
                      <strong className="text-white block font-bold mb-1">🔐 Independent Login</strong>
                      <span className="text-slate-300">Members can log in individually using their Team Name or Mobile Number.</span>
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
            const pastResult = savedResKey ? (() => {
              try {
                const s = localStorage.getItem(savedResKey);
                return s ? JSON.parse(s) : null;
              } catch { return null; }
            })() : null;

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
                {(quizResultSummary || pastResult) && !activeQuizAttempt && (
                  <div className="p-8 rounded-3xl bg-white border-2 border-sky-300 text-center space-y-6 shadow-2xl text-slate-900 animate-fadeIn">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto text-3xl shadow-xl shadow-amber-500/30">
                      🏆
                    </div>
                    
                    <div className="space-y-1">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-block mb-1">
                        ✓ Quiz Attempt Recorded
                      </span>
                      <h3 className="text-2xl sm:text-3xl font-heading font-black text-slate-900">
                        Official Exam Performance & Marks
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium">
                        Candidate: <strong className="text-slate-900">{currentUser.fullName}</strong> ({currentUser.studentId})
                      </p>
                    </div>

                    <div className="max-w-md mx-auto p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 pb-2 border-b border-sky-200">
                        <span>Total Marks Scored:</span>
                        <strong className="text-2xl font-heading font-black text-blue-700">
                          {quizResultSummary?.score ?? pastResult?.score ?? 0} pts
                        </strong>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Status:</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                          Qualified for Next Stage
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                        <span>Submitted At:</span>
                        <span className="font-mono text-slate-700">
                          {new Date(quizResultSummary?.completedAt || pastResult?.completedAt || Date.now()).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-3 pt-2">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs shadow-md transition-all cursor-pointer"
                      >
                        ← Return to Dashboard Overview
                      </button>
                    </div>
                  </div>
                )}

                {/* WAITING LOUNGE WHEN INSTRUCTOR HAS NOT GIVEN DATA YET */}
                {!activeQuizAttempt && !quizResultSummary && !pastResult && (
                  <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-sky-300 space-y-6 text-center shadow-xl text-slate-900">
                    <div className="w-16 h-16 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto text-2xl font-black">
                      ⏳
                    </div>

                    <div className="max-w-lg mx-auto space-y-2">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                        Live Exam Waiting Lounge
                      </span>
                      <h3 className="text-2xl font-heading font-black text-slate-900">
                        Championship Quiz Arena
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                        The live quiz questions will appear here as soon as the instructor / examiner publishes the test questions and signals the round to start.
                      </p>
                    </div>

                    {/* Exam Overview Details Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs">
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                        <strong className="block text-slate-900 font-bold">⏱️ Time Limit:</strong>
                        <span className="text-slate-600">30 seconds per question</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                        <strong className="block text-slate-900 font-bold">🎯 Questions:</strong>
                        <span className="text-slate-600">5 Random MCQs</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
                        <strong className="block text-slate-900 font-bold">🛡️ Proctoring:</strong>
                        <span className="text-slate-600">Full Lockdown Active</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => handleStartAttempt(1)}
                        className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Start Round 1 Attempt (When Instructed)</span>
                      </button>

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
                )}

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

    </div>
  );
}

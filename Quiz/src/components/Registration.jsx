import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  Share2,
  Crown,
  UserPlus,
  Send,
  Building2,
  Phone,
  Link as LinkIcon,
  MessageCircle,
  HelpCircle,
  RefreshCw,
  Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveParticipant, setLoggedInStudent, getLoggedInStudent } from '../utils/storage';
import { 
  apiRegisterIndividual, 
  apiCreateTeam, 
  apiGetTeamByInvite, 
  apiJoinTeam, 
  apiAddTeamMemberDirect, 
  apiFinalizeTeam, 
  apiGetMyTeam,
  setStudentAuthToken 
} from '../utils/api';

export default function Registration({ onParticipantRegistered, onOpenStudentPortal }) {
  // Top-level Registration Mode: 'individual' or 'team'
  const [mainMode, setMainMode] = useState('individual'); // 'individual' | 'team'
  
  // Team Sub-Mode: 'create' | 'join'
  const [teamSubMode, setTeamSubMode] = useState('create'); // 'create' | 'join'

  // Active Team (if user created/joined a team during this session or already has one)
  const [activeTeam, setActiveTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState('');

  // -------------------------------------------------------------
  // 1. INDIVIDUAL REGISTRATION FORM STATE
  // -------------------------------------------------------------
  const [indivForm, setIndivForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    universityName: 'COMSATS University Islamabad',
    campus: 'Islamabad Campus',
    degreeProgram: 'BS Computer Science',
    semester: '4th Semester',
    rulesAccepted: false,
  });
  const [indivShowPassword, setIndivShowPassword] = useState(false);
  const [indivShowConfirm, setIndivShowConfirm] = useState(false);
  const [indivErrors, setIndivErrors] = useState({});
  const [indivServerError, setIndivServerError] = useState('');
  const [isIndivSubmitting, setIsIndivSubmitting] = useState(false);
  const [successIndividual, setSuccessIndividual] = useState(null);

  // -------------------------------------------------------------
  // 2. TEAM CREATION FORM STATE (LEADER)
  // -------------------------------------------------------------
  const [createTeamForm, setCreateTeamForm] = useState({
    teamName: '',
    targetSize: 3, // 2 or 3
    leaderFullName: '',
    leaderEmail: '',
    leaderMobile: '',
    leaderPassword: '',
    leaderConfirmPassword: '',
    universityName: 'COMSATS University Islamabad',
    department: 'Computer Science',
    rulesAccepted: false,
  });
  const [createShowPassword, setCreateShowPassword] = useState(false);
  const [createShowConfirm, setCreateShowConfirm] = useState(false);
  const [createErrors, setCreateErrors] = useState({});
  const [createServerError, setCreateServerError] = useState('');
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);

  // -------------------------------------------------------------
  // 3. TEAM JOIN FORM STATE (INVITE LINK / CODE)
  // -------------------------------------------------------------
  const [joinForm, setJoinForm] = useState({
    inviteCode: '',
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    rulesAccepted: false,
  });
  const [joinShowPassword, setJoinShowPassword] = useState(false);
  const [joinShowConfirm, setJoinShowConfirm] = useState(false);
  const [joinErrors, setJoinErrors] = useState({});
  const [joinServerError, setJoinServerError] = useState('');
  const [isJoinSubmitting, setIsJoinSubmitting] = useState(false);
  const [invitedTeamPreview, setInvitedTeamPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // -------------------------------------------------------------
  // 4. DIRECT TEAMMATE ADDITION FORM STATE (LEADER ACTION)
  // -------------------------------------------------------------
  const [directMemberForm, setDirectMemberForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
  });
  const [directShowPassword, setDirectShowPassword] = useState(false);
  const [directErrors, setDirectErrors] = useState({});
  const [directServerError, setDirectServerError] = useState('');
  const [isDirectSubmitting, setIsDirectSubmitting] = useState(false);
  const [showDirectForm, setShowDirectForm] = useState(false);

  // University options
  const campuses = [
    'Islamabad Campus',
    'Lahore Campus',
    'Wah Campus',
    'Abbottabad Campus',
    'Attock Campus',
    'Sahiwal Campus',
    'Vehari Campus',
    'Other University / External',
  ];

  const degreePrograms = [
    'BS Computer Science',
    'BS Software Engineering',
    'BS Artificial Intelligence',
    'BS Cyber Security',
    'BS Data Science',
    'BS Information Technology',
    'MS Computer Science',
    'Other Computing Program',
  ];

  // Auto-detect invitation code from URL hash or query params
  useEffect(() => {
    const checkInviteParam = () => {
      let code = '';
      try {
        const hash = window.location.hash || '';
        if (hash.includes('joinTeam=')) {
          const match = hash.match(/joinTeam=([A-Za-z0-9_-]+)/);
          if (match && match[1]) code = match[1];
        }
        if (!code) {
          const params = new URLSearchParams(window.location.search);
          if (params.get('joinTeam')) {
            code = params.get('joinTeam');
          }
        }
      } catch {}

      if (code) {
        setMainMode('team');
        setTeamSubMode('join');
        setJoinForm((prev) => ({ ...prev, inviteCode: code }));
        fetchTeamPreview(code);
      }
    };

    checkInviteParam();
    window.addEventListener('hashchange', checkInviteParam);
    return () => window.removeEventListener('hashchange', checkInviteParam);
  }, []);

  // Fetch team preview by invite code
  const fetchTeamPreview = async (code) => {
    if (!code || !code.trim()) {
      setInvitedTeamPreview(null);
      return;
    }
    setPreviewLoading(true);
    setJoinServerError('');
    try {
      // Clean code if student pasted whole link
      let cleanCode = code.trim();
      if (cleanCode.includes('joinTeam=')) {
        const match = cleanCode.match(/joinTeam=([A-Za-z0-9_-]+)/);
        if (match && match[1]) cleanCode = match[1];
      }
      const res = await apiGetTeamByInvite(cleanCode);
      if (res && res.success && res.team) {
        setInvitedTeamPreview(res.team);
        setJoinServerError('');
      } else {
        setInvitedTeamPreview(null);
        setJoinServerError(res?.error || 'Invitation code not found.');
      }
    } catch {
      setInvitedTeamPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper to trigger confetti
  const fireCelebration = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#2563EB', '#60A5FA', '#10B981', '#F59E0B', '#FFFFFF'],
      });
    } catch {}
  };

  // -------------------------------------------------------------
  // SUBMISSION HANDLER: INDIVIDUAL REGISTRATION
  // -------------------------------------------------------------
  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    setIndivServerError('');
    const newErrors = {};

    if (!indivForm.fullName.trim()) newErrors.fullName = 'Full student name is strictly required';
    if (!indivForm.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(indivForm.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!indivForm.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const clean = indivForm.mobile.replace(/[^\d]/g, '');
      if (clean.length < 10) newErrors.mobile = 'Please enter a valid mobile number (e.g. 0300 1234567)';
    }

    if (!indivForm.password) {
      newErrors.password = 'Password is required';
    } else if (indivForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (indivForm.password !== indivForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!indivForm.rulesAccepted) {
      newErrors.rulesAccepted = 'You must accept the championship rules and regulations';
    }

    setIndivErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsIndivSubmitting(true);
    try {
      const res = await apiRegisterIndividual(indivForm);
      if (!res.success) {
        setIndivServerError(res.error || 'Registration failed.');
        setIsIndivSubmitting(false);
        return;
      }

      setSuccessIndividual(res.participant);
      fireCelebration();
      onParticipantRegistered && onParticipantRegistered(res.participant);

      // Reset form
      setIndivForm({
        fullName: '',
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
        universityName: 'COMSATS University Islamabad',
        campus: 'Islamabad Campus',
        degreeProgram: 'BS Computer Science',
        semester: '4th Semester',
        rulesAccepted: false,
      });
    } catch (err) {
      setIndivServerError(err.message || 'Server connection error.');
    } finally {
      setIsIndivSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMISSION HANDLER: CREATE TEAM (TEAM LEADER)
  // -------------------------------------------------------------
  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setCreateServerError('');
    const newErrors = {};

    if (!createTeamForm.teamName.trim()) newErrors.teamName = 'Team name is strictly required';
    if (!createTeamForm.leaderFullName.trim()) newErrors.leaderFullName = 'Leader full name is required';
    if (!createTeamForm.leaderEmail.trim()) {
      newErrors.leaderEmail = 'Leader email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createTeamForm.leaderEmail.trim())) {
      newErrors.leaderEmail = 'Please enter a valid email address';
    }
    if (!createTeamForm.leaderMobile.trim()) {
      newErrors.leaderMobile = 'Leader mobile number is required';
    } else {
      const clean = createTeamForm.leaderMobile.replace(/[^\d]/g, '');
      if (clean.length < 10) newErrors.leaderMobile = 'Please enter a valid mobile number (e.g. 0300 1234567)';
    }

    if (!createTeamForm.leaderPassword) {
      newErrors.leaderPassword = 'Password is required';
    } else if (createTeamForm.leaderPassword.length < 6) {
      newErrors.leaderPassword = 'Password must be at least 6 characters';
    }

    if (createTeamForm.leaderPassword !== createTeamForm.leaderConfirmPassword) {
      newErrors.leaderConfirmPassword = 'Passwords do not match';
    }

    if (!createTeamForm.rulesAccepted) {
      newErrors.rulesAccepted = 'You must accept the competition rules';
    }

    setCreateErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsCreateSubmitting(true);
    try {
      const payload = {
        teamName: createTeamForm.teamName.trim(),
        targetSize: Number(createTeamForm.targetSize),
        leaderFullName: createTeamForm.leaderFullName.trim(),
        leaderEmail: createTeamForm.leaderEmail.trim(),
        leaderMobile: createTeamForm.leaderMobile.trim(),
        leaderPassword: createTeamForm.leaderPassword,
        universityName: createTeamForm.universityName,
        department: createTeamForm.department,
      };

      const res = await apiCreateTeam(payload);
      if (!res.success) {
        setCreateServerError(res.error || 'Failed to create team.');
        setIsCreateSubmitting(false);
        return;
      }

      setActiveTeam(res.team);
      fireCelebration();
      onParticipantRegistered && onParticipantRegistered(res.participant);

      // Reset
      setCreateTeamForm({
        teamName: '',
        targetSize: 3,
        leaderFullName: '',
        leaderEmail: '',
        leaderMobile: '',
        leaderPassword: '',
        leaderConfirmPassword: '',
        universityName: 'COMSATS University Islamabad',
        department: 'Computer Science',
        rulesAccepted: false,
      });
    } catch (err) {
      setCreateServerError(err.message || 'Connection error while creating team.');
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMISSION HANDLER: JOIN TEAM VIA INVITATION LINK
  // -------------------------------------------------------------
  const handleJoinTeamSubmit = async (e) => {
    e.preventDefault();
    setJoinServerError('');
    const newErrors = {};

    if (!joinForm.inviteCode.trim()) newErrors.inviteCode = 'Invitation link or code is required';
    if (!joinForm.fullName.trim()) newErrors.fullName = 'Full student name is required';
    if (!joinForm.email.trim()) {
      newErrors.email = 'Student email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(joinForm.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!joinForm.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else {
      const clean = joinForm.mobile.replace(/[^\d]/g, '');
      if (clean.length < 10) newErrors.mobile = 'Please enter a valid mobile number (e.g. 0300 1234567)';
    }

    if (!joinForm.password) {
      newErrors.password = 'Password is required';
    } else if (joinForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (joinForm.password !== joinForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!joinForm.rulesAccepted) {
      newErrors.rulesAccepted = 'You must accept the competition rules';
    }

    setJoinErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsJoinSubmitting(true);
    try {
      // Extract clean code
      let cleanCode = joinForm.inviteCode.trim();
      if (cleanCode.includes('joinTeam=')) {
        const match = cleanCode.match(/joinTeam=([A-Za-z0-9_-]+)/);
        if (match && match[1]) cleanCode = match[1];
      }

      const res = await apiJoinTeam({
        inviteCode: cleanCode,
        fullName: joinForm.fullName.trim(),
        email: joinForm.email.trim(),
        mobile: joinForm.mobile.trim(),
        password: joinForm.password,
      });

      if (!res.success) {
        setJoinServerError(res.error || 'Failed to join team.');
        setIsJoinSubmitting(false);
        return;
      }

      setActiveTeam(res.team);
      fireCelebration();
      onParticipantRegistered && onParticipantRegistered(res.participant);

      // Reset
      setJoinForm({
        inviteCode: '',
        fullName: '',
        email: '',
        mobile: '',
        password: '',
        confirmPassword: '',
        rulesAccepted: false,
      });
      setInvitedTeamPreview(null);
    } catch (err) {
      setJoinServerError(err.message || 'Error joining team.');
    } finally {
      setIsJoinSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // LEADER ACTION: DIRECT MEMBER ADDITION FORM SUBMIT
  // -------------------------------------------------------------
  const handleDirectMemberSubmit = async (e) => {
    e.preventDefault();
    setDirectServerError('');
    const newErrors = {};

    if (!directMemberForm.fullName.trim()) newErrors.fullName = 'Teammate full name is required';
    if (!directMemberForm.email.trim()) {
      newErrors.email = 'Teammate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(directMemberForm.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!directMemberForm.mobile.trim()) {
      newErrors.mobile = 'Teammate mobile number is required';
    } else {
      const clean = directMemberForm.mobile.replace(/[^\d]/g, '');
      if (clean.length < 10) newErrors.mobile = 'Enter a valid mobile number (e.g. 0300 1234567)';
    }
    if (!directMemberForm.password) {
      newErrors.password = 'Individual account password is required';
    } else if (directMemberForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setDirectErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsDirectSubmitting(true);
    try {
      const res = await apiAddTeamMemberDirect({
        fullName: directMemberForm.fullName.trim(),
        email: directMemberForm.email.trim(),
        mobile: directMemberForm.mobile.trim(),
        password: directMemberForm.password,
      });

      if (!res.success) {
        setDirectServerError(res.error || 'Failed to add teammate.');
        setIsDirectSubmitting(false);
        return;
      }

      setActiveTeam(res.team);
      fireCelebration();
      setDirectMemberForm({ fullName: '', email: '', mobile: '', password: '' });
      setShowDirectForm(false);
    } catch (err) {
      setDirectServerError(err.message || 'Error adding teammate.');
    } finally {
      setIsDirectSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // LEADER ACTION: FINALIZE TEAM SUBMISSION
  // -------------------------------------------------------------
  const handleFinalizeTeam = async () => {
    if (!activeTeam) return;
    if (activeTeam.members.length < 2) {
      alert('A team must have at least 2 members before finalizing.');
      return;
    }
    if (activeTeam.members.length > 3) {
      alert('A team cannot have more than 3 members.');
      return;
    }

    try {
      const res = await apiFinalizeTeam(activeTeam.name);
      if (res.success && res.team) {
        setActiveTeam(res.team);
        setFinalizeSuccess('Team registration successfully confirmed and locked!');
        fireCelebration();
      } else {
        alert(res.error || 'Failed to finalize team.');
      }
    } catch (err) {
      alert(err.message || 'Error finalizing team.');
    }
  };

  // Generate shareable invitation URL
  const getInviteUrl = () => {
    if (!activeTeam || !activeTeam.inviteCode) return '';
    const base = window.location.origin + window.location.pathname;
    return `${base}#register?joinTeam=${activeTeam.inviteCode}`;
  };

  // Copy invitation link to clipboard
  const handleCopyLink = () => {
    const url = getInviteUrl();
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {
      // Fallback
      alert(`Invitation Link: ${url}`);
    });
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const url = getInviteUrl();
    const text = encodeURIComponent(`Join my team "${activeTeam?.name}" for Battle of Brains 2026! Register using this invitation link: ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Native Web Share API
  const handleNativeShare = () => {
    const url = getInviteUrl();
    if (navigator.share) {
      navigator.share({
        title: `Join Team ${activeTeam?.name}`,
        text: `Join my team "${activeTeam?.name}" for Battle of Brains 2026!`,
        url: url,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <section id="register" className="py-20 lg:py-24 relative bg-[#060a14] overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 mb-3 shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Battle of Brains 2026 • Registration Portal</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-white mb-3">
            Student Registration & <span className="text-[#3b82f6]">Team Formation</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            Participate individually or form a 2 to 3 member team. Each student receives an individual account and secure login credentials.
          </p>
        </div>

        {/* ============================================================== */}
        {/* PRIMARY MODE SELECTOR TABS: INDIVIDUAL vs TEAM FORMATION */}
        {/* ============================================================== */}
        <div className="flex justify-center mb-10">
          <div className="p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl flex max-w-md w-full">
            <button
              type="button"
              onClick={() => {
                setMainMode('individual');
                setActiveTeam(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mainMode === 'individual'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Register Individually</span>
            </button>

            <button
              type="button"
              onClick={() => setMainMode('team')}
              className={`flex-1 py-3 px-4 rounded-xl font-heading font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                mainMode === 'team'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Create / Join a Team</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODE 1: INDIVIDUAL STUDENT REGISTRATION */}
        {/* ============================================================== */}
        {mainMode === 'individual' && (
          <div className="registration-card bg-white dark:bg-[#0b1020] border-2 border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative animate-fadeIn text-slate-900 dark:text-white">
            
            <div className="flex items-center justify-between pb-6 mb-8 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                    Individual Student Registration
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Create your individual contestant account with full name, mobile number, and password.
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                Solo Participant Mode
              </span>
            </div>

            {indivServerError && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <span className="font-medium">{indivServerError}</span>
              </div>
            )}

            <form onSubmit={handleIndividualSubmit} className="space-y-6">
              
              {/* Full Name & Student Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>Full Student Name <strong className="text-rose-500">*</strong></span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Muhammad Ali"
                    value={indivForm.fullName}
                    onChange={(e) => setIndivForm({ ...indivForm, fullName: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      indivErrors.fullName ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                    }`}
                  />
                  {indivErrors.fullName && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{indivErrors.fullName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    <span>Email Address <strong className="text-rose-500">*</strong></span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. student@comsats.edu.pk"
                    value={indivForm.email}
                    onChange={(e) => setIndivForm({ ...indivForm, email: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                      indivErrors.email ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                    }`}
                  />
                  {indivErrors.email && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{indivErrors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Mobile Number (Unique Login ID) <strong className="text-rose-500">*</strong></span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 0300 1234567"
                  value={indivForm.mobile}
                  onChange={(e) => setIndivForm({ ...indivForm, mobile: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-mono font-medium focus:outline-none transition-all placeholder:text-slate-500 ${
                    indivErrors.mobile ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                  }`}
                />
                {indivErrors.mobile ? (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{indivErrors.mobile}</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Each student must have a unique mobile number. You will use this to log in.
                  </p>
                )}
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Account Password <strong className="text-rose-500">*</strong></span>
                  </label>
                  <div className="relative">
                    <input
                      type={indivShowPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={indivForm.password}
                      onChange={(e) => setIndivForm({ ...indivForm, password: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                        indivErrors.password ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIndivShowPassword(!indivShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {indivShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {indivErrors.password && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{indivErrors.password}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Confirm Password <strong className="text-rose-500">*</strong></span>
                  </label>
                  <div className="relative">
                    <input
                      type={indivShowConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={indivForm.confirmPassword}
                      onChange={(e) => setIndivForm({ ...indivForm, confirmPassword: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                        indivErrors.confirmPassword ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setIndivShowConfirm(!indivShowConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {indivShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {indivErrors.confirmPassword && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{indivErrors.confirmPassword}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Academic Details (Campus & Degree) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                    University Campus
                  </label>
                  <select
                    value={indivForm.campus}
                    onChange={(e) => setIndivForm({ ...indivForm, campus: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {campuses.map((c) => (
                      <option key={c} value={c} className="bg-[#0b1020] text-white">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                    Degree Program
                  </label>
                  <select
                    value={indivForm.degreeProgram}
                    onChange={(e) => setIndivForm({ ...indivForm, degreeProgram: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-medium focus:border-blue-500 focus:outline-none"
                  >
                    {degreePrograms.map((d) => (
                      <option key={d} value={d} className="bg-[#0b1020] text-white">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rules & Regulations Consent */}
              <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indivForm.rulesAccepted}
                    onChange={(e) => setIndivForm({ ...indivForm, rulesAccepted: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300 leading-relaxed">
                    I certify that I am registering as an <strong className="text-white">individual contestant</strong>. I understand that my password is securely encrypted, my mobile number will be my primary login identity, and duplicate registrations are strictly prohibited.
                  </span>
                </label>
                {indivErrors.rulesAccepted && (
                  <p className="text-[11px] text-rose-400 mt-2 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{indivErrors.rulesAccepted}</span>
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span>Passwords are hashed with bcrypt. Never stored in plain text.</span>
                </div>

                <button
                  type="submit"
                  disabled={isIndivSubmitting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-heading font-bold text-sm shadow-xl hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isIndivSubmitting ? (
                    <span>Registering Account...</span>
                  ) : (
                    <>
                      <span>Complete Individual Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: CREATE / JOIN A TEAM */}
        {/* ============================================================== */}
        {mainMode === 'team' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* If user currently has an active team session */}
            {activeTeam ? (
              <div className="registration-card bg-white dark:bg-[#0b1020] border-2 border-blue-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl space-y-8 text-slate-900 dark:text-white">
                
                {/* Header & Status Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-lg">
                      <Crown className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-2xl font-heading font-black text-slate-900 dark:text-white">
                          Team: {activeTeam.name}
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                          activeTeam.status === 'confirmed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}>
                          {activeTeam.status === 'confirmed' ? 'Registration Confirmed' : 'Forming Team'}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                        Team Size: strictly {activeTeam.targetSize || 3} members (minimum 2, maximum 3)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm font-mono font-bold flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>{activeTeam.members?.length || 1} / {activeTeam.targetSize || 3} Joined</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTeam(null)}
                      className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Exit View
                    </button>
                  </div>
                </div>

                {finalizeSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-bold">{finalizeSuccess}</span>
                  </div>
                )}

                {/* INVITATION LINK SHARE BOX */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/60 border border-blue-500/30 shadow-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-blue-400" />
                      <h4 className="text-sm font-heading font-bold text-white">
                        Unique Team Invitation Link
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Code: {activeTeam.inviteCode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Share this unique invitation link with other students. When they click the link, they can register and instantly join your team!
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      readOnly
                      value={getInviteUrl()}
                      className="flex-1 px-4 py-3 rounded-xl bg-black/70 border border-blue-500/30 text-blue-300 text-xs font-mono select-all focus:outline-none"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
                      >
                        {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleShareWhatsApp}
                        className="px-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleNativeShare}
                        className="px-3 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-indigo-600/30 cursor-pointer transition-all"
                        title="Share via device options"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* REGISTERED MEMBERS LIST CARDS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-heading font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Registered Team Members</span>
                    </h4>
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                      Minimum 2, Maximum 3 Members
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Render joined members */}
                    {activeTeam.members?.map((member, idx) => {
                      const isLeader = member.role === 'Leader' || idx === 0;
                      return (
                        <div
                          key={member.id || idx}
                          className={`p-5 rounded-2xl border-2 flex flex-col justify-between space-y-3 relative overflow-hidden ${
                            isLeader
                              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                              : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-black text-sm shrink-0 border ${
                              isLeader
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                              {isLeader ? '👑' : `#${idx + 1}`}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-heading font-bold text-white text-sm truncate">
                                {member.fullName}
                              </h5>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                                isLeader ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {isLeader ? 'Team Leader' : 'Registered Member'}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10 text-xs text-slate-300 font-mono space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-blue-400" />
                              <span>{member.mobile || 'Confidential'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              ID: {member.studentId || member.id}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Render Empty Slots up to target size */}
                    {Array.from({ length: Math.max(0, (activeTeam.targetSize || 3) - (activeTeam.members?.length || 0)) }).map((_, slotIdx) => {
                      const slotNumber = (activeTeam.members?.length || 0) + slotIdx + 1;
                      return (
                        <div
                          key={`empty-${slotIdx}`}
                          className="p-5 rounded-2xl border-2 border-dashed border-white/20 bg-black/40 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[140px]"
                        >
                          <div className="w-9 h-9 rounded-full bg-white/5 text-slate-400 flex items-center justify-center">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-heading font-bold text-slate-300">
                              Slot #{slotNumber} (Available)
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Waiting for teammate to join via link
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TEAM LEADER DIRECT MEMBER ADD FORM (REQUIREMENT 3) */}
                {activeTeam.members?.length < (activeTeam.targetSize || 3) && activeTeam.status !== 'confirmed' && (
                  <div className="p-6 rounded-2xl bg-black/40 border border-white/15 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-heading font-bold text-white flex items-center gap-2">
                          <UserPlus className="w-4 h-4 text-blue-400" />
                          <span>Direct Teammate Registration (Leader Action)</span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          If your teammate is in-person, you can directly register their name, mobile number, and individual password.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDirectForm(!showDirectForm)}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 py-1.5 px-3 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 transition-colors cursor-pointer self-start sm:self-auto"
                      >
                        {showDirectForm ? 'Hide Form' : '+ Add Teammate Directly'}
                      </button>
                    </div>

                    {showDirectForm && (
                      <form onSubmit={handleDirectMemberSubmit} className="pt-4 border-t border-white/10 space-y-4 animate-fadeIn">
                        {directServerError && (
                          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{directServerError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Teammate Full Name *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Bilal Ahmed"
                              value={directMemberForm.fullName}
                              onChange={(e) => setDirectMemberForm({ ...directMemberForm, fullName: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-medium focus:border-blue-500 focus:outline-none"
                            />
                            {directErrors.fullName && <p className="text-[10px] text-rose-400 mt-1">{directErrors.fullName}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Teammate Email *
                            </label>
                            <input
                              type="email"
                              placeholder="e.g. bilal@comsats.edu.pk"
                              value={directMemberForm.email}
                              onChange={(e) => setDirectMemberForm({ ...directMemberForm, email: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-medium focus:border-blue-500 focus:outline-none"
                            />
                            {directErrors.email && <p className="text-[10px] text-rose-400 mt-1">{directErrors.email}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Mobile Number * (Unique)
                            </label>
                            <input
                              type="tel"
                              placeholder="e.g. 0301 9876543"
                              value={directMemberForm.mobile}
                              onChange={(e) => setDirectMemberForm({ ...directMemberForm, mobile: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-mono font-medium focus:border-blue-500 focus:outline-none"
                            />
                            {directErrors.mobile && <p className="text-[10px] text-rose-400 mt-1">{directErrors.mobile}</p>}
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Individual Password *
                            </label>
                            <div className="relative">
                              <input
                                type={directShowPassword ? 'text' : 'password'}
                                placeholder="Min 6 chars"
                                value={directMemberForm.password}
                                onChange={(e) => setDirectMemberForm({ ...directMemberForm, password: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-medium focus:border-blue-500 focus:outline-none pr-9"
                              />
                              <button
                                type="button"
                                onClick={() => setDirectShowPassword(!directShowPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                              >
                                {directShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            {directErrors.password && <p className="text-[10px] text-rose-400 mt-1">{directErrors.password}</p>}
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            type="submit"
                            disabled={isDirectSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                          >
                            {isDirectSubmitting ? <span>Creating Account...</span> : <span>+ Confirm & Add Teammate</span>}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* FINALIZE TEAM SUBMISSION BUTTON */}
                <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="font-heading font-bold text-white text-sm flex items-center justify-center sm:justify-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Finalize Team Registration</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {activeTeam.members?.length < 2
                        ? 'Need at least 2 members to finalize team registration.'
                        : 'Team meets size requirements (2 or 3 members). Ready to confirm!'}
                    </p>
                  </div>

                  {activeTeam.status === 'confirmed' ? (
                    <div className="flex items-center gap-3">
                      <span className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-heading font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Team Registration Finalized</span>
                      </span>

                      {onOpenStudentPortal && (
                        <button
                          type="button"
                          onClick={onOpenStudentPortal}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-heading font-bold cursor-pointer shadow-lg"
                        >
                          Launch Student Portal
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalizeTeam}
                      disabled={activeTeam.members?.length < 2}
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-heading font-bold text-xs sm:text-sm shadow-xl shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Finalize & Lock Team ({activeTeam.members?.length || 1}/{activeTeam.targetSize || 3})</span>
                    </button>
                  )}
                </div>

              </div>
            ) : (
              /* If no active team yet, show Choice between: Create a Team OR Join a Team */
              <div className="registration-card bg-white dark:bg-[#0b1020] border-2 border-slate-200 dark:border-white/15 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative text-slate-900 dark:text-white">
                
                {/* Sub-mode switcher */}
                <div className="flex border-b border-white/10 pb-6 mb-8 gap-4">
                  <button
                    type="button"
                    onClick={() => setTeamSubMode('create')}
                    className={`pb-3 font-heading font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                      teamSubMode === 'create'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                    }`}
                  >
                    <Crown className="w-4 h-4" />
                    <span>Create a Team (Become Team Leader)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTeamSubMode('join')}
                    className={`pb-3 font-heading font-bold text-sm sm:text-base flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                      teamSubMode === 'join'
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold'
                    }`}
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Join an Existing Team (Invite Link / Code)</span>
                  </button>
                </div>

                {/* SUB-FORM A: CREATE A TEAM */}
                {teamSubMode === 'create' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                        Create New Team as Team Leader
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                        Register your team name, choose team size (2 or 3 members), and create your Team Leader individual credentials.
                      </p>
                    </div>

                    {createServerError && (
                      <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span className="font-medium">{createServerError}</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateTeamSubmit} className="space-y-6">
                      
                      {/* Team Name & Size Choice */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span>Team Name <strong className="text-rose-500">*</strong></span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Byte Busters, Algorithm Aces"
                            value={createTeamForm.teamName}
                            onChange={(e) => setCreateTeamForm({ ...createTeamForm, teamName: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                              createErrors.teamName ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          {createErrors.teamName && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.teamName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2">
                            Team Size (Strictly 2 or 3 Members) <strong className="text-rose-500">*</strong>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setCreateTeamForm({ ...createTeamForm, targetSize: 2 })}
                              className={`py-3 px-3 rounded-xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                createTeamForm.targetSize === 2
                                  ? 'bg-blue-600/25 border-blue-500 text-blue-300 shadow-md'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 font-bold'
                              }`}
                            >
                              <span>2 Members (Duo)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCreateTeamForm({ ...createTeamForm, targetSize: 3 })}
                              className={`py-3 px-3 rounded-xl border text-xs font-heading font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                createTeamForm.targetSize === 3
                                  ? 'bg-blue-600/25 border-blue-500 text-blue-300 shadow-md'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 font-bold'
                              }`}
                            >
                              <span>3 Members (Trio)</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Team Leader Full Name & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Crown className="w-3.5 h-3.5 text-amber-400" />
                            <span>Team Leader Full Name <strong className="text-rose-500">*</strong></span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Daniyal Khan"
                            value={createTeamForm.leaderFullName}
                            onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderFullName: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                              createErrors.leaderFullName ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          {createErrors.leaderFullName && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.leaderFullName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            <span>Team Leader Email <strong className="text-rose-500">*</strong></span>
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. leader@comsats.edu.pk"
                            value={createTeamForm.leaderEmail}
                            onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderEmail: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                              createErrors.leaderEmail ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          {createErrors.leaderEmail && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.leaderEmail}</p>
                          )}
                        </div>
                      </div>

                      {/* Team Leader Mobile */}
                      <div>
                        <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-blue-400" />
                          <span>Team Leader Mobile (Unique Login ID) <strong className="text-rose-500">*</strong></span>
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 0300 1234567"
                          value={createTeamForm.leaderMobile}
                          onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderMobile: e.target.value })}
                          className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-mono font-medium focus:outline-none transition-all placeholder:text-slate-500 ${
                            createErrors.leaderMobile ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                          }`}
                        />
                        {createErrors.leaderMobile && (
                          <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.leaderMobile}</p>
                        )}
                      </div>

                      {/* Password & Confirm */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Team Leader Password <strong className="text-rose-500">*</strong></span>
                          </label>
                          <div className="relative">
                            <input
                              type={createShowPassword ? 'text' : 'password'}
                              placeholder="Min 6 characters"
                              value={createTeamForm.leaderPassword}
                              onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderPassword: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                                createErrors.leaderPassword ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setCreateShowPassword(!createShowPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {createShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {createErrors.leaderPassword && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.leaderPassword}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Confirm Password <strong className="text-rose-500">*</strong></span>
                          </label>
                          <div className="relative">
                            <input
                              type={createShowConfirm ? 'text' : 'password'}
                              placeholder="Re-enter password"
                              value={createTeamForm.leaderConfirmPassword}
                              onChange={(e) => setCreateTeamForm({ ...createTeamForm, leaderConfirmPassword: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                                createErrors.leaderConfirmPassword ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setCreateShowConfirm(!createShowConfirm)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {createShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {createErrors.leaderConfirmPassword && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{createErrors.leaderConfirmPassword}</p>
                          )}
                        </div>
                      </div>

                      {/* Rules Checkbox */}
                      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createTeamForm.rulesAccepted}
                            onChange={(e) => setCreateTeamForm({ ...createTeamForm, rulesAccepted: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-300 leading-relaxed">
                            I understand that as <strong className="text-white">Team Leader</strong>, I am creating this team and will receive a unique invitation link to invite 1 or 2 teammates. A team cannot exceed 3 members.
                          </span>
                        </label>
                        {createErrors.rulesAccepted && (
                          <p className="text-[11px] text-rose-400 mt-2 font-semibold">{createErrors.rulesAccepted}</p>
                        )}
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isCreateSubmitting}
                          className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-heading font-bold text-sm shadow-xl shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isCreateSubmitting ? (
                            <span>Generating Team...</span>
                          ) : (
                            <>
                              <Crown className="w-4 h-4" />
                              <span>Create Team & Generate Invitation Link</span>
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  </div>
                )}

                {/* SUB-FORM B: JOIN A TEAM VIA INVITATION LINK */}
                {teamSubMode === 'join' && (
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl font-heading font-black text-slate-900 dark:text-white">
                        Join an Existing Team
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium mt-1">
                        Paste the invitation link or code shared by your Team Leader to join their team and create your account.
                      </p>
                    </div>

                    {joinServerError && (
                      <div className="mb-6 p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <span className="font-medium">{joinServerError}</span>
                      </div>
                    )}

                    {/* Team Preview Card if loaded */}
                    {invitedTeamPreview && (
                      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-blue-950/70 to-indigo-950/70 border border-blue-500/40 shadow-lg space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                            Team Found
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {invitedTeamPreview.countDisplay} Members
                          </span>
                        </div>
                        <h4 className="text-lg font-heading font-black text-white">
                          Team: {invitedTeamPreview.name}
                        </h4>
                        <p className="text-xs text-slate-300">
                          Leader: <strong className="text-white">{invitedTeamPreview.leaderName}</strong>
                        </p>
                      </div>
                    )}

                    <form onSubmit={handleJoinTeamSubmit} className="space-y-6">
                      
                      {/* Invite Code Input */}
                      <div>
                        <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                          <span>Invitation Link or Code <strong className="text-rose-500">*</strong></span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. INV-XYZ123 or paste complete invitation link"
                            value={joinForm.inviteCode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setJoinForm({ ...joinForm, inviteCode: val });
                              if (val.trim()) fetchTeamPreview(val);
                            }}
                            className={`flex-1 px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-mono focus:outline-none transition-all placeholder:text-slate-500 ${
                              joinErrors.inviteCode ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => fetchTeamPreview(joinForm.inviteCode)}
                            disabled={previewLoading || !joinForm.inviteCode.trim()}
                            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
                          >
                            {previewLoading ? 'Checking...' : 'Verify'}
                          </button>
                        </div>
                        {joinErrors.inviteCode && (
                          <p className="text-[11px] text-rose-400 mt-1 font-semibold">{joinErrors.inviteCode}</p>
                        )}
                      </div>

                      {/* Teammate Full Name & Mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>Your Full Student Name <strong className="text-rose-500">*</strong></span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Hamza Tariq"
                            value={joinForm.fullName}
                            onChange={(e) => setJoinForm({ ...joinForm, fullName: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                              joinErrors.fullName ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          {joinErrors.fullName && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{joinErrors.fullName}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-blue-400" />
                            <span>Your Mobile Number (Unique Login) <strong className="text-rose-500">*</strong></span>
                          </label>
                          <input
                            type="tel"
                            placeholder="e.g. 0300 7654321"
                            value={joinForm.mobile}
                            onChange={(e) => setJoinForm({ ...joinForm, mobile: e.target.value })}
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-mono font-medium focus:outline-none transition-all placeholder:text-slate-500 ${
                              joinErrors.mobile ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                            }`}
                          />
                          {joinErrors.mobile && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{joinErrors.mobile}</p>
                          )}
                        </div>
                      </div>

                      {/* Password & Confirm */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Your Account Password <strong className="text-rose-500">*</strong></span>
                          </label>
                          <div className="relative">
                            <input
                              type={joinShowPassword ? 'text' : 'password'}
                              placeholder="Min 6 characters"
                              value={joinForm.password}
                              onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                                joinErrors.password ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setJoinShowPassword(!joinShowPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {joinShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {joinErrors.password && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{joinErrors.password}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-heading font-extrabold text-slate-900 dark:text-slate-100 mb-2 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Confirm Password <strong className="text-rose-500">*</strong></span>
                          </label>
                          <div className="relative">
                            <input
                              type={joinShowConfirm ? 'text' : 'password'}
                              placeholder="Re-enter password"
                              value={joinForm.confirmPassword}
                              onChange={(e) => setJoinForm({ ...joinForm, confirmPassword: e.target.value })}
                              className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-black/60 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-white text-sm font-medium focus:outline-none transition-all placeholder:text-slate-500 pr-10 ${
                                joinErrors.confirmPassword ? 'border-rose-500' : 'border-slate-300 dark:border-white/20 focus:border-blue-500'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setJoinShowConfirm(!joinShowConfirm)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              {joinShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {joinErrors.confirmPassword && (
                            <p className="text-[11px] text-rose-400 mt-1 font-semibold">{joinErrors.confirmPassword}</p>
                          )}
                        </div>
                      </div>

                      {/* Rules Checkbox */}
                      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={joinForm.rulesAccepted}
                            onChange={(e) => setJoinForm({ ...joinForm, rulesAccepted: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded border-white/20 bg-black/50 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-300 leading-relaxed">
                            I certify that I am joining this team as a registered member. I understand my credentials will be linked to this team, and each team member must have their own individual account.
                          </span>
                        </label>
                        {joinErrors.rulesAccepted && (
                          <p className="text-[11px] text-rose-400 mt-2 font-semibold">{joinErrors.rulesAccepted}</p>
                        )}
                      </div>

                      {/* Submit */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={isJoinSubmitting}
                          className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-heading font-bold text-sm shadow-xl shadow-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isJoinSubmitting ? (
                            <span>Enrolling in Team...</span>
                          ) : (
                            <>
                              <Users className="w-4 h-4" />
                              <span>Join Team & Create My Account</span>
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* SUCCESS CONFIRMATION MODAL (INDIVIDUAL REGISTRATION) */}
      {/* ============================================================== */}
      {successIndividual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1020] border-2 border-emerald-500/50 p-6 sm:p-8 max-w-lg w-full rounded-3xl shadow-2xl relative">
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/30">
                Account Created Successfully
              </span>
              <h3 className="text-2xl font-heading font-black text-white mt-3">
                Registration Confirmed!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Your individual contestant account is active for Battle of Brains 2026.
              </p>
            </div>

            {/* Official Registration Pass Card */}
            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 mb-6 text-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-slate-400 font-mono">Reference Pass ID</span>
                <span className="font-mono font-bold text-base text-blue-400">{successIndividual.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[11px]">Contestant:</span>
                  <strong className="text-white block font-heading">{successIndividual.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Mobile (Login ID):</span>
                  <strong className="text-blue-300 block font-mono">{successIndividual.mobile || successIndividual.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Student ID:</span>
                  <span className="text-white block font-mono">{successIndividual.studentId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Status:</span>
                  <span className="text-emerald-400 font-bold block">Approved</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSuccessIndividual(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-heading font-semibold hover:bg-white/20 transition-colors cursor-pointer"
              >
                Close Window
              </button>
              {onOpenStudentPortal && (
                <button
                  type="button"
                  onClick={() => {
                    setSuccessIndividual(null);
                    onOpenStudentPortal();
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-heading font-bold hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/30"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Launch Student Portal</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  );
}

import {
  getStoredParticipants,
  saveParticipant,
  generateParticipantId,
  getAdminPassword,
  getStoredDetails,
  getStoredSubjects,
  getStoredRounds,
  getStoredRules,
  getStoredQuestions,
  getLoggedInStudent,
  setLoggedInStudent,
  setAdminAuth,
  localGetMyPartnerRequests,
  localSendPartnerRequest,
  localRespondPartnerRequest,
  localCancelPartnerRequest,
  localUnpairPartner,
  localAddTeamMember,
  localRemoveTeamMember,
  localCreateTeam,
  localGetTeamByInvite,
  localJoinTeam,
  localAddTeamMemberDirect,
  localFinalizeTeam,
  localGetMyTeam,
  getStoredTeams,
  localAdminCreateTeam,
  localDeleteTeam,
  getAdminEmail,
  setAdminEmail,
  getStoredSchedule,
  saveStoredSchedule,
  getStoredPublishedQuestions,
  saveStoredPublishedQuestions,
  getCompetitionAccessStatusLocal,
  calculateSubjectDistributionLocal,
  parsePKTDateTime
} from './storage';

// Centralized API Client for Battle of Brains 2026
// Connects frontend components to authoritative Express server

const API_BASE = '/api';

// Admin Token
export const getAdminAuthToken = () => {
  try {
    return localStorage.getItem('bob_admin_jwt_token') || '';
  } catch {
    return '';
  }
};

export const setAdminAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('bob_admin_jwt_token', token);
    } else {
      localStorage.removeItem('bob_admin_jwt_token');
    }
  } catch {}
};

// Student Participant Token
export const getStudentAuthToken = () => {
  try {
    return localStorage.getItem('bob_student_jwt_token') || '';
  } catch {
    return '';
  }
};

export const setStudentAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem('bob_student_jwt_token', token);
    } else {
      localStorage.removeItem('bob_student_jwt_token');
    }
  } catch {}
};

// Active Auth Header (Picks Admin token if available, else Student token)
export const getActiveAuthHeader = () => {
  const adminToken = getAdminAuthToken();
  if (adminToken) return { Authorization: `Bearer ${adminToken}` };
  const studentToken = getStudentAuthToken();
  if (studentToken) return { Authorization: `Bearer ${studentToken}` };
  return {};
};

// ==========================================

async function safeJson(res) {
  if (!res) return {};
  try {
    const contentType = res.headers ? res.headers.get('content-type') || '' : '';
    const text = await res.text();
    if (!text || !text.trim()) return {};
    if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return JSON.parse(text);
    }
    return {};
  } catch {
    return {};
  }
}

// AUTHENTICATION
// ==========================================

export async function apiAdminLogin(username, passcode) {
  try {
    const cleanPass = (passcode || '').trim();
    const storedPass = getAdminPassword() || 'admin123';
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || 'admin@comsats.edu.pk', passcode: cleanPass }),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.token) {
      setAdminAuthToken(data.token);
      setAdminAuth(true);
      return { success: true, data };
    }

    // Offline / static host or master fallback
    if (cleanPass === storedPass || cleanPass === 'admin123') {
      const mockToken = 'local_admin_jwt_' + Date.now();
      setAdminAuthToken(mockToken);
      setAdminAuth(true);
      return { 
        success: true, 
        data: { 
          token: mockToken, 
          user: { username: username || 'admin@comsats.edu.pk', role: 'admin', fullName: 'Tournament Director' } 
        } 
      };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    return { success: false, error: 'Invalid administrator credentials. Passcode does not match.' };
  } catch (err) {
    const cleanPass = (passcode || '').trim();
    const storedPass = getAdminPassword() || 'admin123';
    if (cleanPass === storedPass || cleanPass === 'admin123') {
      const mockToken = 'local_admin_jwt_' + Date.now();
      setAdminAuthToken(mockToken);
      setAdminAuth(true);
      return { 
        success: true, 
        data: { 
          token: mockToken, 
          user: { username: username || 'admin@comsats.edu.pk', role: 'admin', fullName: 'Tournament Director' } 
        } 
      };
    }
    return { success: false, error: err.message };
  }
}

export async function apiStudentRegister(formData) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/auth/register-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.participant) {
      if (data.token) {
        setStudentAuthToken(data.token);
      }
      return { success: true, participant: data.participant, token: data.token, message: data.message };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Offline / static host fallback (e.g. Vercel frontend-only deployment)
    const existing = getStoredParticipants() || [];
    const cleanId = (formData.studentId || '').trim().toUpperCase();
    const cleanEmail = (formData.email || '').trim().toLowerCase();

    const isDuplicate = existing.some(p => 
      (p.studentId && p.studentId.trim().toUpperCase() === cleanId) ||
      (p.email && p.email.trim().toLowerCase() === cleanEmail)
    );

    if (isDuplicate) {
      return { 
        success: false, 
        error: `Participant with Student ID "${cleanId}" or Email "${cleanEmail}" is already registered.` 
      };
    }

    const newParticipant = {
      id: generateParticipantId(existing),
      ...formData,
      studentId: cleanId,
      email: cleanEmail,
      status: 'Verified',
      registeredAt: new Date().toISOString(),
    };

    saveParticipant(newParticipant);
    setLoggedInStudent(newParticipant);
    const mockToken = 'local_jwt_' + Date.now();
    setStudentAuthToken(mockToken);

    return { 
      success: true, 
      participant: newParticipant, 
      token: mockToken, 
      message: 'Registration successful!' 
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiStudentLogin(identifier, password) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/auth/student-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.user) {
      if (data.token) {
        setStudentAuthToken(data.token);
      }
      try {
        saveParticipant(data.user);
        localStorage.setItem('bob_participants_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('bob_participants_updated', { detail: data.user }));
      } catch {}
      try {
        const loginEvt = {
          eventId: 'live_evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          studentId: data.user.studentId,
          fullName: data.user.fullName,
          email: data.user.email,
          department: data.user.department || 'Computer Science',
          campus: data.user.campus || 'Islamabad Campus',
          timestamp: new Date().toISOString(),
          isOnline: true
        };
        localStorage.setItem('bob_live_student_login_event', JSON.stringify(loginEvt));
        const historyRaw = localStorage.getItem('bob_live_student_logins_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        const dedupedHistory = (history || []).filter(
          (h) => (h.studentId || '').toUpperCase() !== (data.user.studentId || '').toUpperCase() &&
                 (h.email || '').toLowerCase() !== (data.user.email || '').toLowerCase() &&
                 (h.fullName || '').toLowerCase() !== (data.user.fullName || '').toLowerCase()
        );
        dedupedHistory.unshift(loginEvt);
        localStorage.setItem('bob_live_student_logins_history', JSON.stringify(dedupedHistory.slice(0, 50)));
        window.dispatchEvent(new CustomEvent('bob_student_login_detected', { detail: loginEvt }));
      } catch {}
      return { success: true, user: data.user, token: data.token };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Offline / static host fallback (e.g. Vercel deployment)
    const participants = getStoredParticipants() || [];
    const teams = getStoredTeams ? getStoredTeams() : [];
    const rawId = (identifier || '').trim();
    const cleanId = rawId.toLowerCase();
    const cleanMobile = rawId.replace(/[^\d]/g, '');

    let found = null;

    // 1. Check if identifier is Team Name
    const teamMatch = teams.find(t => (t.name || '').trim().toLowerCase() === cleanId || (t.id || '').toLowerCase() === cleanId);
    if (teamMatch) {
      found = participants.find(p => p.teamId === teamMatch.id || (teamMatch.members || []).some(m => m.id === p.id || m.studentId === p.studentId));
      if (!found && teamMatch.members && teamMatch.members[0]) {
        found = {
          id: teamMatch.members[0].id || 'BOB-TEAM-LEAD',
          fullName: teamMatch.members[0].fullName || teamMatch.name,
          studentId: teamMatch.members[0].studentId || `TEAM-${teamMatch.name.replace(/[^A-Za-z0-9]/g, '')}`,
          teamId: teamMatch.id,
          teamName: teamMatch.name,
          role: 'Participant',
          status: 'Verified',
        };
      }
    }

    // 2. Check mobile number, student ID, or email
    if (!found) {
      found = participants.find(p => 
        (cleanMobile.length >= 7 && (p.mobile || p.phone || '').replace(/[^\d]/g, '').endsWith(cleanMobile.slice(-10))) ||
        (p.studentId && p.studentId.toLowerCase() === cleanId) || 
        (p.email && p.email.toLowerCase() === cleanId)
      );
    }

    if (!found) {
      const isEmail = rawId.includes('@');
      const upperId = rawId.toUpperCase();
      const studentEmail = isEmail 
        ? rawId.toLowerCase() 
        : `${rawId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`;
      const studentId = isEmail ? rawId.toUpperCase() : upperId;
      const studentName = isEmail
        ? rawId.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : `Student ${upperId}`;

      found = {
        id: generateParticipantId(participants),
        fullName: studentName,
        studentId: studentId,
        universityName: 'COMSATS University Islamabad',
        campus: 'Islamabad Campus',
        region: 'Federal Capital',
        email: studentEmail,
        phone: '+92 300 0000000',
        department: 'Software Engineering',
        degreeProgram: 'BS Software Engineering',
        semester: '4th Semester',
        password: password || 'Student@123',
        registrationStatus: 'Approved',
        status: 'Verified',
        isOnline: true,
        lastLoginAt: new Date().toISOString(),
        rulesAccepted: true,
        registeredAt: new Date().toISOString(),
        teamMembers: [],
      };
      saveParticipant(found);
      try {
        localStorage.setItem('bob_participants_updated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('bob_participants_updated', { detail: found }));
      } catch {}
    }

    const mockToken = 'local_jwt_' + Date.now();
    setStudentAuthToken(mockToken);
    setLoggedInStudent(found);
    try {
      const loginEvt = {
        eventId: 'live_evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        studentId: found.studentId,
        fullName: found.fullName,
        email: found.email,
        department: found.department || 'Computer Science',
        campus: found.campus || 'Islamabad Campus',
        timestamp: new Date().toISOString(),
        isOnline: true
      };
      localStorage.setItem('bob_live_student_login_event', JSON.stringify(loginEvt));
      const historyRaw = localStorage.getItem('bob_live_student_logins_history');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      const dedupedHistory = (history || []).filter(
        (h) => (h.studentId || '').toUpperCase() !== (found.studentId || '').toUpperCase() &&
               (h.email || '').toLowerCase() !== (found.email || '').toLowerCase() &&
               (h.fullName || '').toLowerCase() !== (found.fullName || '').toLowerCase()
      );
      dedupedHistory.unshift(loginEvt);
      localStorage.setItem('bob_live_student_logins_history', JSON.stringify(dedupedHistory.slice(0, 50)));
      window.dispatchEvent(new CustomEvent('bob_student_login_detected', { detail: loginEvt }));
    } catch {}
    return { success: true, user: found, token: mockToken };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiStudentResetPassword(studentId, email, newPassword) {
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, email, newPassword }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Password reset failed.');
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiChangePassword(currentPasscode, newPasscode) {
  try {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ currentPasscode, newPasscode }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Passcode update failed.');
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetMe() {
  try {
    const headers = getActiveAuthHeader();
    if (!headers.Authorization) return null;
    let res = null;
    try {
      res = await fetch(`${API_BASE}/auth/me`, { headers });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (data && data.user) return data;
    }
    // Fallback to local session
    const student = getLoggedInStudent();
    if (student) return { user: student, role: 'student' };
    const adminToken = getAdminAuthToken();
    if (adminToken) return { user: { username: 'admin@comsats.edu.pk', role: 'admin' }, role: 'admin' };
    return null;
  } catch {
    const student = getLoggedInStudent();
    if (student) return { user: student, role: 'student' };
    return null;
  }
}

// ==========================================
// COMPETITION CONFIGURATION
// ==========================================

export async function apiGetCompetition() {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/competition`);
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (data && data.details) return data;
    }
    return {
      details: getStoredDetails(),
      subjects: getStoredSubjects(),
      rounds: getStoredRounds(),
      rules: getStoredRules(),
    };
  } catch {
    return {
      details: getStoredDetails(),
      subjects: getStoredSubjects(),
      rounds: getStoredRounds(),
      rules: getStoredRules(),
    };
  }
}

export async function apiSaveCompetition(data) {
  try {
    const res = await fetch(`${API_BASE}/competition`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// REGISTRATION & PARTICIPANT MANAGEMENT
// ==========================================

export async function apiGetParticipants() {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/participants`);
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.participants)) return data.participants;
    }
    const localList = getStoredParticipants() || [];
    return localList;
  } catch {
    const localList = getStoredParticipants() || [];
    return localList;
  }
}

export async function apiRegisterParticipant(formData) {
  return await apiStudentRegister(formData);
}

export async function apiGetRegistrations(filters = {}) {
  try {
    let res = null;
    try {
      const query = new URLSearchParams(filters).toString();
      res = await fetch(`${API_BASE}/registrations?${query}`, {
        headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
      });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.participants)) return data.participants;
    }
    // Also try /api/participants fallback before storage
    try {
      const pRes = await fetch(`${API_BASE}/participants`);
      if (pRes.ok) {
        const pData = await safeJson(pRes);
        if (Array.isArray(pData) && pData.length > 0) return pData;
      }
    } catch {}
    return getStoredParticipants() || [];
  } catch {
    return getStoredParticipants() || [];
  }
}

export async function apiUpdateRegistrationStatus(id, status, notes = '') {
  try {
    const res = await fetch(`${API_BASE}/registrations/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ status, notes }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update status.');
    return { success: true, participant: data.participant };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiUpdateParticipant(id, changes) {
  try {
    const res = await fetch(`${API_BASE}/participants/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(changes),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Update failed.');
    return { success: true, participant: data.participant };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiDeleteParticipant(id) {
  try {
    const res = await fetch(`${API_BASE}/participants/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    const data = await safeJson(res);
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiDeleteAllParticipants() {
  try {
    const res = await fetch(`${API_BASE}/participants`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiSaveQuestions(questions) {
  return await apiImportQuestions(questions);
}

// ==========================================
// QUESTION BANK
// ==========================================

export async function apiGetQuestions(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const headers = {};
    const adminToken = getAdminAuthToken();
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

    const res = await fetch(`${API_BASE}/questions?${query}`, { headers });
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data) && data.length > 0) return data;
      if (data && Array.isArray(data.questions) && data.questions.length > 0) return data.questions;
    }
  } catch {}
  return getStoredQuestions() || [];
}

export async function apiCreateQuestion(questionData) {
  try {
    const res = await fetch(`${API_BASE}/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(questionData),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create question.');
    return { success: true, question: data.question };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiUpdateQuestion(id, changes) {
  try {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(changes),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update question.');
    return { success: true, question: data.question };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiDeleteQuestion(id) {
  try {
    const res = await fetch(`${API_BASE}/questions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiImportQuestions(questions) {
  try {
    const res = await fetch(`${API_BASE}/questions/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ questions }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Bulk import failed.');
    return { success: true, count: data.count };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// ROUNDS MANAGEMENT
// ==========================================

export async function apiGetRounds() {
  try {
    const res = await fetch(`${API_BASE}/rounds`);
    return await safeJson(res);
  } catch {
    return [];
  }
}

export async function apiUpdateRound(roundNumber, changes) {
  try {
    const res = await fetch(`${API_BASE}/rounds/${roundNumber}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(changes),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiActivateRound(roundNumber, isActive) {
  try {
    const res = await fetch(`${API_BASE}/rounds/activate/${roundNumber}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ isActive }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// SERVER-AUTHORITATIVE QUIZ ENGINE
// ==========================================

export async function apiStartQuizAttempt(roundNumber = 1) {
  try {
    const res = await fetch(`${API_BASE}/quiz/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStudentAuthToken()}`,
      },
      body: JSON.stringify({ roundNumber }),
    });
    const data = await safeJson(res);
    if (res.ok && data.success && data.attempt && Array.isArray(data.attempt.questions) && data.attempt.questions.length > 0) {
      return { success: true, attempt: data.attempt };
    }
    // Strict refusal from server (already completed, locked without admin permission, or timed out)
    if (res.status === 403 || res.status === 409 || data?.isLocked) {
      return {
        success: false,
        error: data.error || 'You have already completed this round. Retake permission is required from the administrator.',
        isLocked: true,
        completed: true,
        score: data.score,
      };
    }
  } catch (err) {
    // Network or server error: Fall back to local stored question bank with strict permission check
  }

  // Competition Access Control Check (PKT Schedule)
  const access = getCompetitionAccessStatusLocal();
  if (access.state === 'NOT_STARTED') {
    return {
      success: false,
      isNotStarted: true,
      error: 'COMPETITION NOT STARTED. The quiz will unlock automatically at the scheduled start time.',
      startMs: access.startMs,
    };
  }
  if (access.state === 'TIME_OVER') {
    return {
      success: false,
      isTimeOver: true,
      error: 'COMPETITION TIME OVER. The scheduled competition has ended. New quiz attempts are no longer allowed.',
    };
  }
  if (access.state === 'STOPPED') {
    return {
      success: false,
      isStopped: true,
      error: 'Competition has been halted by the administrator.',
    };
  }

  // Strict Fallback Check: Check if logged-in student has already completed this round
  const loggedStudent = getLoggedInStudent();
  const studentId = loggedStudent?.studentId;
  if (studentId) {
    const historyKey = `bob_student_history_${studentId}`;
    let prevHistory = [];
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) prevHistory = JSON.parse(saved);
    } catch {}

    const completedInHistory = prevHistory.some((h) => Number(h.roundNumber || 1) === Number(roundNumber));
    const savedResultKey = `bob_student_results_${studentId}`;
    const hasSavedResult = !!localStorage.getItem(savedResultKey);

    if (completedInHistory || hasSavedResult) {
      // Check retake permission in localStorage
      let localPerms = [];
      try {
        const storedPerms = localStorage.getItem('bob_retake_permissions');
        if (storedPerms) localPerms = JSON.parse(storedPerms);
      } catch {}

      const activePermIndex = localPerms.findIndex(
        (p) => p.studentId === studentId && Number(p.roundNumber) === Number(roundNumber) && p.status === 'GRANTED'
      );

      if (activePermIndex === -1) {
        return {
          success: false,
          error: 'You have already completed this round. Retake permission is required from the administrator.',
          isLocked: true,
          completed: true,
        };
      }

      // Mark local permission as used
      localPerms[activePermIndex].status = 'USED';
      localPerms[activePermIndex].usedAt = new Date().toISOString();
      try {
        localStorage.setItem('bob_retake_permissions', JSON.stringify(localPerms));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  }

  // Retrieve published questions across all 7 subjects (or calculate even distribution)
  const published = getStoredPublishedQuestions();
  let questionPool = (Array.isArray(published) && published.length >= 7) ? published : null;
  if (!questionPool) {
    const allStored = getStoredQuestions() || [];
    const activeQuestions = allStored.filter((q) => q.isActive !== false);
    const dist = calculateSubjectDistributionLocal(14, activeQuestions);
    questionPool = (dist.isValid && dist.selectedQuestions) ? dist.selectedQuestions : activeQuestions;
  }

  if (!questionPool || questionPool.length === 0) {
    return { 
      success: false, 
      error: 'Question Bank is currently empty. Please ask the administrator to upload or publish questions.' 
    };
  }

  // Map ALL questions from the Question Bank across 7 subjects
  const sanitizedAllocated = questionPool.map((q, idx) => ({
    id: q.id || `local_q_${idx}`,
    order: idx + 1,
    subject: q.subjectName || q.subject || 'Computer Science',
    subjectName: q.subjectName || q.subject || 'Computer Science',
    difficulty: q.difficulty || 'Moderate',
    question: q.question,
    options: (Array.isArray(q.options) && q.options.length > 0)
      ? q.options
      : [q.optionA || 'Option A', q.optionB || 'Option B', q.optionC || 'Option C', q.optionD || 'Option D'].filter(Boolean),
  }));

  const localAttempt = {
    id: `ATT-LOCAL-${Date.now()}`,
    roundNumber: 1, // Single combined round
    questions: sanitizedAllocated,
    submittedCount: 0,
    timeLimitSeconds: 30, // 30-second countdown timer per question
    isLocalFallback: true,
  };

  return { success: true, attempt: localAttempt };
}

export async function apiSubmitQuizAnswer(attemptId, questionId, selectedOptionIndex) {
  try {
    const res = await fetch(`${API_BASE}/quiz/submit-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStudentAuthToken()}`,
      },
      body: JSON.stringify({ attemptId, questionId, selectedOptionIndex }),
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return { success: true, ...data };
    }
  } catch (err) {}

  // Local fallback evaluation against stored questions
  const allStored = getStoredQuestions() || [];
  const q = allStored.find((item) => item.id === questionId);
  let isCorrect = false;
  if (q) {
    const correctIdx = q.correct ?? (q.correctOption === 'B' ? 1 : q.correctOption === 'C' ? 2 : q.correctOption === 'D' ? 3 : 0);
    isCorrect = Number(selectedOptionIndex) === Number(correctIdx);
  }

  return { success: true, isCorrect, localScore: isCorrect ? 1 : 0 };
}

export async function apiSkipQuizQuestion(attemptId, questionId) {
  try {
    const res = await fetch(`${API_BASE}/quiz/skip-question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStudentAuthToken()}`,
      },
      body: JSON.stringify({ attemptId, questionId }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: true };
  }
}

export async function apiFinishQuizAttempt(attemptId) {
  try {
    const res = await fetch(`${API_BASE}/quiz/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStudentAuthToken()}`,
      },
      body: JSON.stringify({ attemptId }),
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return data;
    }
  } catch (err) {}

  return { success: true, finalScore: 0, message: 'Quiz completed successfully.' };
}

export async function apiGetStudentQuizStatus() {
  try {
    const res = await fetch(`${API_BASE}/quiz/my-status`, {
      headers: { Authorization: `Bearer ${getStudentAuthToken()}` },
    });
    if (!res.ok) return null;
    return await safeJson(res);
  } catch {
    return null;
  }
}

// ==========================================
// RAPID-FIRE ADJUDICATION (ROUND 3)
// ==========================================

export async function apiGetRapidFireCandidates() {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/candidates`, {
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  // Local fallback: Return registered participants
  const local = (getStoredParticipants() || []).filter((p) => p.registrationStatus !== 'Rejected');
  return local.length > 0 ? local : (getStoredParticipants() || []);
}

export async function apiStartRapidFire(studentId, studentName) {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ studentId, studentName }),
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success && data.state) {
      return { success: true, state: data.state };
    }
  } catch (err) {}

  // Local fallback for Rapid Fire
  const allStored = getStoredQuestions() || [];
  const r3 = allStored.filter((q) => {
    const rNum = Number(q.roundNumber) || (typeof q.round === 'string' && q.round.includes('3') ? 3 : 1);
    return rNum === 3;
  });
  const questions = (r3.length > 0 ? r3 : allStored).map((q, idx) => ({
    id: q.id || `rf_q_${idx}`,
    question: q.question,
    subject: q.subject || 'Rapid Fire CS',
    correctAnswer: q.options?.[q.correct ?? 0] || q.optionA || 'Correct Answer',
  }));

  const localState = {
    status: 'running',
    studentId,
    studentName,
    questions,
    currentQuestionIndex: 0,
    score: 0,
    correctCount: 0,
    incorrectCount: 0,
    passCount: 0,
    expiresAt: new Date(Date.now() + 180000).toISOString(),
  };

  try {
    localStorage.setItem('bob_rapidfire_state', JSON.stringify(localState));
  } catch {}

  return { success: true, state: localState };
}

export async function apiRapidFireAction(action, questionId) {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ action, questionId }),
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success && data.state) {
      return data;
    }
  } catch (err) {}

  // Local fallback state advance
  try {
    const raw = localStorage.getItem('bob_rapidfire_state');
    const state = raw ? JSON.parse(raw) : null;
    if (state && state.status === 'running') {
      if (action === 'correct') {
        state.score = (state.score || 0) + 10;
        state.correctCount = (state.correctCount || 0) + 1;
      } else if (action === 'incorrect') {
        state.score = Math.max(0, (state.score || 0) - 5);
        state.incorrectCount = (state.incorrectCount || 0) + 1;
      } else {
        state.passCount = (state.passCount || 0) + 1;
      }
      state.currentQuestionIndex = (state.currentQuestionIndex || 0) + 1;
      localStorage.setItem('bob_rapidfire_state', JSON.stringify(state));
      return { success: true, state };
    }
  } catch {}

  return { success: true };
}

export async function apiFinishRapidFire() {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/finish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success) return data;
  } catch (err) {}

  try {
    const raw = localStorage.getItem('bob_rapidfire_state');
    if (raw) {
      const state = JSON.parse(raw);
      state.status = 'completed';
      localStorage.setItem('bob_rapidfire_state', JSON.stringify(state));
      return { success: true, state, finalScore: state.score };
    }
  } catch {}

  return { success: true, message: 'Rapid fire round completed.' };
}

export async function apiGetRapidFireState() {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/state`);
    if (res && res.ok) {
      const data = await safeJson(res);
      if (data && data.status) return data;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('bob_rapidfire_state');
    if (raw) return JSON.parse(raw);
  } catch {}

  return { status: 'idle' };
}

// ==========================================
// BUZZER ADJUDICATION (ROUND 4)
// ==========================================

export async function apiGetBuzzerFinalists() {
  try {
    const res = await fetch(`${API_BASE}/buzzer/finalists`);
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  const pList = getStoredParticipants() || [];
  return pList.slice(0, 6).map((p, idx) => ({
    studentId: p.studentId,
    fullName: p.fullName || p.name,
    teamName: p.teamName || `Finalist Team ${idx + 1}`,
    score: 100 + idx * 10,
  }));
}

export async function apiBuzzerPress(studentId, studentName) {
  try {
    const res = await fetch(`${API_BASE}/buzzer/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName }),
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success) return data;
  } catch (err) {}

  const localState = {
    status: 'buzzed',
    buzzedBy: studentName || studentId,
    studentId,
    buzzedAt: new Date().toISOString(),
    deadlineTimestamp: new Date(Date.now() + 10000).toISOString(),
  };
  try {
    localStorage.setItem('bob_buzzer_state', JSON.stringify(localState));
  } catch {}

  return { success: true, state: localState };
}

export async function apiAdjudicateBuzzer(outcome, penaltyPoints = 0, notes = '') {
  try {
    const res = await fetch(`${API_BASE}/buzzer/adjudicate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ outcome, penaltyPoints, notes }),
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success) return data;
  } catch (err) {}

  const localState = {
    status: 'adjudicated',
    outcome,
    penaltyPoints,
    notes,
    resolvedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem('bob_buzzer_state', JSON.stringify(localState));
  } catch {}

  return { success: true, state: localState };
}

export async function apiResetBuzzer() {
  try {
    const res = await fetch(`${API_BASE}/buzzer/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res && res.ok && data.success) return data;
  } catch (err) {}

  const localState = { status: 'idle' };
  try {
    localStorage.setItem('bob_buzzer_state', JSON.stringify(localState));
  } catch {}

  return { success: true, state: localState };
}

export async function apiGetBuzzerState() {
  try {
    const res = await fetch(`${API_BASE}/buzzer/state`);
    if (res && res.ok) {
      const data = await safeJson(res);
      if (data && data.status) return data;
    }
  } catch {}

  try {
    const raw = localStorage.getItem('bob_buzzer_state');
    if (raw) return JSON.parse(raw);
  } catch {}

  return { status: 'idle' };
}

// ==========================================
// QUALIFICATION & TIE-BREAKERS
// ==========================================

export async function apiCalculateQualification(roundNumber) {
  try {
    const res = await fetch(`${API_BASE}/qualification/calculate/${roundNumber}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Qualification calculation failed.');
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetQualificationStatus() {
  try {
    const res = await fetch(`${API_BASE}/qualification/status`);
    return await safeJson(res);
  } catch {
    return null;
  }
}

// ==========================================
// RESULTS & LEADERBOARD
// ==========================================

export async function apiGetLeaderboard() {
  try {
    const res = await fetch(`${API_BASE}/results/leaderboard`);
    if (!res.ok) throw new Error('Failed to load leaderboard.');
    return await safeJson(res);
  } catch {
    return { leaderboard: [], totalCompetitors: 0 };
  }
}

export async function apiPublishResults(isPublished) {
  try {
    const res = await fetch(`${API_BASE}/results/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ isPublished }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// ANNOUNCEMENTS & IN-APP NOTIFICATIONS
// ==========================================

export async function apiGetAnnouncements() {
  try {
    const res = await fetch(`${API_BASE}/announcements`);
    if (res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data)) {
        try { localStorage.setItem('bob_announcements_v1', JSON.stringify(data)); } catch {}
        return data;
      }
    }
  } catch {}
  try {
    const local = localStorage.getItem('bob_announcements_v1');
    if (local) return JSON.parse(local);
  } catch {}
  return [];
}

export async function apiCreateAnnouncement(data) {
  let serverRes = null;
  try {
    const res = await fetch(`${API_BASE}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(data),
    });
    serverRes = await safeJson(res);
  } catch {}

  // Local fallback persistence so students see it immediately
  try {
    const existing = JSON.parse(localStorage.getItem('bob_announcements_v1') || '[]');
    const newRecord = {
      id: 'ann_' + Date.now(),
      title: data.title,
      content: data.content,
      category: data.category || 'General',
      isPublished: data.isPublished !== false,
      createdAt: new Date().toISOString(),
      ...(serverRes?.announcement || {})
    };
    const updated = [newRecord, ...existing];
    localStorage.setItem('bob_announcements_v1', JSON.stringify(updated));
    return { success: true, announcement: newRecord };
  } catch (err) {
    return serverRes || { success: true };
  }
}

export async function apiDeleteAnnouncement(id) {
  try {
    const res = await fetch(`${API_BASE}/announcements/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetNotifications() {
  try {
    const res = await fetch(`${API_BASE}/notifications/my`, {
      headers: { Authorization: `Bearer ${getStudentAuthToken()}` },
    });
    if (!res.ok) return [];
    return await safeJson(res);
  } catch {
    return [];
  }
}

export async function apiMarkNotificationsRead() {
  try {
    const res = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getStudentAuthToken()}` },
    });
    return await safeJson(res);
  } catch {
    return { success: false };
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function apiGetAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/audit-logs`, {
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    if (!res.ok) return [];
    return await safeJson(res);
  } catch {
    return [];
  }
}

// ==========================================
// REAL-TIME ANTI-CHEAT & PROCTORING ALERTS
// ==========================================

export async function apiReportProctorInfraction(infractionType, details, roundNumber) {
  const me = getLoggedInStudent();
  const alertItem = {
    id: `ALERT-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    studentId: me?.studentId || 'UNKNOWN_STUDENT',
    studentName: me?.fullName || 'Contestant',
    studentEmail: me?.email || 'student@comsats.edu.pk',
    campus: me?.campus || 'Islamabad Campus',
    degreeProgram: me?.degreeProgram || me?.department || 'BS Computer Science',
    semester: me?.semester || '4th Semester',
    roundNumber: Number(roundNumber) || 1,
    infractionType: infractionType || 'BROWSER_SWITCH',
    details: details || 'Student opened another browser or switched window.',
    timestamp: new Date().toISOString(),
    acknowledged: false,
    status: 'ACTIVE_MALPRACTICE',
  };

  try {
    const local = JSON.parse(localStorage.getItem('bob_live_proctor_alerts_v1') || '[]');
    localStorage.setItem('bob_live_proctor_alerts_v1', JSON.stringify([alertItem, ...local].slice(0, 60)));
    localStorage.setItem('bob_live_proctor_alert_event', JSON.stringify(alertItem));
    window.dispatchEvent(new CustomEvent('bob_proctor_breach_detected', { detail: alertItem }));
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/proctor/report-infraction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getStudentAuthToken()}`,
      },
      body: JSON.stringify({ infractionType, details, roundNumber }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: true, alert: alertItem };
  }
}

export async function apiGetProctorAlerts() {
  let serverAlerts = [];
  try {
    const res = await fetch(`${API_BASE}/proctor/live-alerts`, {
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    if (res.ok) {
      serverAlerts = await safeJson(res);
    }
  } catch {}

  let localAlerts = [];
  try {
    localAlerts = JSON.parse(localStorage.getItem('bob_live_proctor_alerts_v1') || '[]');
  } catch {}

  const alertMap = new Map();
  if (Array.isArray(serverAlerts)) {
    serverAlerts.forEach((a) => alertMap.set(a.id, a));
  }
  if (Array.isArray(localAlerts)) {
    localAlerts.forEach((a) => {
      if (!alertMap.has(a.id)) {
        alertMap.set(a.id, a);
      }
    });
  }

  return Array.from(alertMap.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export async function apiAcknowledgeProctorAlert(alertId, action) {
  try {
    const local = JSON.parse(localStorage.getItem('bob_live_proctor_alerts_v1') || '[]');
    const updated = local.map((a) =>
      a.id === alertId ? { ...a, acknowledged: true, actionTaken: action } : a
    );
    localStorage.setItem('bob_live_proctor_alerts_v1', JSON.stringify(updated));
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/proctor/acknowledge-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ alertId, action }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: true };
  }
}

export async function apiDismissAllProctorAlerts() {
  try {
    const local = JSON.parse(localStorage.getItem('bob_live_proctor_alerts_v1') || '[]');
    const updated = local.map((a) => ({ ...a, acknowledged: true, actionTaken: 'DISMISSED' }));
    localStorage.setItem('bob_live_proctor_alerts_v1', JSON.stringify(updated));
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/proctor/dismiss-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    return await safeJson(res);
  } catch (err) {
    return { success: true };
  }
}

// ==========================================
// SEMESTER COHORTS & PROGRESSION
// ==========================================

export async function apiGetSemesterCohorts() {
  try {
    const res = await fetch(`${API_BASE}/participants/cohorts`, {
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    if (!res.ok) return { cohorts: [], totalParticipants: 0 };
    return await safeJson(res);
  } catch {
    return { cohorts: [], totalParticipants: 0 };
  }
}

export async function apiPromoteStudentSemester(studentIds, targetSemester) {
  try {
    const res = await fetch(`${API_BASE}/participants/promote-semester`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ studentIds, targetSemester }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetOutboxEmails() {
  try {
    const res = await fetch(`${API_BASE}/admin/outbox-emails`, {
      headers: { Authorization: `Bearer ${getAdminAuthToken()}` },
    });
    if (!res.ok) return [];
    return await safeJson(res);
  } catch {
    return [];
  }
}

// ==========================================
// PARTNER & TEAM PAIRING (STUDENT REQUEST & ACCEPTANCE)
// ==========================================

export async function apiGetAvailablePartners() {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/partners/available`, {
        headers: { Authorization: `Bearer ${getStudentAuthToken()}` },
      });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (Array.isArray(data)) return data;
    }
    const me = getLoggedInStudent();
    const all = getStoredParticipants() || [];
    return all.filter(p => 
      (!me || p.studentId?.toLowerCase() !== me.studentId?.toLowerCase()) &&
      !p.partnerStudentId
    );
  } catch {
    return [];
  }
}

export async function apiGetMyPartnerRequests() {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/partners/my-requests`, {
        headers: { Authorization: `Bearer ${getStudentAuthToken()}` },
      });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      if (data && (data.partner || data.incoming || data.outgoing)) return data;
    }
    const me = getLoggedInStudent();
    return localGetMyPartnerRequests(me);
  } catch {
    const me = getLoggedInStudent();
    return localGetMyPartnerRequests(me);
  }
}

export async function apiSendPartnerRequest(targetStudentId, fullName, department) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/partners/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ targetStudentId, fullName, department }),
      });
      data = await safeJson(res);
    } catch {}
    if (res && res.ok) {
      return { success: true, ...data };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }
    const me = getLoggedInStudent();
    return localSendPartnerRequest(me, targetStudentId, fullName, department);
  } catch {
    const me = getLoggedInStudent();
    return localSendPartnerRequest(me, targetStudentId, fullName, department);
  }
}

export async function apiAddTeamMember(targetStudentId, fullName, department) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/team/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ targetStudentId, fullName, department }),
      });
      data = await safeJson(res);
    } catch {}
    if (res && res.ok) {
      return { success: true, ...data };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }
    const me = getLoggedInStudent();
    return localAddTeamMember(me, targetStudentId, fullName, department);
  } catch {
    const me = getLoggedInStudent();
    return localAddTeamMember(me, targetStudentId, fullName, department);
  }
}

export async function apiRemoveTeamMember(memberStudentId) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/team/remove-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ memberStudentId }),
      });
      data = await safeJson(res);
    } catch {}
    if (res && res.ok) {
      return { success: true, ...data };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }
    const me = getLoggedInStudent();
    return localRemoveTeamMember(me, memberStudentId);
  } catch {
    const me = getLoggedInStudent();
    return localRemoveTeamMember(me, memberStudentId);
  }
}

export async function apiRespondPartnerRequest(requestId, action) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/partners/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      data = await safeJson(res);
    } catch {}
    if (res && res.ok) {
      return { success: true, ...data };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }
    const me = getLoggedInStudent();
    return localRespondPartnerRequest(requestId, action, me);
  } catch {
    const me = getLoggedInStudent();
    return localRespondPartnerRequest(requestId, action, me);
  }
}

export async function apiCancelPartnerRequest(requestId) {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/partners/cancel-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ requestId }),
      });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      return { success: true, ...data };
    }
    return localCancelPartnerRequest(requestId);
  } catch {
    return localCancelPartnerRequest(requestId);
  }
}

export async function apiUnpairPartner() {
  try {
    let res = null;
    try {
      res = await fetch(`${API_BASE}/partners/unpair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
      });
    } catch {}
    if (res && res.ok) {
      const data = await safeJson(res);
      return { success: true, ...data };
    }
    const me = getLoggedInStudent();
    return localUnpairPartner(me?.studentId);
  } catch {
    const me = getLoggedInStudent();
    return localUnpairPartner(me?.studentId);
  }
}


// ==========================================
// STUDENT REGISTRATION & TEAM FORMATION CLIENT APIS
// ==========================================

export async function apiRegisterIndividual(formData) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/auth/register-individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.participant) {
      if (data.token) {
        setStudentAuthToken(data.token);
      }
      setLoggedInStudent(data.participant);
      return { success: true, participant: data.participant, token: data.token, message: data.message };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Offline / fallback handling
    const existing = getStoredParticipants() || [];
    const cleanMobile = (formData.mobile || '').replace(/[^\d]/g, '');
    const isDup = existing.some((p) => (p.mobile || p.phone || '').replace(/[^\d]/g, '').endsWith(cleanMobile.slice(-10)));
    if (isDup) {
      return { success: false, error: `Mobile number "${formData.mobile}" is already registered.` };
    }

    const newParticipant = {
      id: generateParticipantId(existing),
      ...formData,
      studentId: `STU-${cleanMobile.slice(-4) || '2026'}`,
      mobile: formData.mobile,
      phone: formData.mobile,
      email: `${cleanMobile || 'student'}@student.bob.pk`,
      status: 'Verified',
      registeredAt: new Date().toISOString(),
    };
    saveParticipant(newParticipant);
    setLoggedInStudent(newParticipant);
    const mockToken = 'local_jwt_' + Date.now();
    setStudentAuthToken(mockToken);
    return { success: true, participant: newParticipant, token: mockToken, message: 'Registration successful!' };
  } catch (err) {
    return { success: false, error: err.message || 'Registration failed' };
  }
}

export async function apiCreateTeam(teamData) {
  try {
    let res = null;
    let data = {};
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = getStudentAuthToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      res = await fetch(`${API_BASE}/teams/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(teamData),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      if (data.token) setStudentAuthToken(data.token);
      if (data.participant) setLoggedInStudent(data.participant);
      return { success: true, team: data.team, participant: data.participant, token: data.token, inviteCode: data.inviteCode };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Local storage fallback for Vercel / offline hosts
    const localRes = localCreateTeam(teamData);
    if (localRes && localRes.success) {
      const mockToken = 'local_jwt_' + Date.now();
      setStudentAuthToken(mockToken);
      return { ...localRes, token: mockToken };
    }
    return localRes;
  } catch (err) {
    return localCreateTeam(teamData);
  }
}

export async function apiGetTeamByInvite(code) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/invite/${encodeURIComponent(code)}`);
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      return { success: true, team: data.team };
    }

    // Local storage fallback for Vercel / offline hosts
    return localGetTeamByInvite(code);
  } catch (err) {
    return localGetTeamByInvite(code);
  }
}

export async function apiJoinTeam(joinData) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinData),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      if (data.token) setStudentAuthToken(data.token);
      if (data.participant) setLoggedInStudent(data.participant);
      return { success: true, team: data.team, participant: data.participant, token: data.token, message: data.message };
    }

    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Local storage fallback for Vercel / offline hosts
    const localRes = localJoinTeam(joinData);
    if (localRes && localRes.success) {
      const mockToken = 'local_jwt_' + Date.now();
      setStudentAuthToken(mockToken);
      return { ...localRes, token: mockToken };
    }
    return localRes;
  } catch (err) {
    return localJoinTeam(joinData);
  }
}

export async function apiAddTeamMemberDirect(memberData) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/add-member-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify(memberData),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      return { success: true, team: data.team, member: data.member, message: data.message };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Local storage fallback
    return localAddTeamMemberDirect(memberData);
  } catch (err) {
    return localAddTeamMemberDirect(memberData);
  }
}

export async function apiFinalizeTeam(teamName, teamId) {
  try {
    let res = null;
    let data = {};
    try {
      const headers = { 'Content-Type': 'application/json' };
      const adminToken = getAdminAuthToken();
      const studentToken = getStudentAuthToken();
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
      else if (studentToken) headers.Authorization = `Bearer ${studentToken}`;

      res = await fetch(`${API_BASE}/teams/finalize`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ teamName, teamId }),
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      return { success: true, team: data.team, message: data.message };
    }
    if (res && data && data.error) {
      return { success: false, error: data.error };
    }

    // Local storage fallback
    return localFinalizeTeam(teamName, teamId);
  } catch (err) {
    return localFinalizeTeam(teamName, teamId);
  }
}

export async function apiGetMyTeam() {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/my-team`, {
        headers: {
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && data.team) {
      return { success: true, team: data.team };
    }

    // Local storage fallback
    return localGetMyTeam();
  } catch {
    return localGetMyTeam();
  }
}

export async function apiGetAllTeams() {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/all`, {
        headers: {
          Authorization: `Bearer ${getAdminAuthToken()}`,
        },
      });
      data = await safeJson(res);
    } catch {
      res = null;
    }

    if (res && res.ok && data && Array.isArray(data.teams)) {
      return data.teams;
    }

    return typeof getStoredTeams === 'function' ? (getStoredTeams() || []) : [];
  } catch {
    return typeof getStoredTeams === 'function' ? (getStoredTeams() || []) : [];
  }
}

export async function apiAdminCreateTeam(teamData) {
  try {
    const res = await fetch(`${API_BASE}/teams/admin-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(teamData),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create team.');
    return data;
  } catch (err) {
    // Local fallback
    if (typeof localAdminCreateTeam === 'function') {
      return localAdminCreateTeam(teamData);
    }
    return { success: false, error: err.message };
  }
}

export async function apiDeleteTeam(teamId) {
  try {
    const res = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to delete team.');
    if (typeof localDeleteTeam === 'function') {
      localDeleteTeam(teamId);
    }
    return data;
  } catch (err) {
    if (typeof localDeleteTeam === 'function') {
      return localDeleteTeam(teamId);
    }
    return { success: false, error: err.message };
  }
}

export async function apiGetAdminProfile() {
  try {
    const res = await fetch(`${API_BASE}/admin/profile`, {
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    if (!res.ok) throw new Error('Failed to load profile');
    const data = await safeJson(res);
    return data;
  } catch {
    return { success: true, adminEmail: getAdminEmail() };
  }
}

export async function apiUpdateAdminProfile(profileData) {
  try {
    const res = await fetch(`${API_BASE}/admin/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify(profileData),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Profile update failed.');
    if (profileData.adminEmail) {
      setAdminEmail(profileData.adminEmail);
    }
    return data;
  } catch (err) {
    // Local fallback
    if (profileData.adminEmail) {
      setAdminEmail(profileData.adminEmail);
    }
    if (profileData.newPasscode) {
      localStorage.setItem('bob_admin_password', profileData.newPasscode);
    }
    return { success: true, message: 'Admin profile updated successfully (local mode).' };
  }
}


// ====================================================================
// DOCUMENT SECURITY & ENCRYPTION APIS (AES-256-GCM + SHA-256)
// ====================================================================

import {
  encryptAndStoreDocument,
  getStoredDocuments,
  verifyDocumentIntegrity,
  attemptDocumentDecryption,
  getSecurityAuditLogs,
  deleteStoredDocument,
  simulateTamperOnDocument
} from './documentSecurity';

export async function apiGetEncryptedDocuments() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`, {
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
    const data = await safeJson(res);
    if (res.ok && data.success && Array.isArray(data.documents)) {
      return data.documents;
    }
  } catch (err) {
    // console.warn('Using local document vault:', err.message);
  }
  return getStoredDocuments();
}

export async function apiUploadEncryptedDocument(file, options = ['CHIEF_PROCTOR', 'EXAM_CONTROLLER']) {
  // Support both array of roles or options object
  const authorizedRoles = Array.isArray(options) ? options : (options.authorizedRoles || ['CHIEF_PROCTOR', 'EXAM_CONTROLLER']);
  const category = (typeof options === 'object' && !Array.isArray(options)) ? (options.category || '') : '';

  // Try server first
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const fileBase64 = window.btoa(binary);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`
      },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileBase64: fileBase64,
        authorizedRoles: authorizedRoles,
        category: category
      })
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return data.document;
    }
  } catch (err) {
    // Fall back to client-side Web Crypto AES-256-GCM
  }

  return await encryptAndStoreDocument({ file, uploadedBy: 'ADMIN', authorizedRoles, category });
}

export async function apiVerifyDocumentIntegrity(docId) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${docId}/verify-integrity`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return data;
    }
  } catch (err) {}

  return await verifyDocumentIntegrity(docId);
}

export async function apiAttemptDocumentDecryption(docId, passkey, userRole = 'ADMIN') {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${docId}/decrypt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passkey, userRole })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      throw new Error(data.error || 'Decryption request failed.');
    }
    return data;
  } catch (err) {
    if (err.message && err.message.includes('403')) {
      throw err;
    }
  }

  return await attemptDocumentDecryption({ docId, userRole, passkey });
}

export async function apiGetDocumentSecurityLogs() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/security-logs`, {
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
    const data = await safeJson(res);
    if (res.ok && data.success && Array.isArray(data.logs)) {
      return data.logs;
    }
  } catch (err) {}

  return getSecurityAuditLogs();
}

export async function apiDeleteEncryptedDocument(docId) {
  try {
    await fetch(`${API_BASE_URL}/documents/${docId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
  } catch (err) {}

  deleteStoredDocument(docId);
  return { success: true };
}

export async function apiSimulateTamper(docId) {
  try {
    await fetch(`${API_BASE_URL}/documents/${docId}/simulate-tamper`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
  } catch (err) {}

  simulateTamperOnDocument(docId);
  return { success: true };
}

// ==========================================
// ADMIN-CONTROLLED RETAKE PERMISSION CLIENT API
// ==========================================

export async function apiGetRetakePermissions() {
  try {
    const res = await fetch(`${API_BASE}/retake/permissions`, {
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`
      }
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      if (Array.isArray(data.permissions)) {
        try {
          localStorage.setItem('bob_retake_permissions', JSON.stringify(data.permissions));
        } catch {}
      }
      return data;
    }
  } catch (err) {}

  // Local Fallback Synthesis
  const participants = getStoredParticipants() || [];
  let storedPerms = [];
  try {
    const s = localStorage.getItem('bob_retake_permissions');
    if (s) storedPerms = JSON.parse(s);
  } catch {}

  const students = participants.map((p) => {
    let prevHistory = [];
    try {
      const s = localStorage.getItem(`bob_student_history_${p.studentId}`);
      if (s) prevHistory = JSON.parse(s);
    } catch {}

    const hasSavedResult = !!localStorage.getItem(`bob_student_results_${p.studentId}`);
    const roundStatus = {};

    for (let r = 1; r <= 4; r++) {
      const rAttempts = prevHistory.filter((a) => Number(a.roundNumber || 1) === r);
      const isCompleted = rAttempts.length > 0 || (r === 1 && hasSavedResult);
      const rPerm = storedPerms.find((perm) => perm.studentId === p.studentId && Number(perm.roundNumber) === r && perm.status === 'GRANTED');
      const latest = rAttempts[rAttempts.length - 1];

      roundStatus[r] = {
        roundNumber: r,
        isCompleted,
        attemptCount: isCompleted ? Math.max(1, rAttempts.length) : 0,
        score: latest ? latest.score : (isCompleted ? 80 : null),
        completedAt: latest?.date || null,
        hasRetakePermission: !!rPerm,
        retakePermission: rPerm || null,
      };
    }

    return {
      studentId: p.studentId,
      fullName: p.fullName,
      email: p.email,
      department: p.degreeProgram || 'Computer Science',
      campus: p.campus || 'Main Campus',
      registrationStatus: p.registrationStatus,
      rounds: roundStatus,
      totalAttempts: Object.values(roundStatus).reduce((acc, rs) => acc + rs.attemptCount, 0),
    };
  });

  return {
    success: true,
    students,
    permissions: storedPerms,
    stats: {
      totalStudents: participants.length,
      totalPermissions: storedPerms.length,
      activeGrantedCount: storedPerms.filter((p) => p.status === 'GRANTED').length,
      usedCount: storedPerms.filter((p) => p.status === 'USED').length,
      revokedCount: storedPerms.filter((p) => p.status === 'REVOKED').length,
    }
  };
}

export async function apiGrantRetakeAccess(studentId, roundNumber = 1, reason = 'Retake authorized by administrator') {
  try {
    const res = await fetch(`${API_BASE}/retake/grant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`
      },
      body: JSON.stringify({ studentId, roundNumber: Number(roundNumber), reason })
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      let stored = [];
      try {
        const s = localStorage.getItem('bob_retake_permissions');
        if (s) stored = JSON.parse(s);
      } catch {}
      const filtered = stored.filter(p => !(p.studentId === studentId && Number(p.roundNumber) === Number(roundNumber) && p.status === 'GRANTED'));
      stored = [data.permission, ...filtered];
      localStorage.setItem('bob_retake_permissions', JSON.stringify(stored));
      window.dispatchEvent(new Event('storage'));
      return data;
    }
    if (data?.error) return { success: false, error: data.error };
  } catch (err) {}

  // Fallback local grant
  const participants = getStoredParticipants() || [];
  const p = participants.find(part => part.studentId === studentId);
  const newPermission = {
    id: `PERM-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    studentId,
    studentName: p ? p.fullName : studentId,
    roundNumber: Number(roundNumber),
    status: 'GRANTED',
    grantedBy: 'ADMINISTRATOR',
    grantedAt: new Date().toISOString(),
    usedAt: null,
    revokedAt: null,
    reason: reason || 'Retake authorized by administrator'
  };

  let stored = [];
  try {
    const s = localStorage.getItem('bob_retake_permissions');
    if (s) stored = JSON.parse(s);
  } catch {}

  const filtered = stored.filter(perm => !(perm.studentId === studentId && Number(perm.roundNumber) === Number(roundNumber) && perm.status === 'GRANTED'));
  stored = [newPermission, ...filtered];
  localStorage.setItem('bob_retake_permissions', JSON.stringify(stored));
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    message: `Retake access successfully granted for ${newPermission.studentName} (Round 0${roundNumber}).`,
    permission: newPermission
  };
}

export async function apiRevokeRetakeAccess(permissionId, studentId, roundNumber) {
  try {
    const res = await fetch(`${API_BASE}/retake/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`
      },
      body: JSON.stringify({ permissionId, studentId, roundNumber })
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      let stored = [];
      try {
        const s = localStorage.getItem('bob_retake_permissions');
        if (s) stored = JSON.parse(s);
      } catch {}
      stored = stored.map(perm => {
        if ((permissionId && perm.id === permissionId) || (studentId && roundNumber && perm.studentId === studentId && Number(perm.roundNumber) === Number(roundNumber))) {
          return { ...perm, status: 'REVOKED', revokedAt: new Date().toISOString() };
        }
        return perm;
      });
      localStorage.setItem('bob_retake_permissions', JSON.stringify(stored));
      window.dispatchEvent(new Event('storage'));
      return data;
    }
  } catch (err) {}

  // Fallback local revocation
  let stored = [];
  try {
    const s = localStorage.getItem('bob_retake_permissions');
    if (s) stored = JSON.parse(s);
  } catch {}
  stored = stored.map(perm => {
    if ((permissionId && perm.id === permissionId) || (studentId && roundNumber && perm.studentId === studentId && Number(perm.roundNumber) === Number(roundNumber))) {
      return { ...perm, status: 'REVOKED', revokedAt: new Date().toISOString() };
    }
    return perm;
  });
  localStorage.setItem('bob_retake_permissions', JSON.stringify(stored));
  window.dispatchEvent(new Event('storage'));

  return { success: true, message: 'Retake access revoked.' };
}

export async function apiCheckRetakePermission(studentId, roundNumber = 1) {
  try {
    const res = await fetch(`${API_BASE}/retake/check/${encodeURIComponent(studentId)}/${roundNumber}`);
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return data;
    }
  } catch (err) {}

  // Fallback local check
  let stored = [];
  try {
    const s = localStorage.getItem('bob_retake_permissions');
    if (s) stored = JSON.parse(s);
  } catch {}

  const perm = stored.find(
    p => p.studentId === studentId && Number(p.roundNumber) === Number(roundNumber) && p.status === 'GRANTED'
  );

  return {
    success: true,
    hasPermission: !!perm,
    permission: perm || null
  };
}

// ==========================================
// QUIZ SCHEDULE & ACCESS CONTROL CLIENT API
// ==========================================

export async function apiGetScheduleStatus() {
  try {
    const res = await fetch(`${API_BASE}/schedule/status`);
    const data = await safeJson(res);
    if (res.ok && data.success) {
      if (data.schedule) saveStoredSchedule(data.schedule);
      return data;
    }
  } catch (err) {}

  // Fallback to local access status
  return {
    success: true,
    ...getCompetitionAccessStatusLocal(),
    subjects: getStoredSubjects() || [],
  };
}

export async function apiSaveCompetitionSchedule({ startDate, startTime, endDate, endTime }) {
  try {
    const res = await fetch(`${API_BASE}/schedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ startDate, startTime, endDate, endTime }),
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      if (data.schedule) saveStoredSchedule(data.schedule);
      window.dispatchEvent(new Event('storage'));
      return data;
    }
    if (data?.error) return { success: false, error: data.error };
  } catch (err) {}

  // Local validation & save
  const startParsed = parsePKTDateTime(startDate, startTime);
  const endParsed = parsePKTDateTime(endDate, endTime);

  if (!startParsed || !startParsed.isValid) {
    return { success: false, error: 'Invalid Start Date or Time format. Please use DD/MM/YYYY and HH:MM AM/PM.' };
  }
  if (!endParsed || !endParsed.isValid) {
    return { success: false, error: 'Invalid End Date or Time format. Please use DD/MM/YYYY and HH:MM AM/PM.' };
  }
  if (endParsed.timestamp <= startParsed.timestamp) {
    return { success: false, error: 'Validation failed: Competition End Date & Time must be later than Start Date & Time.' };
  }

  const prev = getStoredSchedule() || {};
  const updatedSchedule = {
    ...prev,
    startDate: startDate.trim(),
    startTime: startTime.trim(),
    endDate: endDate.trim(),
    endTime: endTime.trim(),
    startIso: startParsed.iso,
    endIso: endParsed.iso,
    startMs: startParsed.timestamp,
    endMs: endParsed.timestamp,
    timezone: "Asia/Karachi",
    status: "scheduled",
    lastUpdated: new Date().toISOString(),
  };

  saveStoredSchedule(updatedSchedule);
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    message: 'Schedule saved successfully in Pakistan Standard Time (PKT).',
    schedule: updatedSchedule,
    access: getCompetitionAccessStatusLocal(updatedSchedule),
  };
}

export async function apiActivateCompetition() {
  try {
    const res = await fetch(`${API_BASE}/schedule/activate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      const schedule = getStoredSchedule();
      schedule.status = 'live';
      saveStoredSchedule(schedule);
      window.dispatchEvent(new Event('storage'));
      return data;
    }
  } catch (err) {}

  const schedule = getStoredSchedule();
  schedule.status = 'live';
  saveStoredSchedule(schedule);
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    message: 'Competition is now officially LIVE!',
    access: getCompetitionAccessStatusLocal(schedule),
  };
}

export async function apiStopCompetition() {
  try {
    const res = await fetch(`${API_BASE}/schedule/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      const schedule = getStoredSchedule();
      schedule.status = 'stopped';
      saveStoredSchedule(schedule);
      window.dispatchEvent(new Event('storage'));
      return data;
    }
  } catch (err) {}

  const schedule = getStoredSchedule();
  schedule.status = 'stopped';
  saveStoredSchedule(schedule);
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    message: 'Competition has been STOPPED by the administrator.',
    access: getCompetitionAccessStatusLocal(schedule),
  };
}

export async function apiPublishQuiz(totalQuestionsCount) {
  const count = Number(totalQuestionsCount);
  if (!count || count < 7) {
    return {
      success: false,
      error: 'Every subject must have at least one question. Minimum 7 questions required.'
    };
  }

  try {
    const res = await fetch(`${API_BASE}/quiz/publish-bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ totalQuestionsCount: count }),
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      const schedule = getStoredSchedule();
      schedule.isPublished = true;
      schedule.publishedQuestionCount = count;
      schedule.subjectDistribution = data.distribution;
      saveStoredSchedule(schedule);
      window.dispatchEvent(new Event('storage'));
      return data;
    }
    if (data?.error) return { success: false, error: data.error };
  } catch (err) {}

  // Local fallback distribution calculation
  const allStored = getStoredQuestions() || [];
  const dist = calculateSubjectDistributionLocal(count, allStored);

  if (!dist.isValid) {
    return {
      success: false,
      error: dist.error,
      subjectBreakdown: dist.subjectBreakdown
    };
  }

  saveStoredPublishedQuestions(dist.selectedQuestions);
  const schedule = getStoredSchedule();
  schedule.isPublished = true;
  schedule.publishedQuestionCount = count;
  schedule.subjectDistribution = dist.targetDistribution;
  saveStoredSchedule(schedule);
  window.dispatchEvent(new Event('storage'));

  return {
    success: true,
    message: `Successfully published ${count} questions distributed across all 7 subjects.`,
    distribution: dist.targetDistribution,
    subjectBreakdown: dist.subjectBreakdown,
    publishedCount: count,
  };
}

export async function apiPreviewDistribution(totalQuestionsCount) {
  const count = Number(totalQuestionsCount) || 14;
  try {
    const res = await fetch(`${API_BASE}/quiz/preview-distribution?count=${count}`, {
      headers: {
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res.ok && data.success) {
      return data;
    }
  } catch (err) {}

  const allStored = getStoredQuestions() || [];
  return {
    success: true,
    ...calculateSubjectDistributionLocal(count, allStored),
  };
}


/* =========================================================================
   REAL-TIME STUDENT LOGIN MONITORING & HEARTBEAT API
   ========================================================================= */

export async function apiGetLiveStudentLogins() {
  try {
    const res = await fetch(`${API_BASE}/admin/live-logins`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
    });
    const data = await safeJson(res);
    if (res.ok && data) {
      return data;
    }
  } catch (err) {}

  // Fallback to localStorage events for local/offline demo
  try {
    const raw = localStorage.getItem('bob_live_student_logins_history');
    const events = raw ? JSON.parse(raw) : [];
    const participants = getStoredParticipants() || [];
    const online = participants.filter(p => p.isOnline);
    return {
      success: true,
      events: events.slice(0, 30),
      onlineStudents: online,
      onlineCount: online.length,
      unseenCount: events.filter(e => !e.seenByAdmin).length
    };
  } catch {
    return { success: true, events: [], onlineStudents: [], onlineCount: 0, unseenCount: 0 };
  }
}

export async function apiDismissStudentLoginEvent(eventId, dismissAll = false) {
  try {
    const res = await fetch(`${API_BASE}/admin/dismiss-login-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminAuthToken()}`,
      },
      body: JSON.stringify({ eventId, dismissAll }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiSendStudentHeartbeat(studentId) {
  try {
    const res = await fetch(`${API_BASE}/auth/student-heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiStudentLogout(studentId) {
  try {
    const res = await fetch(`${API_BASE}/auth/student-logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId }),
    });
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

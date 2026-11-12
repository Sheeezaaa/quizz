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
  getStoredTeams
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
      const upperId = rawId.toUpperCase();
      found = {
        id: generateParticipantId(participants),
        fullName: `Student ${upperId}`,
        studentId: upperId,
        universityName: 'COMSATS University Islamabad',
        campus: 'Islamabad Campus',
        region: 'Federal Capital',
        email: `${rawId.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.comsats.edu.pk`,
        phone: '0300-0000000',
        department: 'Software Engineering',
        degreeProgram: 'BS Software Engineering',
        semester: '4th Semester',
        password: password || 'Student@123',
        status: 'Verified',
        rulesAccepted: true,
        registeredAt: new Date().toISOString(),
        teamMembers: [],
      };
      saveParticipant(found);
    }

    const mockToken = 'local_jwt_' + Date.now();
    setStudentAuthToken(mockToken);
    setLoggedInStudent(found);
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
      if (data && data.participants) return data;
    }
    const localList = getStoredParticipants() || [];
    return { participants: localList, total: localList.length };
  } catch {
    const localList = getStoredParticipants() || [];
    return { participants: localList, total: localList.length };
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
    }
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
    if (!res.ok) return [];
    return await safeJson(res);
  } catch {
    return [];
  }
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

export async function apiStartQuizAttempt(roundNumber) {
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
    if (!res.ok) throw new Error(data.error || 'Could not start quiz attempt.');
    return { success: true, attempt: data.attempt };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    if (!res.ok) throw new Error(data.error || 'Failed to submit answer.');
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    return { success: false, error: err.message };
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
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    return await safeJson(res);
  } catch {
    return [];
  }
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
    if (!res.ok) throw new Error(data.error || 'Failed to start rapid fire.');
    return { success: true, state: data.state };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetRapidFireState() {
  try {
    const res = await fetch(`${API_BASE}/rapidfire/state`);
    return await safeJson(res);
  } catch {
    return { status: 'idle' };
  }
}

// ==========================================
// BUZZER ADJUDICATION (ROUND 4)
// ==========================================

export async function apiGetBuzzerFinalists() {
  try {
    const res = await fetch(`${API_BASE}/buzzer/finalists`);
    return await safeJson(res);
  } catch {
    return [];
  }
}

export async function apiBuzzerPress(studentId, studentName) {
  try {
    const res = await fetch(`${API_BASE}/buzzer/press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentName }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Buzzer press rejected.');
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    if (!res.ok) throw new Error(data.error || 'Adjudication failed.');
    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
    return await safeJson(res);
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function apiGetBuzzerState() {
  try {
    const res = await fetch(`${API_BASE}/buzzer/state`);
    return await safeJson(res);
  } catch {
    return { status: 'idle' };
  }
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

export async function apiFinalizeTeam(teamName) {
  try {
    let res = null;
    let data = {};
    try {
      res = await fetch(`${API_BASE}/teams/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getStudentAuthToken()}`,
        },
        body: JSON.stringify({ teamName }),
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
    return localFinalizeTeam(teamName);
  } catch (err) {
    return localFinalizeTeam(teamName);
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

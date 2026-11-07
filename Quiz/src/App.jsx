import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import CountdownTimer from './components/CountdownTimer';
import About from './components/About';
import Subjects from './components/Subjects';
import Rounds from './components/Rounds';
import PracticeArena from './components/PracticeArena';
import Rules from './components/Rules';
import Registration from './components/Registration';
import RegisteredParticipants from './components/RegisteredParticipants';
import StudentPortal from './components/StudentPortal';
import AdminPanel from './components/AdminPanel';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { 
  getStoredDetails, 
  getStoredSubjects, 
  getStoredRounds, 
  getStoredRules, 
  getStoredParticipants,
  getStoredTheme,
  setStoredTheme
} from './utils/storage';
import { apiGetCompetition, apiGetParticipants } from './utils/api';
import { ShieldCheck } from 'lucide-react';

export default function App() {
  const [isAdminOpen, setIsAdminOpen] = useState(() => window.location.hash === '#admin');
  const [isStudentPortalOpen, setIsStudentPortalOpen] = useState(() => window.location.hash === '#student');
  const [practiceRoundMode, setPracticeRoundMode] = useState('round1');
  const [theme, setTheme] = useState(() => getStoredTheme());

  // Dynamic application state managed by Admin Panel
  const [details, setDetails] = useState(() => getStoredDetails());
  const [subjects, setSubjects] = useState(() => getStoredSubjects());
  const [rounds, setRounds] = useState(() => getStoredRounds());
  const [rules, setRules] = useState(() => getStoredRules());
  const [participants, setParticipants] = useState(() => getStoredParticipants());

  // Synchronize with Central Server Database (Multi-user real-time support)
  useEffect(() => {
    let isMounted = true;
    const fetchCentralData = async () => {
      try {
        const [compData, candidates] = await Promise.all([
          apiGetCompetition(),
          apiGetParticipants()
        ]);
        if (!isMounted) return;
        if (compData) {
          if (compData.details) setDetails(compData.details);
          if (compData.subjects) setSubjects(compData.subjects);
          if (compData.rounds) setRounds(compData.rounds);
          if (compData.rules) setRules(compData.rules);
        }
        if (candidates && Array.isArray(candidates)) {
          setParticipants(candidates);
        }
      } catch {}
    };

    fetchCentralData();
    // Poll every 15 seconds to keep all devices up-to-date
    const interval = setInterval(fetchCentralData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminOpen(true);
      } else if (window.location.hash === '#student') {
        setIsStudentPortalOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (isAdminOpen || isStudentPortalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isAdminOpen, isStudentPortalOpen]);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const handleOpenAdmin = () => {
    setIsAdminOpen(true);
    window.location.hash = '#admin';
  };

  const handleCloseAdmin = () => {
    setIsAdminOpen(false);
    if (window.location.hash === '#admin') {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  const handleDataUpdated = (newData) => {
    if (newData.details) setDetails(newData.details);
    if (newData.subjects) setSubjects(newData.subjects);
    if (newData.rounds) setRounds(newData.rounds);
    if (newData.rules) setRules(newData.rules);
    if (newData.participants) setParticipants(newData.participants);
  };

  const handleTryPractice = (roundNum) => {
    let mode = 'round1';
    if (roundNum === 3) mode = 'rapidFire';
    else if (roundNum === 4) mode = 'buzzer';

    setPracticeRoundMode(mode);
    const el = document.getElementById('practice');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenStudentPortal = () => {
    setIsStudentPortalOpen(true);
    window.location.hash = '#student';
  };

  const handleCloseStudentPortal = () => {
    setIsStudentPortalOpen(false);
    if (window.location.hash === '#student') {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  const handleOpenRegister = () => {
    const el = document.getElementById('register');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleParticipantRegistered = (newParticipant) => {
    setParticipants((prev) => [newParticipant, ...prev]);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 relative ${
      theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#080d1a] text-slate-100'
    }`}>
      
      {/* Navigation Bar matching VSpark with Theme Toggle */}
      <Navbar 
        onOpenRegister={handleOpenRegister} 
        onOpenAdmin={handleOpenAdmin}
        onOpenStudentPortal={handleOpenStudentPortal}
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Sections */}
      <main className="flex-1">
        
        {/* Hero Section matching reference website screenshot */}
        <Hero 
          onOpenRegister={handleOpenRegister} 
          onOpenStudentPortal={handleOpenStudentPortal}
          details={details}
        />

        {/* Live Countdown Timer with Editable Event Date */}
        <CountdownTimer 
          eventDateProp={details.defaultEventDate}
          details={details}
        />

        {/* About The Competition Section (Pic removed, clean full-width layout) */}
        <About details={details} />

        {/* 7 Competition Subjects */}
        <Subjects subjects={subjects} />

        {/* 4 Competition Rounds (Individual format) */}
        <Rounds 
          onTryPractice={handleTryPractice} 
          rounds={rounds}
        />

        {/* Interactive Practice Arena Simulator */}
        <PracticeArena initialMode={practiceRoundMode} />

        {/* Rules & Regulations Section */}
        <Rules rules={rules} />

        {/* Individual Participant Registration Form Section */}
        <Registration 
          onParticipantRegistered={handleParticipantRegistered}
          onOpenStudentPortal={handleOpenStudentPortal}
        />

        {/* Official Contact & FAQ Section */}
        <Contact />

      </main>

      {/* University Footer */}
      <Footer 
        onOpenAdmin={handleOpenAdmin} 
        onOpenStudentPortal={handleOpenStudentPortal}
      />

      {/* Student Contestant Dashboard Modal */}
      <StudentPortal 
        isOpen={isStudentPortalOpen} 
        onClose={handleCloseStudentPortal} 
        onOpenRegister={handleOpenRegister} 
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Full Admin Control Center Modal */}
      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={handleCloseAdmin}
        competitionData={{
          details,
          subjects,
          rounds,
          rules,
          participants,
        }}
        onDataUpdated={handleDataUpdated}
        currentTheme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Floating Shortcut Buttons (Bottom-Right) */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5 items-end">
        <button
          onClick={handleOpenStudentPortal}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white p-3 rounded-full shadow-2xl border border-emerald-400/40 flex items-center gap-2 text-xs font-heading font-bold hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title="Open Contestant Portal"
        >
          <span className="w-4 h-4 flex items-center justify-center font-black">🎓</span>
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            Student Portal
          </span>
        </button>

        <button
          onClick={handleOpenAdmin}
          className="bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white p-3 rounded-full shadow-2xl border border-blue-400/40 flex items-center gap-2 text-xs font-heading font-bold hover:scale-105 active:scale-95 transition-all group cursor-pointer"
          title="Open Admin Control Panel"
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap">
            Admin Console
          </span>
        </button>
      </div>

    </div>
  );
}

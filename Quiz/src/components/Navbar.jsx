import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Menu, 
  X, 
  Users, 
  ArrowRight,
  Sun,
  Moon,
  ShieldCheck,
  IdCard
} from 'lucide-react';

export default function Navbar({ 
  onOpenRegister, 
  onOpenAdmin,
  onOpenStudentPortal,
  currentTheme = 'dark',
  onToggleTheme
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);

      const sections = ['hero', 'about', 'subjects', 'rounds', 'practice', 'rules', 'register', 'contact'];
      const scrollPos = window.scrollY + 140;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#hero', id: 'hero' },
    { name: 'About', href: '#about', id: 'about' },
    { name: 'Subjects', href: '#subjects', id: 'subjects' },
    { name: 'Rounds', href: '#rounds', id: 'rounds' },
    { name: 'Practice', href: '#practice', id: 'practice' },
    { name: 'Rules', href: '#rules', id: 'rules' },
    { name: 'Contact', href: '#contact', id: 'contact' },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? currentTheme === 'light'
            ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-slate-200 py-3 text-slate-900'
            : 'bg-[#080d1a]/95 backdrop-blur-md shadow-2xl border-b border-white/10 py-3 text-white'
          : currentTheme === 'light'
            ? 'bg-gradient-to-b from-white/90 via-white/50 to-transparent py-4 text-slate-900'
            : 'bg-gradient-to-b from-[#080d1a]/90 via-[#080d1a]/40 to-transparent py-4 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Brand Logo styled exactly like VSpark */}
          <a href="#hero" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-sm group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#080d1a] rounded-[10px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-400 group-hover:text-cyan-300 transition-colors" />
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="font-heading font-black text-xl tracking-tight text-blue-500">
                BATTLE
              </span>
              <span className={`font-heading font-black text-xl tracking-tight ml-1 ${
                currentTheme === 'light' ? 'text-slate-900' : 'text-white'
              }`}>
                OF BRAINS
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links - Optimized Spacing to prevent overlap */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 shrink-0">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  className={`relative text-xs xl:text-sm font-heading font-semibold transition-colors py-1 px-1 ${
                    isActive
                      ? currentTheme === 'light' ? 'text-blue-600 font-bold' : 'text-white font-bold'
                      : currentTheme === 'light' ? 'text-slate-600 hover:text-blue-600' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-blue-500 rounded-full animate-fadeIn"></span>
                  )}
                </a>
              );
            })}
          </div>

          {/* Right Actions: Student Portal, Register & Theme Toggle (Admin Access removed from Menu Bar) */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenStudentPortal}
              className={`px-3.5 py-2 text-xs font-heading font-bold transition-all flex items-center gap-1.5 rounded-xl border shadow-sm shrink-0 cursor-pointer ${
                currentTheme === 'light' 
                  ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-400' 
                  : 'border-sky-500/40 text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 hover:border-sky-400'
              }`}
              title="Open Contestant Dashboard"
            >
              <IdCard className="w-3.5 h-3.5 text-blue-500" />
              <span>Student Portal</span>
            </button>

            <a
              href="#register"
              onClick={onOpenRegister}
              className="inline-flex items-center gap-2 bg-[#2563eb] hover:bg-blue-600 active:bg-blue-700 text-white font-heading font-semibold text-xs sm:text-sm px-4 xl:px-5 py-2.5 rounded-xl shadow-md hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <span>Register Now</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            {/* WORKING THEME TOGGLE BUTTON (Sun / Moon) */}
            <button
              onClick={onToggleTheme}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                currentTheme === 'light'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20 shadow-sm'
                  : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/20'
              }`}
              title={currentTheme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle Theme Mode"
            >
              {currentTheme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 animate-spin" style={{ animationDuration: '30s' }} />
              )}
            </button>
          </div>

          {/* Mobile Menu & Theme Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-yellow-400"
              aria-label="Toggle Theme"
            >
              {currentTheme === 'light' ? <Moon className="w-5 h-5 text-amber-500" /> : <Sun className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-200 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-blue-400" /> : <Menu className="w-6 h-6 text-slate-200" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden backdrop-blur-xl border-b px-4 pt-3 pb-6 animate-fadeIn shadow-2xl ${
          currentTheme === 'light' 
            ? 'bg-white/95 border-slate-200 text-slate-900' 
            : 'bg-[#080d1a]/95 border-white/10 text-white'
        }`}>
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-heading font-medium flex items-center justify-between ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-500 font-bold border border-blue-500/30'
                      : currentTheme === 'light'
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{link.name}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                </a>
              );
            })}

            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenStudentPortal && onOpenStudentPortal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-heading font-semibold text-white bg-blue-600/30 border border-blue-500/40"
              >
                <IdCard className="w-4 h-4 text-blue-400" />
                <span>Student Contestant Portal</span>
              </button>

              <a
                href="#register"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister && onOpenRegister();
                }}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#2563eb] text-white font-heading font-semibold text-xs py-2.5 rounded-xl shadow-md"
              >
                <span>Register Now</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

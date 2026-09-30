import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowLeft, Mail, MapPin, Calendar, FileText, ChevronRight, Check } from 'lucide-react';
import { policyDocuments, PolicyDocument, PolicySection } from '../data/policies';

interface PolicyReaderProps {
  initialPolicyId: string;
  theme: 'light' | 'dark';
  onClose: () => void;
}

export default function PolicyReader({ initialPolicyId, theme, onClose }: PolicyReaderProps) {
  const isDark = theme === 'dark';
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(initialPolicyId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSectionId, setActiveSectionId] = useState<string>('');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const currentPolicy = useMemo(() => {
    return policyDocuments.find(p => p.id === selectedPolicyId) || policyDocuments[0];
  }, [selectedPolicyId]);

  // Handle active section tracking on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      
      let currentActive = '';
      for (const section of currentPolicy.sections) {
        const el = sectionRefs.current[section.id];
        if (el) {
          const offsetTop = el.offsetTop - 120; // offset for sticky header
          if (scrollPosition >= offsetTop) {
            currentActive = section.id;
          }
        }
      }
      
      if (currentActive) {
        setActiveSectionId(currentActive);
      } else if (currentPolicy.sections.length > 0) {
        setActiveSectionId(currentPolicy.sections[0].id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Initial call
    setTimeout(handleScroll, 100);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPolicy]);

  const scrollToSection = (sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) {
      const offsetPosition = el.offsetTop - 100; // offset for sticky header
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveSectionId(sectionId);
    }
  };

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentPolicy.sections;
    const query = searchQuery.toLowerCase();
    return currentPolicy.sections.filter(sec => 
      sec.title.toLowerCase().includes(query) || 
      sec.content.toLowerCase().includes(query) ||
      sec.number.includes(query)
    );
  }, [currentPolicy, searchQuery]);

  // Helper to highlight matching search text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <mark key={i} className="bg-emerald-500/30 text-emerald-400 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className={`min-h-screen relative ${isDark ? 'bg-[#050505] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-emerald-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[15%] left-[5%] w-[25%] h-[25%] bg-blue-900/5 rounded-full blur-[100px]" />
      </div>

      {/* Header Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-300 ${
        isDark ? 'bg-[#050505]/90 border-white/10' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <button 
            onClick={onClose}
            className={`flex items-center space-x-2 text-xs font-bold font-mono tracking-wider uppercase py-2 px-3.5 rounded-lg border transition-all cursor-pointer ${
              isDark 
                ? 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5 hover:border-emerald-500/30' 
                : 'border-slate-300 text-slate-600 hover:text-slate-950 hover:bg-slate-100 hover:border-emerald-500/40'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Portal</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2">
            <span className={`text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase`}>
              AVER LEGAL CORE
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-xs font-sans text-gray-500">v2.4 Audit</span>
          </div>
        </div>
      </header>

      {/* Page Title Hero Banner */}
      <div className={`border-b ${isDark ? 'border-white/5 bg-gradient-to-r from-emerald-950/20 via-slate-950 to-slate-950' : 'border-slate-200 bg-slate-100/50'}`}>
        <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-md">
                Regulatory Protocol
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight">
              {currentPolicy.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-gray-500 font-medium">
              <span className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Last Updated: <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>{currentPolicy.lastUpdated}</strong></span>
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Direct Contact: <strong className={isDark ? 'text-gray-300' : 'text-gray-700'}>{currentPolicy.contactEmail}</strong></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Split View */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: Sticky Sidebar Document Selector & Section Index */}
          <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-28 lg:self-start max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">
            
            {/* 1. Policy Index Selection */}
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-gray-500 mb-3 px-1">
                Select Framework Document
              </h3>
              <div className="space-y-1.5">
                {policyDocuments.map((doc) => {
                  const isSelected = doc.id === selectedPolicyId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => {
                        setSelectedPolicyId(doc.id);
                        setSearchQuery('');
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-sans font-bold transition-all flex items-center justify-between cursor-pointer group ${
                        isSelected 
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' 
                          : isDark 
                            ? 'text-gray-400 hover:text-white hover:bg-white/5' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate pr-2">{doc.title}</span>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${
                        isSelected ? 'transform translate-x-0.5' : 'text-gray-500 group-hover:translate-x-0.5'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Table of Contents */}
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-gray-500 mb-3 px-1">
                Table of Contents
              </h3>
              <nav className="space-y-1">
                {currentPolicy.sections.map((section) => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-mono tracking-wide transition-all flex items-start space-x-2.5 cursor-pointer ${
                        isActive 
                          ? 'text-emerald-400 font-bold bg-emerald-500/5 border-l-2 border-emerald-500 pl-2.5' 
                          : isDark 
                            ? 'text-gray-400 hover:text-white hover:bg-white/5 pl-3' 
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 pl-3'
                      }`}
                    >
                      <span className="text-emerald-500 font-bold">§ {section.number}</span>
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* RIGHT COLUMN: Interactive Document Reader Panel */}
          <main className="lg:col-span-8 space-y-8 z-10">
            
            {/* Document search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-5 h-5 text-gray-500 animate-pulse" />
              </div>
              <input 
                type="text"
                placeholder={`Search inside ${currentPolicy.title}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-11 pr-4 py-4 rounded-2xl border text-sm font-sans font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                  isDark 
                    ? 'bg-[#0c0d12]/90 border-white/10 text-white placeholder-gray-500 focus:border-emerald-500/40' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-sm focus:border-emerald-500/40'
                }`}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-mono font-bold text-gray-500 hover:text-emerald-400 transition-colors"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Document Contents Canvas */}
            <div className={`p-8 md:p-10 rounded-3xl border space-y-10 leading-relaxed font-sans ${
              isDark ? 'bg-gradient-to-b from-[#0a0c10] to-[#050505] border-white/10 shadow-2xl' : 'bg-white border-slate-200 shadow-lg'
            }`}>
              
              {/* Introduction Paragraph */}
              <div className="pb-8 border-b border-white/5">
                <h2 className="text-xs font-mono font-bold tracking-widest uppercase text-emerald-400 mb-4">
                  00. Legal Preamble
                </h2>
                <p className={`text-base font-sans font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                  {highlightText(currentPolicy.introduction, searchQuery)}
                </p>
              </div>

              {/* Loop of filtered legal sections */}
              {filteredSections.length > 0 ? (
                <div className="space-y-12">
                  {filteredSections.map((section) => (
                    <section 
                      key={section.id} 
                      id={section.id}
                      ref={el => { sectionRefs.current[section.id] = el; }}
                      className="scroll-mt-28 group"
                    >
                      <div className="flex items-start space-x-4 mb-4">
                        <div className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase border ${
                          isDark 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}>
                          Section {section.number}
                        </div>
                        <h2 className={`text-xl font-display font-extrabold tracking-tight ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {highlightText(section.title, searchQuery)}
                        </h2>
                      </div>
                      
                      <p className={`text-[15px] font-sans font-medium leading-relaxed whitespace-pre-line ${
                        isDark ? 'text-gray-400' : 'text-slate-600'
                      }`}>
                        {highlightText(section.content, searchQuery)}
                      </p>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 space-y-4">
                  <p className="text-gray-500 font-sans font-bold">
                    No matching policy subsections found for "{searchQuery}".
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    Try entering standard regulatory terms like "AI", "sandbox", "crypto", or "KYC".
                  </p>
                </div>
              )}

              {/* Institutional footer block */}
              <div className={`mt-16 pt-8 border-t flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                isDark ? 'border-white/5 text-gray-500' : 'border-slate-200 text-slate-400'
              }`}>
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    Legal & Compliance Headquarters
                  </h4>
                  <div className="space-y-1 text-xs font-sans font-medium">
                    <p className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span>{currentPolicy.officeAddress}</span>
                    </p>
                    <p className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-emerald-400" />
                      <span>{currentPolicy.contactEmail}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end space-y-1.5 text-xs font-mono text-gray-600">
                  <p>Document Ref: <strong className="text-emerald-400">AVR-{currentPolicy.id.toUpperCase()}-2026</strong></p>
                  <p>System Authority: <span className="text-emerald-400">Verified Signature</span></p>
                </div>
              </div>

            </div>

          </main>

        </div>
      </div>

    </div>
  );
}

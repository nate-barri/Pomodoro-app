import React, { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline'; 
import { supabase } from './supabaseClient'; 
import './App.css';

// --- CONFIGURATION ---
const HOME_SCENE = "https://prod.spline.design/c061UZajAbTdVul9/scene.splinecode";
const FOCUS_SCENE = "https://prod.spline.design/aWb-ey-SMG4XVvdE/scene.splinecode"; 
const ALARM_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

// Helper: Selector Component
const SelectorTag = ({ label, options, selected, onSelect }) => (
  <div style={{ marginBottom: '20px' }}>
    <p className="section-title">{label}</p>
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      {options.map(opt => (
        <button key={opt.value} onClick={() => onSelect(opt.value)} className={`selector-btn ${selected === opt.value ? 'selected' : ''}`}>{opt.icon} {opt.label}</button>
      ))}
    </div>
  </div>
);

// Preset Playlists
const PRESET_PLAYLISTS = [
  { id: 'p1', name: 'Lofi Flow', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbvABJXBI1Sc', icon: 'xrXs' },
  { id: 'p2', name: 'Deep Focus', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO', icon: '🎵' }
];

const EMOJI_OPTIONS = ['🎵', '🎹', '🎻', '🎷', '🎸', '🎧', '🎙️', '🎼', '🥁', '🔥', '💧', '⛈️', '🧘', '💤', '🌌', '📚', '💻', '☕'];

export default function App() {
  // --- VIEW STATE ---
  const [view, setView] = useState('HOME');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('TIMER'); 

  // --- BACKGROUND STATE ---
  const [bgType, setBgType] = useState('SPLINE'); 
  const [bgUrl, setBgUrl] = useState(null); 
  const [customBackgrounds, setCustomBackgrounds] = useState([]);

  // --- MUSIC STATE ---
  const [showMusic, setShowMusic] = useState(false);
  const [musicTab, setMusicTab] = useState('LIBRARY'); 
  const [playlists, setPlaylists] = useState(PRESET_PLAYLISTS);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistIcon, setNewPlaylistIcon] = useState('🎵');

  // --- BRAIN DUMP STATE ---
  const [showBrain, setShowBrain] = useState(false);
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");

  // --- TIMER STATE ---
  const [mode, setMode] = useState('HOME'); 
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(300); 
  const [isActive, setIsActive] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  
  // --- OVERRIDES (Base Values) ---
  const [workOverride, setWorkOverride] = useState(''); 
  const [breakOverride, setBreakOverride] = useState(''); 

  // --- SETTINGS INPUT STATE ---
  const [tempWork, setTempWork] = useState('');
  const [tempBreak, setTempBreak] = useState('');
  
  // --- FONT STATE ---
  const [activeFont, setActiveFont] = useState("'Clash Display', sans-serif");
  const [tempFont, setTempFont] = useState("'Clash Display', sans-serif");

  const fontOptions = [
      { name: 'Modern', value: "'Clash Display', sans-serif", preview: 'Aa' },
      { name: 'Clean', value: "'Inter', sans-serif", preview: 'Aa' },
      { name: 'Tech', value: "'Space Grotesk', sans-serif", preview: 'Aa' },
      { name: 'Retro', value: "'Courier Prime', monospace", preview: 'Aa' }
  ];

  // --- FOCUS MODE ---
  const [focusTab, setFocusTab] = useState('WORK'); 
  const [showPriorities, setShowPriorities] = useState(false);
  const [priorities, setPriorities] = useState([{id: 1, text: 'Main Task', done: false}]);

  // --- GAMIFICATION STATE ---
  const [energy, setEnergy] = useState('MED');
  const [difficulty, setDifficulty] = useState('MED');
  const [streak, setStreak] = useState(0);
  const [trees, setTrees] = useState([]); 
  const [currentQuote, setCurrentQuote] = useState({ quote: "Loading...", author: "" });
  
  // --- CALENDAR STATE ---
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState(null); 

  // --- ZEN MODE & REFS ---
  const [userActive, setUserActive] = useState(true);
  const inputTimeoutRef = useRef(null);

  const alarmAudio = useRef(typeof Audio !== "undefined" ? new Audio(ALARM_URL) : null);
  const canvasRef = useRef(null); 
  const videoRef = useRef(null);  
  const vantaRef = useRef(null); 

  // --- INIT DATA (LOAD FROM DB) ---
  useEffect(() => {
    const initData = async () => {
      console.log("🔄 Fetching data from Supabase...");

      const { data: pData } = await supabase.from('playlists').select('*');
      if (pData) setPlaylists([...PRESET_PLAYLISTS, ...pData]);
      
      const { data: bgData } = await supabase.from('backgrounds').select('*');
      if (bgData) setCustomBackgrounds(bgData);
      
      const { data: sData } = await supabase.from('sessions').select('*');
      if (sData) {
          setTrees(sData); 
          const completedCount = sData.filter(s => s.status === 'COMPLETED').length;
          setStreak(completedCount);
      }

      // Fetch Notes
      const { data: nData } = await supabase.from('notes').select('*');
      if (nData) setNotes(nData);

      try {
        const response = await fetch('https://dummyjson.com/quotes/random');
        if (response.ok) {
          const data = await response.json();
          setCurrentQuote({ quote: data.quote, author: data.author });
        }
      } catch (error) {
        setCurrentQuote({ quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" });
      }
    };
    initData();
  }, []);

  // --- VANTA.JS EFFECT LOGIC ---
  useEffect(() => {
    let vantaEffect = null;
    if (view === 'AMBIENT' && vantaRef.current) {
        const loadVanta = async () => {
            if (!window.THREE) await new Promise(r => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js'; s.onload = r; document.body.appendChild(s); });
            if (!window.VANTA) await new Promise(r => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.waves.min.js'; s.onload = r; document.body.appendChild(s); });
            if (window.VANTA && vantaRef.current && !vantaEffect) {
                vantaEffect = window.VANTA.WAVES({
                    el: vantaRef.current,
                    mouseControls: true, touchControls: true, gyroControls: false,
                    minHeight: 200.00, minWidth: 200.00, scale: 1.00, scaleMobile: 1.00,
                    color: 0x005588, shininess: 30, waveHeight: 20, waveSpeed: 0.7, zoom: 0.8
                });
            }
        };
        loadVanta();
    }
    return () => { if (vantaEffect) vantaEffect.destroy(); };
  }, [view]);

  // --- ZEN MODE / AUTO-HIDE LOGIC ---
  useEffect(() => {
    const handleActivity = () => {
      setUserActive(true);
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
      if (view === 'FOCUS' && isActive) {
        inputTimeoutRef.current = setTimeout(() => { setUserActive(false); }, 3000); 
      }
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    handleActivity();
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    };
  }, [view, isActive]); 

  // --- HELPER: TIME CALCULATION ---
  const calculateEffectiveTimes = (baseW, baseB, en, diff) => {
      let finalWork = baseW;
      let finalBreak = baseB;
      let workLabel = "Base";
      let breakLabel = "Base";

      if (en === 'HIGH') { finalWork = Math.round(baseW * 2); finalBreak += 5; workLabel = "⚡ High (2x)"; breakLabel = "⚡ High (+5m)"; }
      if (en === 'LOW') { finalWork = Math.round(baseW * 0.6); workLabel = "🪫 Low (0.6x)"; }

      if (diff === 'HARD') {
          finalBreak += 5; breakLabel += " + 🔥 Hard (+5m)";
          if (en === 'LOW') { finalWork = Math.round(baseW * 0.4); workLabel = "🪫 Low + 🔥 Hard (0.4x)"; }
      }
      if (diff === 'EASY') {
          finalBreak = Math.max(2, finalBreak - 2); breakLabel += " + 🃏 Easy (-2m)";
          if (en === 'HIGH') { finalWork = Math.round(baseW * 2.4); workLabel = "⚡ High + 🃏 Easy (2.4x)"; }
      }
      return { finalWork, finalBreak, workLabel, breakLabel };
  };

  useEffect(() => {
      const baseWork = workOverride && !isNaN(workOverride) ? parseInt(workOverride) : 25;
      const baseBreak = breakOverride && !isNaN(breakOverride) ? parseInt(breakOverride) : 5;
      const { finalWork, finalBreak } = calculateEffectiveTimes(baseWork, baseBreak, energy, difficulty);

      setTargetMinutes(finalWork);
      if (mode === 'HOME') setBreakSeconds(finalBreak * 60);
  }, [energy, difficulty, mode, workOverride, breakOverride]);

  // --- SETTINGS HANDLERS ---
  const applyTimerSettings = () => { setWorkOverride(tempWork); setBreakOverride(tempBreak); alert("Timer Base Settings updated!"); };
  const resetTimerSettings = () => { setTempWork(''); setTempBreak(''); setWorkOverride(''); setBreakOverride(''); alert("Timer reset."); };
  const applyFontSettings = () => { setActiveFont(tempFont); alert("Appearance updated!"); };
  const resetFontSettings = () => { setTempFont("'Clash Display', sans-serif"); setActiveFont("'Clash Display', sans-serif"); alert("Appearance reset."); };

  // --- FILE & DATA HANDLERS ---
  const handleBackgroundUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const filePath = `${Date.now()}.${file.name.split('.').pop()}`;
    try {
        const { error: uploadError } = await supabase.storage.from('uploads').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(filePath);
        const type = file.type.startsWith('video') ? 'video' : 'image';
        const { data: newBg, error: dbError } = await supabase.from('backgrounds').insert([{ url: publicUrl, type: type, name: file.name }]).select().single();
        if (dbError) throw dbError;
        setCustomBackgrounds([...customBackgrounds, newBg]);
        setBgType(type === 'video' ? 'VIDEO' : 'IMAGE');
        setBgUrl(publicUrl);
        alert("Background Uploaded!");
    } catch (error) { console.error("Upload failed:", error); alert("Upload failed."); }
  };

  const savePlaylist = async () => {
    if(!newPlaylistUrl) return;
    let finalUrl = newPlaylistUrl;
    if (newPlaylistUrl.includes('spotify.com') && !newPlaylistUrl.includes('/embed/')) {
        finalUrl = newPlaylistUrl.replace('/playlist/', '/embed/playlist/');
    }
    const newEntry = { name: newPlaylistName || 'Custom Mix', url: finalUrl, icon: newPlaylistIcon || '🎵' };
    setPlaylists([...playlists, { ...newEntry, id: Date.now() }]);
    setCurrentUrl(finalUrl);
    setNewPlaylistUrl(''); setNewPlaylistName(''); setNewPlaylistIcon('🎵');
    await supabase.from('playlists').insert([newEntry]);
  };

  const deletePlaylist = async (e, id) => {
    e.stopPropagation();
    if(!window.confirm("Remove this playlist?")) return;
    setPlaylists(playlists.filter(p => p.id !== id));
    await supabase.from('playlists').delete().eq('id', id);
  };

  const logSessionToSupabase = async (status, duration) => {
    const sessionData = { duration: duration, created_at: new Date().toISOString(), energy_level: energy, difficulty: difficulty, status: status };
    setTrees(prev => [...prev, sessionData]);
    await supabase.from('sessions').insert([sessionData]);
  };

  // --- NOTE HANDLERS (UPDATED) ---
  const saveNote = async () => {
    if (!noteInput.trim()) return;
    // IMPORTANT: .select() returns the data including the new ID
    const { data, error } = await supabase
        .from('notes')
        .insert([{ content: noteInput, created_at: new Date().toISOString() }])
        .select();

    if (data) {
        setNotes(prev => [...prev, data[0]]);
        setNoteInput("");
        setShowBrain(false);
    } else {
        console.error("Save Error:", error);
        alert("Failed to save note. Please check connection.");
    }
  };

  const deleteNote = async (id) => {
    if(!window.confirm("Delete this note?")) return;
    
    // 1. Remove from local state
    setNotes(prev => prev.filter(n => n.id !== id));
    
    // 2. Remove from currently open popup if necessary
    if(selectedDayData) {
        setSelectedDayData(prev => ({
            ...prev,
            dayNotes: prev.dayNotes.filter(n => n.id !== id)
        }));
    }

    // 3. Remove from DB
    await supabase.from('notes').delete().eq('id', id);
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (focusTab === 'WORK' || mode === 'WORK') {
          setWorkSeconds(prev => {
            const next = prev + 1;
            if (next === targetMinutes * 60 && alarmAudio.current) alarmAudio.current.play();
            return next;
          });
        } else {
          setBreakSeconds(prev => {
             if (prev <= 1) { if (alarmAudio.current) alarmAudio.current.play(); setIsActive(false); return 0; }
             return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, mode, focusTab, targetMinutes]);

  const switchToWorkMode = () => { setMode('WORK'); setFocusTab('WORK'); setTargetMinutes(25); setWorkSeconds(0); setIsActive(true); };
  const setupAmbientBreak = () => { setMode('BREAK'); setBreakSeconds(600); setIsActive(false); };
  const skipBreak = () => { setIsActive(false); switchToWorkMode(); };
  const startStandardSession = () => { setMode('WORK'); setFocusTab('WORK'); setWorkSeconds(0); setIsActive(true); setView('FOCUS'); };
  
  const finishWorkAndCalcBreak = async () => {
    await logSessionToSupabase('COMPLETED', workSeconds);
    setStreak(s => s + 1); 
    const baseBreak = breakOverride ? parseInt(breakOverride) : 5;
    const { finalBreak } = calculateEffectiveTimes(25, baseBreak, energy, difficulty);
    const overtime = Math.max(0, workSeconds - (targetMinutes * 60));
    setBreakSeconds((finalBreak * 60) + overtime); 
    setMode('BREAK'); setView('FOCUS'); setFocusTab('SHORT_BREAK');
  };

  const handleReset = async () => {
      if (mode === 'WORK' && isActive && workSeconds > 60) await logSessionToSupabase('ABANDONED', workSeconds);
      setIsActive(false); setWorkSeconds(0);
      if(focusTab === 'SHORT_BREAK') setBreakSeconds(5*60);
      if(focusTab === 'LONG_BREAK') setBreakSeconds(15*60);
  };

  const handleFocusTabChange = (newTab) => {
    setIsActive(false);
    if (focusTab === 'WORK' && newTab !== 'WORK') {
        const targetSeconds = targetMinutes * 60;
        if (workSeconds >= targetSeconds) {
            logSessionToSupabase('COMPLETED', workSeconds);
            setStreak(s => s + 1);
            const overtime = workSeconds - targetSeconds;
            const baseBreakMin = newTab === 'SHORT_BREAK' ? calculateEffectiveTimes(25, (breakOverride?parseInt(breakOverride):5), energy, difficulty).finalBreak : 15;
            setBreakSeconds((baseBreakMin * 60) + overtime);
            setMode('BREAK'); setFocusTab(newTab); return; 
        }
        if (workSeconds > 60) logSessionToSupabase('ABANDONED', workSeconds);
    }
    setFocusTab(newTab);
    if (newTab === 'WORK') {
        const { finalWork } = calculateEffectiveTimes((workOverride?parseInt(workOverride):25), 5, energy, difficulty);
        setTargetMinutes(finalWork); setWorkSeconds(0); setMode('WORK');
    } else {
        setBreakSeconds(newTab === 'SHORT_BREAK' ? 5*60 : 15*60);
        setMode('BREAK');
    }
  };

  // --- PIN UP / PIP LOGIC ---
  const updatePiPCanvas = () => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width; const height = canvas.height;
      ctx.fillStyle = '#111'; ctx.fillRect(0, 0, width, height);
      const textColor = mode === 'BREAK' ? '#bd00ff' : '#00f2ff';
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 120px "Clash Display", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(getDisplayTime(), width/2, height/2 - 20);
      ctx.fillStyle = textColor; ctx.font = '600 40px "Clash Display", sans-serif'; ctx.fillText(mode==='BREAK'?'BREAK':'FOCUS', width/2, height/2 + 80);
      let progress = mode === 'WORK' ? Math.min(1, workSeconds / (targetMinutes * 60)) : 1 - (breakSeconds / (5 * 60));
      ctx.fillRect(0, height - 20, width * progress, 20);
  };
  useEffect(() => { updatePiPCanvas(); }, [workSeconds, breakSeconds, mode]);

  const handlePin = async () => {
      const video = videoRef.current; const canvas = canvasRef.current;
      if (!video || !canvas) return;
      try {
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
          else {
              if (!video.srcObject) video.srcObject = canvas.captureStream(30);
              await video.play(); await video.requestPictureInPicture();
          }
      } catch (err) { console.error("PiP Error:", err); }
  };

  // --- CALENDAR LOGIC ---
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); 
    return { daysInMonth, firstDay, year, month };
  };

  const changeMonth = (offset) => {
    const newDate = new Date(calendarDate.setMonth(calendarDate.getMonth() + offset));
    setCalendarDate(new Date(newDate));
  };

  const getSessionsForDay = (day, month, year) => {
    return trees.filter(t => {
      const d = new Date(t.created_at);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const getNotesForDay = (day, month, year) => {
    return notes.filter(n => {
      const d = new Date(n.created_at);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  // --- POPUP HANDLERS ---
  const handleDayClick = (day, month, year, sessions, dayNotes) => {
    const totalMins = Math.floor(sessions.filter(s => s.status === 'COMPLETED').reduce((acc, c) => acc + (c.duration || 0), 0) / 60);
    const sessionCount = sessions.filter(s => s.status === 'COMPLETED').length;
    const dateStr = new Date(year, month, day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    setSelectedDayData({ dateStr, totalMins, sessionCount, sessions, dayNotes });
  };
  const closeDayPopup = () => setSelectedDayData(null);

  // --- POPUP RENDERER (UPDATED) ---
  const renderDayPopup = () => {
    if (!selectedDayData) return null;
    return (
      <div className="cal-popup-overlay" onClick={closeDayPopup}>
        <div className="cal-popup-card" onClick={(e) => e.stopPropagation()}>
          <div className="cal-popup-header">
            <div><div className="cal-popup-date">{selectedDayData.dateStr}</div><div className="cal-popup-subtitle">Daily Report</div></div>
            <button className="cal-popup-close" onClick={closeDayPopup}>✕</button>
          </div>
          <div className="cal-stat-row">
            <div className="cal-stat-badge"><span className="cal-stat-val">{selectedDayData.totalMins}m</span><span className="cal-stat-lbl">Focus Time</span></div>
            <div className="cal-stat-badge"><span className="cal-stat-val">{selectedDayData.sessionCount}</span><span className="cal-stat-lbl">Sessions</span></div>
          </div>

          {/* NOTES SECTION WITH DELETE */}
          {selectedDayData.dayNotes && selectedDayData.dayNotes.length > 0 && (
            <div style={{marginBottom: '20px'}}>
              <div className="cal-popup-subtitle" style={{marginBottom:'10px'}}>Brain Dumps</div>
              <div style={{maxHeight:'150px', overflowY:'auto'}}>
                {selectedDayData.dayNotes.map((n, i) => (
                   <div key={i} className="note-item-row">
                      <span className="note-content">"{n.content}"</span>
                      <button className="btn-delete-note" onClick={() => deleteNote(n.id)} title="Delete Note">✕</button>
                   </div>
                ))}
              </div>
            </div>
          )}

          <div className="cal-popup-subtitle" style={{marginBottom:'10px'}}>Sessions</div>
          <div className="cal-session-list">
            {selectedDayData.sessions.length === 0 ? ( <p style={{textAlign:'center', color:'#555', marginTop:'20px'}}>No activity recorded.</p> ) : (
              selectedDayData.sessions.map((s, i) => (
                <div key={i} className={`cal-session-item ${s.status === 'COMPLETED' ? 'completed' : 'abandoned'}`}>
                  <div>
                    <div className="cal-sess-time">{Math.floor(s.duration / 60)} mins {s.status === 'ABANDONED' && <span style={{color:'#ff4d4d', fontSize:'0.7rem', marginLeft:'8px'}}>(ABANDONED)</span>}</div>
                    <div className="cal-sess-tags">{new Date(s.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                      <div style={{fontSize:'1.2rem'}}>{getTreeIcon(s)}</div>
                      <div style={{fontSize:'0.7rem', color:'#666'}}>{s.energy_level} • {s.difficulty}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCalendar = () => {
    const { daysInMonth, firstDay, year, month } = getDaysInMonth(calendarDate);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSlots = [...blanks, ...days];

    return (
      <div className="glass-panel calendar-container">
        <div className="cal-header">
          <button className="cal-nav-btn" onClick={() => changeMonth(-1)}>‹</button>
          <div className="cal-title">{monthNames[month]} <span style={{color:'rgba(255,255,255,0.3)'}}>{year}</span></div>
          <button className="cal-nav-btn" onClick={() => changeMonth(1)}>›</button>
        </div>
        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-day-label">{d}</div>)}
          {totalSlots.map((day, index) => {
            if (!day) return <div key={index} className="cal-cell" style={{opacity:0, pointerEvents:'none'}}></div>;
            const sessions = getSessionsForDay(day, month, year);
            const dayNotes = getNotesForDay(day, month, year);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            return (
              <div key={index} className={`cal-cell ${isToday ? 'today' : ''}`} onClick={() => handleDayClick(day, month, year, sessions, dayNotes)}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <span className="cal-date-num">{day}</span>
                    {dayNotes.length > 0 && <span className="cal-icon-indicator">🧠</span>}
                </div>
                <div className="cal-dots-row">
                  {sessions.map((s, i) => ( <div key={i} className={`cal-dot ${s.status === 'COMPLETED' ? 'completed' : 'abandoned'}`}></div> ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- RENDER HELPERS ---
  const togglePriority = (id) => { setPriorities(priorities.map(p => p.id === id ? {...p, done: !p.done} : p)); };
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60); const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const toggleFullScreen = () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>console.log(e)); else if (document.exitFullscreen) document.exitFullscreen(); };

  const generateInsights = () => {
      const completed = trees.filter(t => t.status === 'COMPLETED');
      const totalSessions = trees.length || 1;
      const completionRate = Math.round((completed.length / totalSessions) * 100);
      const today = new Date().toDateString();
      const todayMins = Math.floor(completed.filter(t => new Date(t.created_at).toDateString() === today).reduce((acc,c)=>acc+c.duration,0)/60);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
      const yestMins = Math.floor(completed.filter(t => new Date(t.created_at).toDateString() === yesterday.toDateString()).reduce((acc,c)=>acc+c.duration,0)/60);
      const dailyDelta = todayMins - yestMins;
      const totalHours = Math.floor(completed.reduce((acc,c)=>acc+c.duration,0)/3600);

      const dayCounts = {};
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      completed.forEach(t => { const d = days[new Date(t.created_at).getDay()]; dayCounts[d] = (dayCounts[d]||0) + t.duration; });
      let bestDay='-', worstDay='-', bestVal=0, worstVal=Infinity;
      Object.keys(dayCounts).forEach(d => { if(dayCounts[d]>bestVal){bestVal=dayCounts[d];bestDay=d;} if(dayCounts[d]<worstVal){worstVal=dayCounts[d];worstDay=d;} });
      if(worstVal===Infinity) worstVal=0; if(Object.keys(dayCounts).length<2) worstDay='N/A';

      const hours = completed.map(t => new Date(t.created_at).getHours());
      const freq = {}; let maxH = 0, peakH = 10;
      hours.forEach(h => { freq[h]=(freq[h]||0)+1; if(freq[h]>maxH){maxH=freq[h]; peakH=h} });
      const peakTime = `${peakH % 12 || 12}${peakH>=12?'PM':'AM'}`;
      const peakEnd = `${(peakH+2) % 12 || 12}${peakH+2>=12?'PM':'AM'}`;

      return { completionRate, todayMins, dailyDelta, peakTime, peakEnd, bestDay, bestDayHours: Math.floor(bestVal/3600), worstDay, worstDayHours: Math.floor(worstVal/3600), totalHours };
  };

  const renderBackground = () => {
    if (view === 'AMBIENT') return <div ref={vantaRef} style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }} />;
    if (bgType === 'SPLINE') return <Spline scene={view === 'FOCUS' ? FOCUS_SCENE : HOME_SCENE} />;
    if (bgType === 'IMAGE') return <img src={bgUrl} className="bg-media" alt="Background" />;
    if (bgType === 'VIDEO') return <video src={bgUrl} className="bg-media" autoPlay loop muted playsInline />;
    return null;
  };

  const getTreeIcon = (session) => {
      if (session.status === 'ABANDONED') return '🥀';
      const mins = session.duration / 60;
      if (mins < 10) return '🌱'; if (mins < 25) return '🌲'; if (mins < 50) return '🌳'; return '🏞️';                     
  };
  const getTreeDate = (dateString) => new Date(dateString).toLocaleDateString(undefined, { month:'short', day:'numeric'});

  const renderMusicPanel = () => (
    <div className={`music-panel ${showMusic ? 'active' : ''}`}>
      <div className="music-header-tabs">
        <button className={`music-tab ${musicTab === 'LIBRARY' ? 'active' : ''}`} onClick={() => setMusicTab('LIBRARY')}>Library</button>
        <button className={`music-tab ${musicTab === 'MY_MUSIC' ? 'active' : ''}`} onClick={() => setMusicTab('MY_MUSIC')}>Add New</button>
      </div>
      {musicTab === 'LIBRARY' && (
        <div className="playlist-grid">
          {playlists.map(p => (
            <div key={p.id} className="playlist-item" onClick={() => setCurrentUrl(p.url)}>
              <button className="btn-delete-playlist" onClick={(e) => deletePlaylist(e, p.id)} title="Remove Playlist">×</button>
              <span className="playlist-icon">{p.icon || '🎵'}</span>
              <span className="playlist-name">{p.name}</span>
            </div>
          ))}
        </div>
      )}
      {musicTab === 'MY_MUSIC' && (
        <div className="custom-playlist-form">
          <input className="music-input" placeholder="Paste Spotify Link..." value={newPlaylistUrl} onChange={(e) => setNewPlaylistUrl(e.target.value)} />
          <div className="music-add-row">
            <input className="music-input" placeholder="Icon" style={{width:'60px', textAlign:'center'}} value={newPlaylistIcon} onChange={(e) => setNewPlaylistIcon(e.target.value)} />
            <input className="music-input" placeholder="Playlist Name..." style={{flex:1}} value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
          </div>
          <div style={{textAlign:'left'}}>
              <p style={{fontSize:'0.7rem', color:'#888', marginBottom:'5px', marginLeft:'5px'}}>SELECT ICON</p>
              <div className="emoji-scroll-bar">
                  {EMOJI_OPTIONS.map(e => (
                      <button key={e} className={`emoji-option ${newPlaylistIcon === e ? 'selected' : ''}`} onClick={()=>setNewPlaylistIcon(e)}>{e}</button>
                  ))}
              </div>
          </div>
          <button className="btn-music-action" onClick={savePlaylist}>Save & Play</button>
        </div>
      )}
      {currentUrl && (
        <div className="active-player-container">
           <iframe src={currentUrl} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
      )}
    </div>
  );

  const getDisplayTime = () => {
      if (focusTab === 'WORK') return formatTime(workSeconds);
      if (focusTab === 'SHORT_BREAK' || focusTab === 'LONG_BREAK') return formatTime(breakSeconds);
      return '00:00';
  };

  const { workLabel, breakLabel } = calculateEffectiveTimes(workOverride ? parseInt(workOverride) : 25, breakOverride ? parseInt(breakOverride) : 5, energy, difficulty);
  const insights = generateInsights();
  const getDistStats = (key) => {
     const counts = {}; trees.filter(t=>t.status === 'COMPLETED').forEach(t => { const v = t[key] || 'MED'; counts[v] = (counts[v]||0)+1; });
     const total = trees.filter(t=>t.status === 'COMPLETED').length || 1;
     return Object.keys(counts).map(k => ({ label: k, pct: (counts[k]/total)*100, count: counts[k] }));
  };

  return (
    <div className="app-container" style={{"--dynamic-font": activeFont}}>
      <div className="pip-wrapper"><canvas ref={canvasRef} width="500" height="500" /><video ref={videoRef} muted playsInline /></div>

      <div className="scene-wrapper" style={{ opacity: 1 }}>{renderBackground()}</div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        {view === 'HOME' && (
             <div className="glass-panel">
             <h1 className="home-title">TOFFEE TIME 🐕</h1>
             <div style={{ marginBottom: '20px' }}>
                <SelectorTag label="Energy Level" selected={energy} onSelect={setEnergy} options={[{label:'Low', value:'LOW', icon:'🪫'}, {label:'Med', value:'MED', icon:'🔋'}, {label:'High', value:'HIGH', icon:'⚡'}]} />
                <SelectorTag label="Task Difficulty" selected={difficulty} onSelect={setDifficulty} options={[{label:'Easy', value:'EASY', icon:'🃏'}, {label:'Med', value:'MED', icon:'⚖️'}, {label:'Hard', value:'HARD', icon:'🔥'}]} />
             </div>
             <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
               <div style={{flex:1}}> <p className="section-title">Target (M)</p> <input type="number" className="time-input" value={targetMinutes} readOnly /> {workLabel !== "Base" && <div className="modifier-text">{workLabel}</div>}</div>
               <div style={{flex:1}}> <p className="section-title">Break (M)</p> <input type="number" className="time-input" value={Math.floor(breakSeconds/60)} readOnly /> {breakLabel !== "Base" && <div className="modifier-text">{breakLabel}</div>}</div>
             </div>
             <button className="btn-gamified" onClick={startStandardSession}>START SESSION</button>
           </div>
        )}

        {view === 'AMBIENT' && (
            <div className="ambient-card">
            <div className="ambient-label">{mode === 'BREAK' ? 'AMBIENT BREAK' : mode === 'WORK' ? 'WORK SESSION' : 'READY'}</div>
            <div className="ambient-time">{mode === 'BREAK' ? formatTime(breakSeconds) : mode === 'WORK' ? formatTime(workSeconds) : '10:00'}</div>
            <div className="ambient-controls">
               {mode === 'BREAK' ? (
                 <> {!isActive ? <button className="btn-ambient-primary" onClick={() => setIsActive(true)}>START</button> : <button className="btn-ambient-secondary" onClick={() => setIsActive(false)}>PAUSE</button>} <button className="btn-ambient-secondary" onClick={skipBreak}>SKIP BREAK</button> </>
               ) : mode === 'WORK' ? (
                 <> <button className="btn-ambient-secondary" onClick={() => setIsActive(!isActive)}>{isActive ? 'PAUSE' : 'RESUME'}</button> <button className="btn-ambient-primary" onClick={finishWorkAndCalcBreak}>FINISH</button> </>
               ) : <button className="btn-ambient-primary" onClick={setupAmbientBreak}>SETUP BREAK</button>}
            </div>
          </div>
        )}

        {view === 'FOCUS' && (
            <div className="focus-container">
                <div className={`zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`} style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
                    <button className="btn-text-priority" onClick={() => setShowPriorities(!showPriorities)}>Focus Priorities ▾</button>
                    {showPriorities && (
                        <div className="priority-popup">
                            {priorities.map((p) => (
                                <div key={p.id} className="priority-item">
                                    <input type="checkbox" className="priority-checkbox" checked={p.done} onChange={() => togglePriority(p.id)} />
                                    <input type="text" className="priority-input" defaultValue={p.text} style={{textDecoration: p.done ? 'line-through' : 'none', color: p.done ? '#666' : 'white'}} />
                                </div>
                            ))}
                            <button style={{background:'none', border:'none', color:'#888', fontSize:'0.8rem', cursor:'pointer'}} onClick={() => setPriorities([...priorities, {id: Date.now(), text: 'New Task', done: false}])}>+ Add Task</button>
                        </div>
                    )}
                    <div className="focus-tabs-container">
                        <button className={`focus-tab-btn ${focusTab === 'WORK' ? 'active' : ''}`} onClick={() => handleFocusTabChange('WORK')}>Focus</button>
                        <button className={`focus-tab-btn ${focusTab === 'SHORT_BREAK' ? 'active' : ''}`} onClick={() => handleFocusTabChange('SHORT_BREAK')}>Short Break</button>
                        <button className={`focus-tab-btn ${focusTab === 'LONG_BREAK' ? 'active' : ''}`} onClick={() => handleFocusTabChange('LONG_BREAK')}>Long Break</button>
                    </div>
                </div>

                <div className="focus-timer-large">{getDisplayTime()}</div>

                <div className={`focus-controls-row zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`}>
                    <button className="btn-icon-round" onClick={handleReset} title="Reset">↻</button>
                    <button className="btn-focus-main" onClick={() => setIsActive(!isActive)}>{isActive ? 'PAUSE' : 'START'}</button>
                    <button className="btn-icon-round" onClick={handlePin} title="Pin Up">📌</button>
                </div>
                {focusTab === 'WORK' && <button className={`zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`} style={{marginTop: '20px', background:'none', border:'none', color:'#666', cursor:'pointer'}} onClick={finishWorkAndCalcBreak}>End Session</button>}
          </div>
        )}
        
        {view === 'FOREST' && (
          <div className="glass-panel forest-container">
            <h1 style={{fontSize: '2.5rem', marginBottom: '20px'}}>MY FOREST</h1>
            <div className="forest-stats-row">
                <div className="forest-stat"><span className="f-val">{streak}</span><span className="f-label">Trees Planted</span></div>
                <div className="forest-stat"><span className="f-val">{Math.floor((trees.filter(t=>t.status === 'COMPLETED').reduce((acc, curr) => acc + (curr.duration || 0), 0)) / 60)}</span><span className="f-label">Total Minutes</span></div>
            </div>
            <div className="forest-grid">
                {trees.length === 0 && <p style={{gridColumn: '1/-1', color: '#666', marginTop: '20px'}}>No sessions yet. Start focusing to grow your forest!</p>}
                {trees.map((t, index) => (
                    <div key={index} className="tree-item" style={{ opacity: t.status === 'ABANDONED' ? 0.6 : 1 }}>
                        {getTreeIcon(t)}
                        <div className="tree-tooltip">
                            <div className="tt-row"><span>Date</span> <span className="tt-val">{getTreeDate(t.created_at)}</span></div>
                            <div className="tt-row"><span>Time</span> <span className="tt-val">{Math.floor(t.duration/60)}m</span></div>
                            <div className="tt-row"><span>Status</span> <span className="tt-val" style={{color: t.status === 'ABANDONED' ? '#ff4d4d' : '#4dff88'}}>{t.status || 'COMPLETED'}</span></div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {view === 'CALENDAR' && renderCalendar()}

      </div>

      {renderDayPopup()}

      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 90 }}>
        <div className="quote-container"><div className="quote-text">"{currentQuote.quote}"</div><div className="quote-author">- {currentQuote.author}</div></div>
      </div>

      {/* --- BRAIN DUMP PANEL --- */}
      <div className={`brain-panel ${showBrain ? 'active' : ''}`}>
        <div className="brain-title">🧠 Brain Dump</div>
        <textarea 
          className="brain-input" 
          placeholder="What's on your mind? Ideas, tasks, or random thoughts..." 
          value={noteInput}
          onChange={(e) => setNoteInput(e.target.value)}
        />
        <button className="btn-save-note" onClick={saveNote}>Save </button>
      </div>

      {/* --- WIDGET CONTROLS (Bottom Left) --- */}
      <div className={`zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`} style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 90, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {renderMusicPanel()}
        
        {/* ROW FOR BUTTONS */}
        <div style={{display:'flex', gap:'10px'}}>
          <button className={`music-toggle-btn ${showMusic ? 'active' : ''}`} onClick={() => {setShowMusic(!showMusic); setShowBrain(false);}} title="Music Player">🎵</button>
          <button className={`brain-toggle-btn ${showBrain ? 'active' : ''}`} onClick={() => {setShowBrain(!showBrain); setShowMusic(false);}} title="Brain Dump">🧠</button>
        </div>
      </div>

      <div className={`bottom-dock zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`}>
        <div className="dock-pill">
          <button className={`dock-mode-btn ${view === 'AMBIENT' ? 'active' : ''}`} onClick={() => { setView('AMBIENT'); if(mode==='HOME') setupAmbientBreak(); }} title="Ambient Mode">🍃</button>
          <button className={`dock-mode-btn ${view === 'HOME' ? 'active' : ''}`} onClick={() => setView('HOME')} title="Home">🏠</button>
          <button className={`dock-mode-btn ${view === 'FOCUS' ? 'active' : ''}`} onClick={() => setView('FOCUS')} title="Focus Mode">💡</button>
        </div>
        <button className={`dock-icon-btn ${view === 'FOREST' ? 'active' : ''}`} onClick={() => setView('FOREST')}>🎄</button>
        <button className={`dock-icon-btn ${view === 'CALENDAR' ? 'active' : ''}`} onClick={() => setView('CALENDAR')} title="Calendar">📅</button>
        <button className="dock-icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        <button className="dock-icon-btn" onClick={toggleFullScreen}>⛶</button>
      </div>

      {showSettings && <div className="settings-overlay" onClick={() => setShowSettings(false)} />}
      <div className={`settings-sidebar ${showSettings ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '2rem', margin: 0 }}>Menu</h2>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor:'pointer' }}>✕</button>
        </div>
        
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'TIMER' ? 'active' : ''}`} onClick={() => setActiveTab('TIMER')}>Timer</button>
          <button className={`tab-btn ${activeTab === 'APPEARANCE' ? 'active' : ''}`} onClick={() => setActiveTab('APPEARANCE')}>Appearance</button>
          <button className={`tab-btn ${activeTab === 'ANALYTICS' ? 'active' : ''}`} onClick={() => setActiveTab('ANALYTICS')}>Analytics</button>
        </div>

        {activeTab === 'TIMER' && (
            <div className="settings-card">
                <div className="setting-input-group">
                    <label className="setting-label">Base Work Duration (Default: 25)</label>
                    <input type="number" className="setting-field" placeholder="25" value={tempWork} onChange={(e) => setTempWork(e.target.value)} />
                    {tempWork && <div className="calc-preview"><span>Base: {tempWork}m</span><span className="calc-highlight">Effect: {calculateEffectiveTimes(parseInt(tempWork), 5, energy, difficulty).finalWork}m</span></div>}
                </div>
                <div className="setting-input-group">
                    <label className="setting-label">Base Break Duration (Default: 5)</label>
                    <input type="number" className="setting-field" placeholder="5" value={tempBreak} onChange={(e) => setTempBreak(e.target.value)} />
                     {tempBreak && <div className="calc-preview"><span>Base: {tempBreak}m</span><span className="calc-highlight">Effect: {calculateEffectiveTimes(25, parseInt(tempBreak), energy, difficulty).finalBreak}m</span></div>}
                </div>
                <p className="sub-text">Modifiers (Energy/Difficulty) are applied on top of these base values.</p>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn-setting-action" onClick={applyTimerSettings}>Apply Changes</button>
                    <button className="btn-setting-secondary" onClick={resetTimerSettings}>Reset Default</button>
                </div>
            </div>
        )}

        {activeTab === 'APPEARANCE' && (
            <div className="settings-card">
                <h4 style={{marginBottom:'15px', color:'#ccc'}}>App Font</h4>
                <div className="font-selector-grid">
                    {fontOptions.map(font => (
                        <div key={font.name} className={`font-btn ${tempFont === font.value ? 'active' : ''}`} onClick={() => setTempFont(font.value)}>
                            <span className="font-preview" style={{fontFamily: font.value}}>{font.preview}</span><span className="font-name">{font.name}</span>
                        </div>
                    ))}
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn-setting-action" onClick={applyFontSettings}>Apply Font</button>
                    <button className="btn-setting-secondary" onClick={resetFontSettings}>Reset</button>
                </div>
                <div className="settings-divider"></div>
                <h4 style={{marginBottom:'15px', color:'#ccc'}}>Background Scene</h4>
                <label className="btn-small-primary" style={{ display: 'block', textAlign: 'center', padding: '10px', marginTop: '10px' }}>
                      Choose File <input type="file" onChange={handleBackgroundUpload} className="hidden-input" accept="image/*,video/*" />
                </label>
                <div className="preset-grid">
                  <div className="preset-item" onClick={() => setBgType('SPLINE')}>
                      <div className="preset-preview" style={{ background: 'linear-gradient(45deg, #00f2ff, #bd00ff)' }}></div><span>Default 3D</span>
                  </div>
                  {customBackgrounds.map(bg => (
                      <div key={bg.id} className="preset-item" onClick={() => { setBgType(bg.type === 'video' ? 'VIDEO' : 'IMAGE'); setBgUrl(bg.url); }}>
                          {bg.type === 'image' ? ( <img src={bg.url} className="preset-preview" alt={bg.name} /> ) : ( <video src={bg.url} className="preset-preview" muted /> )}
                          <span>{bg.name.substring(0,8)}...</span>
                      </div>
                  ))}
                </div>
            </div>
        )}

        {activeTab === 'ANALYTICS' && (
          <div className="analytics-dashboard">
            <div className="bento-grid">
                <div className="bento-card wide card-violet">
                    <div className="bento-label">⚡ Today's Focus</div>
                    <div className="bento-value text-gradient-gold">{insights.todayMins} <span style={{fontSize:'1.5rem', color:'#ccc'}}>mins</span></div>
                    <div className="insight-text">{insights.dailyDelta >= 0 ? `You focused ${insights.dailyDelta}m more than yesterday.` : `You are ${Math.abs(insights.dailyDelta)}m shy of yesterday's mark.`}<span className="sub-insight">Keep the momentum going!</span></div>
                </div>
                <div className="bento-card card-blue">
                    <div className="bento-label">🕒 Peak Performance</div>
                    <div className="insight-text">You are most focused between <span className="highlight-gold">{insights.peakTime} - {insights.peakEnd}</span>.</div>
                    <span className="sub-insight" style={{marginTop:'15px'}}>Protect this time for deep work.</span>
                </div>
                <div className="bento-card card-emerald">
                    <div className="bento-label">🎯 Consistency</div>
                    <div className="bento-value">{insights.completionRate}% <span style={{fontSize:'1rem', color:'#888'}}>Completion</span></div>
                    <div className="completion-bar-bg"><div className="completion-bar-fill" style={{width: `${insights.completionRate}%`}}></div></div>
                    <span className="sub-insight">Sessions finished vs abandoned.</span>
                </div>
                <div className="bento-card card-orange">
                    <div className="bento-label">🚀 Total Growth</div>
                    <div className="bento-value text-gradient-cyan">{insights.totalHours} <span style={{fontSize:'1rem'}}>hrs</span></div>
                    <span className="sub-insight">Total focus time logged.</span>
                </div>
                <div className="bento-card wide card-pink">
                    <div className="bento-label">📅 Weekly Pattern</div>
                    <div className="day-comp-row">
                        <div className="day-comp-col"><span className="day-name">Best Day</span><span className="day-val">{insights.bestDay}</span><span className="sub-insight">{insights.bestDayHours} hrs</span></div>
                        <div className="day-delta-arrow">➜</div>
                        <div className="day-comp-col"><span className="day-name">Lowest Day</span><span className="day-val">{insights.worstDay}</span><span className="sub-insight">{insights.worstDayHours} hrs</span></div>
                    </div>
                </div>
            </div>
            <div className="analytics-section">
                <p className="analytics-title">Energy Distribution</p>
                {getDistStats('energy_level').map((d, i) => (
                    <div key={i} className="dist-row">
                        <span className="dist-label">{d.label}</span>
                        <div className="dist-bar-bg"><div className="dist-bar-fill" style={{ width: `${d.pct}%` }}></div></div>
                        <span className="dist-val">{d.count}</span>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
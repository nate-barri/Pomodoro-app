import React, { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline'; 
import { supabase } from './supabaseClient'; 
import './App.css';

// --- CONFIGURATION ---
const HOME_SCENE = "https://prod.spline.design/c061UZajAbTdVul9/scene.splinecode";
// AMBIENT_SCENE is handled by Vanta.js
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

  // --- FOCUS MODE NEW FEATURES ---
  const [focusTab, setFocusTab] = useState('WORK'); 
  const [showPriorities, setShowPriorities] = useState(false);
  const [priorities, setPriorities] = useState([{id: 1, text: 'Main Task', done: false}]);

  // --- GAMIFICATION STATE ---
  const [energy, setEnergy] = useState('MED');
  const [difficulty, setDifficulty] = useState('MED');
  const [streak, setStreak] = useState(0);
  const [trees, setTrees] = useState([]); 
  const [currentQuote, setCurrentQuote] = useState({ quote: "Loading...", author: "" });
  
  // --- ZEN MODE STATE ---
  const [userActive, setUserActive] = useState(true);
  const inputTimeoutRef = useRef(null);

  const alarmAudio = useRef(typeof Audio !== "undefined" ? new Audio(ALARM_URL) : null);
  const canvasRef = useRef(null); 
  const videoRef = useRef(null);  
  const vantaRef = useRef(null);

  // --- INIT DATA ---
  useEffect(() => {
    const initData = async () => {
      const { data: pData } = await supabase.from('playlists').select('*');
      if (pData) setPlaylists([...PRESET_PLAYLISTS, ...pData]);
      
      const { data: bgData } = await supabase.from('backgrounds').select('*');
      if (bgData) setCustomBackgrounds(bgData);
      
      const { data: sData } = await supabase.from('sessions').select('*');
      if (sData) { setTrees(sData); setStreak(sData.filter(s => s.status !== 'ABANDONED').length); }

      try {
        const response = await fetch('https://dummyjson.com/quotes/random');
        if (response.ok) {
          const data = await response.json();
          setCurrentQuote({ quote: data.quote, author: data.author });
        } else { throw new Error("API Failed"); }
      } catch (error) {
        console.warn("Quote API failed", error);
        setCurrentQuote({ quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" });
      }
    };
    initData();
  }, []);

  // --- ZEN MODE / AUTO-HIDE LOGIC ---
  useEffect(() => {
    const handleActivity = () => {
      setUserActive(true);
      
      // Clear existing timer
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);

      // Only set timer to hide if: 
      // 1. We are in FOCUS view 
      // 2. The timer is RUNNING (isActive)
      if (view === 'FOCUS' && isActive) {
        inputTimeoutRef.current = setTimeout(() => {
          setUserActive(false);
        }, 3000); // Hides after 3 seconds of no movement
      }
    };

    // Listen for mouse or clicks
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);

    // Initial trigger
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
    };
  }, [view, isActive]); 

  // --- VANTA.JS EFFECT FOR AMBIENT MODE ---
  useEffect(() => {
    let vantaEffect = null;

    if (view === 'AMBIENT' && vantaRef.current) {
        const loadVanta = async () => {
            // Load Three.js if not present
            if (!window.THREE) {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
                    script.onload = resolve;
                    document.body.appendChild(script);
                });
            }
            // Load Vanta Waves if not present
            if (!window.VANTA) {
                await new Promise((resolve) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.waves.min.js';
                    script.onload = resolve;
                    document.body.appendChild(script);
                });
            }

            // Initialize Vanta
            if (window.VANTA && vantaRef.current && !vantaEffect) {
                vantaEffect = window.VANTA.WAVES({
                    el: vantaRef.current,
                    mouseControls: true,
                    touchControls: true,
                    gyroControls: false,
                    minHeight: 200.00,
                    minWidth: 200.00,
                    scale: 1.00,
                    scaleMobile: 1.00,
                    color: 0x005588, // UPDATED: Blue Color (0x5588)
                    shininess: 30,
                    waveHeight: 20,
                    waveSpeed: 0.7,
                    zoom: 0.8
                });
            }
        };
        loadVanta();
    }

    return () => {
        if (vantaEffect) vantaEffect.destroy();
    };
  }, [view]);


  // --- HELPER: CALCULATE EFFECTIVE TIME ---
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

  // --- INTELLIGENT SCHEDULER ---
  useEffect(() => {
      const baseWork = workOverride && !isNaN(workOverride) ? parseInt(workOverride) : 25;
      const baseBreak = breakOverride && !isNaN(breakOverride) ? parseInt(breakOverride) : 5;
      const { finalWork, finalBreak } = calculateEffectiveTimes(baseWork, baseBreak, energy, difficulty);

      setTargetMinutes(finalWork);
      if (mode === 'HOME') setBreakSeconds(finalBreak * 60);
  }, [energy, difficulty, mode, workOverride, breakOverride]);

  // --- SETTINGS HANDLERS ---
  const applyTimerSettings = () => {
      setWorkOverride(tempWork);
      setBreakOverride(tempBreak);
      alert("Timer Base Settings updated! Modifiers will apply to new base.");
  };

  const resetTimerSettings = () => {
      setTempWork(''); setTempBreak(''); setWorkOverride(''); setBreakOverride('');
      alert("Timer reset to Default Auto-Calculation.");
  };

  const applyFontSettings = () => { setActiveFont(tempFont); alert("Appearance updated!"); };
  const resetFontSettings = () => { 
      const defaultFont = "'Clash Display', sans-serif";
      setTempFont(defaultFont); setActiveFont(defaultFont); 
      alert("Appearance reset to default."); 
  };

  // --- HANDLERS ---
  const handleBackgroundUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

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
    const newPlaylists = playlists.filter(p => p.id !== id);
    setPlaylists(newPlaylists);
    await supabase.from('playlists').delete().eq('id', id);
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
             if (prev <= 1) {
                if (alarmAudio.current) alarmAudio.current.play();
                setIsActive(false); return 0;
             }
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
    const baseBreak = breakOverride && !isNaN(breakOverride) ? parseInt(breakOverride) : 5;
    const { finalBreak } = calculateEffectiveTimes(25, baseBreak, energy, difficulty);
    const overtime = Math.max(0, workSeconds - (targetMinutes * 60));
    setBreakSeconds((finalBreak * 60) + overtime); 
    
    setStreak(s => s + 1); 
    const newSession = { 
        duration: workSeconds, 
        created_at: new Date(), 
        energy_level: energy, 
        difficulty: difficulty,
        status: 'COMPLETED' 
    };
    setTrees(prev => [...prev, newSession]);
    await supabase.from('sessions').insert([newSession]);

    setMode('BREAK'); setView('FOCUS'); setFocusTab('SHORT_BREAK');
  };

  const handleReset = async () => {
      if (mode === 'WORK' && workSeconds > 60) {
          const abandonedSession = { 
              duration: workSeconds, 
              created_at: new Date(), 
              energy_level: energy, 
              difficulty: difficulty,
              status: 'ABANDONED'
          };
          setTrees(prev => [...prev, abandonedSession]);
          await supabase.from('sessions').insert([abandonedSession]); 
      }
      setIsActive(false);
      setWorkSeconds(0);
      if(focusTab === 'SHORT_BREAK') setBreakSeconds(5*60);
      if(focusTab === 'LONG_BREAK') setBreakSeconds(15*60);
  };

  // --- PIN UP / PIP LOGIC ---
  const updatePiPCanvas = () => {
      const canvas = canvasRef.current;
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#111');
      grad.addColorStop(1, '#222');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const textColor = mode === 'BREAK' ? '#bd00ff' : '#00f2ff';
      const timeStr = getDisplayTime();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px "Clash Display", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(timeStr, width/2, height/2 - 20);

      const label = mode === 'BREAK' ? 'BREAK' : 'FOCUS';
      ctx.fillStyle = textColor;
      ctx.font = '600 40px "Clash Display", sans-serif';
      ctx.fillText(label, width/2, height/2 + 80);

      let progress = 0;
      if(mode === 'WORK') progress = Math.min(1, workSeconds / (targetMinutes * 60));
      else progress = 1 - (breakSeconds / (5 * 60));

      ctx.fillStyle = textColor;
      ctx.fillRect(0, height - 20, width * progress, 20);
  };

  useEffect(() => {
      updatePiPCanvas();
  }, [workSeconds, breakSeconds, mode]);

  const handlePin = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      try {
          if (document.pictureInPictureElement) {
              await document.exitPictureInPicture();
          } else {
              if (!video.srcObject) {
                  const stream = canvas.captureStream(30);
                  video.srcObject = stream;
              }
              if (video.readyState === 0) {
                  await new Promise(resolve => { video.onloadedmetadata = resolve; });
              }
              await video.play();
              await video.requestPictureInPicture();
          }
      } catch (err) {
          console.error("PiP Error:", err);
          if (err.name !== 'AbortError') {
              alert("Failed to enter Picture-in-Picture mode.");
          }
      }
  };

  const handleFocusTabChange = (type) => { 
      setFocusTab(type);
      setIsActive(false);
      if(type === 'WORK') { 
          const baseW = workOverride ? parseInt(workOverride) : 25;
          const { finalWork } = calculateEffectiveTimes(baseW, 5, energy, difficulty);
          setTargetMinutes(finalWork); 
          setWorkSeconds(0); setMode('WORK'); 
      }
      if(type === 'SHORT_BREAK') { setBreakSeconds(5 * 60); setMode('BREAK'); }
      if(type === 'LONG_BREAK') { setBreakSeconds(15 * 60); setMode('BREAK'); }
  };

  const togglePriority = (id) => { setPriorities(priorities.map(p => p.id === id ? {...p, done: !p.done} : p)); };
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e => console.log(e));
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  // --- INSIGHT ANALYTICS LOGIC ---
  const generateInsights = () => {
      const completed = trees.filter(t => t.status !== 'ABANDONED');
      const totalSessions = trees.length || 1;
      const completionRate = Math.round((completed.length / totalSessions) * 100);
      const today = new Date().toDateString();
      const todayMins = Math.floor(completed.filter(t => new Date(t.created_at).toDateString() === today).reduce((acc,c)=>acc+c.duration,0)/60);
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
      const yestMins = Math.floor(completed.filter(t => new Date(t.created_at).toDateString() === yesterday.toDateString()).reduce((acc,c)=>acc+c.duration,0)/60);
      const dailyDelta = todayMins - yestMins;
      const hours = completed.map(t => new Date(t.created_at).getHours());
      const freq = {};
      let maxH = 0, peakH = 10;
      hours.forEach(h => { freq[h] = (freq[h]||0)+1; if(freq[h]>maxH){maxH=freq[h]; peakH=h} });
      const peakTime = `${peakH % 12 || 12}${peakH>=12?'PM':'AM'}`;
      const peakEnd = `${(peakH+2) % 12 || 12}${peakH+2>=12?'PM':'AM'}`;
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dayCounts = {};
      completed.forEach(t => { const d = days[new Date(t.created_at).getDay()]; dayCounts[d] = (dayCounts[d]||0) + t.duration; });
      let bestDay='-', worstDay='-', bestVal=0, worstVal=99999999;
      Object.keys(dayCounts).forEach(d => {
          if(dayCounts[d] > bestVal) { bestVal = dayCounts[d]; bestDay = d; }
          if(dayCounts[d] < worstVal) { worstVal = dayCounts[d]; worstDay = d; }
      });
      if(Object.keys(dayCounts).length < 2) { worstDay = 'N/A'; worstVal=0; }
      const totalHours = Math.floor(completed.reduce((acc,c)=>acc+c.duration,0)/3600);
      return { completionRate, todayMins, dailyDelta, peakTime, peakEnd, bestDay, bestDayHours: Math.floor(bestVal/3600), worstDay, worstDayHours: Math.floor(worstVal/3600), totalHours };
  };

  const renderBackground = () => {
    if (view === 'AMBIENT') {
        return <div ref={vantaRef} style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0 }} />;
    }
    if (bgType === 'SPLINE') {
        let scene = HOME_SCENE;
        if (view === 'FOCUS') scene = FOCUS_SCENE; 
        return <Spline scene={scene} />;
    }
    if (bgType === 'IMAGE') return <img src={bgUrl} className="bg-media" alt="Background" />;
    if (bgType === 'VIDEO') return <video src={bgUrl} className="bg-media" autoPlay loop muted playsInline />;
    return null;
  };
  const getTreeIcon = (seconds) => {
      const mins = seconds / 60;
      if (mins < 10) return '🌱'; if (mins < 25) return '🌲'; if (mins < 50) return '🌳'; return '🏞️';                     
  };
  const getTreeDate = (dateString) => {
      if(!dateString) return 'Just now';
      return new Date(dateString).toLocaleDateString(undefined, { month:'short', day:'numeric'});
  };

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

  const { workLabel, breakLabel } = calculateEffectiveTimes(
      workOverride ? parseInt(workOverride) : 25,
      breakOverride ? parseInt(breakOverride) : 5,
      energy,
      difficulty
  );

  const insights = generateInsights();

  // --- ANALYTICS RENDERING ---
  const getDistStats = (key) => {
     const counts = {};
     trees.filter(t=>t.status!=='ABANDONED').forEach(t => { const v = t[key] || 'MED'; counts[v] = (counts[v]||0)+1; });
     const total = trees.filter(t=>t.status!=='ABANDONED').length || 1;
     return Object.keys(counts).map(k => ({ label: k, pct: (counts[k]/total)*100, count: counts[k] }));
  };

  return (
    <div className="app-container" style={{"--dynamic-font": activeFont}}>
      {/* --- HIDDEN PIP ELEMENTS --- */}
      <div className="pip-wrapper">
          <canvas ref={canvasRef} width="500" height="500" />
          <video ref={videoRef} muted playsInline />
      </div>

      {/* 1. BACKGROUND LAYER */}
      <div className="scene-wrapper" style={{ opacity: 1 }}>
         {renderBackground()}
      </div>

      {/* 2. MAIN INTERFACE LAYER */}
      <div style={{ position: 'relative', zIndex: 10 }}>
        
        {/* VIEW: HOME */}
        {view === 'HOME' && (
             <div className="glass-panel">
             <h1 className="home-title">HYPER FOCUS</h1>
             <div style={{ marginBottom: '20px' }}>
                <SelectorTag label="Energy Level" selected={energy} onSelect={setEnergy} options={[{label:'Low', value:'LOW', icon:'🪫'}, {label:'Med', value:'MED', icon:'🔋'}, {label:'High', value:'HIGH', icon:'⚡'}]} />
                <SelectorTag label="Task Difficulty" selected={difficulty} onSelect={setDifficulty} options={[{label:'Easy', value:'EASY', icon:'🃏'}, {label:'Med', value:'MED', icon:'⚖️'}, {label:'Hard', value:'HARD', icon:'🔥'}]} />
             </div>
             <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
               <div style={{flex:1}}> 
                   <p className="section-title">Target (M)</p> 
                   <input type="number" className="time-input" value={targetMinutes} readOnly /> 
                   {workLabel !== "Base" && <div className="modifier-text">{workLabel}</div>}
               </div>
               <div style={{flex:1}}> 
                   <p className="section-title">Break (M)</p> 
                   <input type="number" className="time-input" value={Math.floor(breakSeconds/60)} readOnly /> 
                   {breakLabel !== "Base" && <div className="modifier-text">{breakLabel}</div>}
               </div>
             </div>
             <button className="btn-gamified" onClick={startStandardSession}>START SESSION</button>
           </div>
        )}

        {/* VIEW: AMBIENT */}
        {view === 'AMBIENT' && (
            <div className="ambient-card">
            <div className="ambient-label">{mode === 'BREAK' ? 'AMBIENT BREAK' : mode === 'WORK' ? 'WORK SESSION' : 'READY'}</div>
            <div className="ambient-time">{mode === 'BREAK' ? formatTime(breakSeconds) : mode === 'WORK' ? formatTime(workSeconds) : '10:00'}</div>
            <div className="ambient-controls">
               {mode === 'BREAK' ? (
                 <>
                   {!isActive ? <button className="btn-ambient-primary" onClick={() => setIsActive(true)}>START</button> : <button className="btn-ambient-secondary" onClick={() => setIsActive(false)}>PAUSE</button>}
                   <button className="btn-ambient-secondary" onClick={skipBreak}>SKIP BREAK</button>
                 </>
               ) : mode === 'WORK' ? (
                 <>
                   <button className="btn-ambient-secondary" onClick={() => setIsActive(!isActive)}>{isActive ? 'PAUSE' : 'RESUME'}</button>
                   <button className="btn-ambient-primary" onClick={finishWorkAndCalcBreak}>FINISH</button>
                 </>
               ) : <button className="btn-ambient-primary" onClick={setupAmbientBreak}>SETUP BREAK</button>}
            </div>
          </div>
        )}

        {/* VIEW: FOCUS (UPDATED FOR ZEN MODE) */}
        {view === 'FOCUS' && (
            <div className="focus-container">
                {/* Top Controls with Zen Fade */}
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

                {/* TIMER ALWAYS VISIBLE */}
                <div className="focus-timer-large">{getDisplayTime()}</div>

                {/* Bottom Controls with Zen Fade */}
                <div className={`focus-controls-row zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`}>
                    <button className="btn-icon-round" onClick={handleReset} title="Reset">↻</button>
                    <button className="btn-focus-main" onClick={() => setIsActive(!isActive)}>{isActive ? 'PAUSE' : 'START'}</button>
                    <button className="btn-icon-round" onClick={handlePin} title="Pin Up">📌</button>
                </div>
                {focusTab === 'WORK' && <button className={`zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`} style={{marginTop: '20px', background:'none', border:'none', color:'#666', cursor:'pointer'}} onClick={finishWorkAndCalcBreak}>End Session</button>}
          </div>
        )}
        
        {/* VIEW: FOREST */}
        {view === 'FOREST' && (
          <div className="glass-panel forest-container">
            <h1 style={{fontSize: '2.5rem', marginBottom: '20px'}}>MY FOREST</h1>
            <div className="forest-stats-row">
                <div className="forest-stat"><span className="f-val">{streak}</span><span className="f-label">Trees Planted</span></div>
                <div className="forest-stat"><span className="f-val">{Math.floor((trees.filter(t=>t.status!=='ABANDONED').reduce((acc, curr) => acc + (curr.duration || 0), 0)) / 60)}</span><span className="f-label">Total Minutes</span></div>
            </div>
            <div className="forest-grid">
                {trees.filter(t=>t.status!=='ABANDONED').length === 0 && <p style={{gridColumn: '1/-1', color: '#666', marginTop: '20px'}}>No sessions yet. Start focusing to grow your forest!</p>}
                {trees.filter(t=>t.status!=='ABANDONED').map((t, index) => (
                    <div key={index} className="tree-item">
                        {getTreeIcon(t.duration)}
                        <div className="tree-tooltip">
                            <div className="tt-row"><span>Date</span> <span className="tt-val">{getTreeDate(t.created_at)}</span></div>
                            <div className="tt-row"><span>Time</span> <span className="tt-val">{Math.floor(t.duration/60)}m</span></div>
                            <div className="tt-row"><span>Mode</span> <span className="tt-val">{t.difficulty || 'MED'}</span></div>
                        </div>
                    </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. WIDGETS (Music & Quotes) - Apply Zen Mode to Music */}
      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 90 }}>
        <div className="quote-container">
          <div className="quote-text">"{currentQuote.quote}"</div>
          <div className="quote-author">- {currentQuote.author}</div>
        </div>
      </div>

      <div className={`zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`} style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 90, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {renderMusicPanel()}
        <button className={`music-toggle-btn ${showMusic ? 'active' : ''}`} onClick={() => setShowMusic(!showMusic)} title="Music Player">🎵</button>
      </div>

      {/* 4. THE DOCK (Apply Zen Mode) */}
      <div className={`bottom-dock zen-ui ${view === 'FOCUS' && !userActive && isActive ? 'hidden' : ''}`}>
        <div className="dock-pill">
          <button className={`dock-mode-btn ${view === 'AMBIENT' ? 'active' : ''}`} onClick={() => { setView('AMBIENT'); if(mode==='HOME') setupAmbientBreak(); }} title="Ambient Mode">🍃</button>
          <button className={`dock-mode-btn ${view === 'HOME' ? 'active' : ''}`} onClick={() => setView('HOME')} title="Home">🏠</button>
          <button className={`dock-mode-btn ${view === 'FOCUS' ? 'active' : ''}`} onClick={() => setView('FOCUS')} title="Focus Mode">💡</button>
        </div>
        <button className={`dock-icon-btn ${view === 'FOREST' ? 'active' : ''}`} onClick={() => setView('FOREST')}>🎄</button>
        <button className="dock-icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        <button className="dock-icon-btn" onClick={toggleFullScreen}>⛶</button>
      </div>

      {/* 5. SETTINGS SIDEBAR */}
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

        {/* --- TIMER TAB --- */}
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

        {/* --- APPEARANCE TAB (MERGED) --- */}
        {activeTab === 'APPEARANCE' && (
            <div className="settings-card">
                {/* 1. FONTS SECTION */}
                <h4 style={{marginBottom:'15px', color:'#ccc'}}>App Font</h4>
                <div className="font-selector-grid">
                    {fontOptions.map(font => (
                        <div 
                            key={font.name} 
                            className={`font-btn ${tempFont === font.value ? 'active' : ''}`}
                            onClick={() => setTempFont(font.value)}
                        >
                            <span className="font-preview" style={{fontFamily: font.value}}>{font.preview}</span>
                            <span className="font-name">{font.name}</span>
                        </div>
                    ))}
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                    <button className="btn-setting-action" onClick={applyFontSettings}>Apply Font</button>
                    <button className="btn-setting-secondary" onClick={resetFontSettings}>Reset</button>
                </div>

                <div className="settings-divider"></div>

                {/* 2. THEMES / BACKGROUNDS SECTION */}
                <h4 style={{marginBottom:'15px', color:'#ccc'}}>Background Scene</h4>
                <label className="btn-small-primary" style={{ display: 'block', textAlign: 'center', padding: '10px', marginTop: '10px' }}>
                      Choose File
                      <input type="file" onChange={handleBackgroundUpload} className="hidden-input" accept="image/*,video/*" />
                </label>
                <div className="preset-grid">
                  <div className="preset-item" onClick={() => setBgType('SPLINE')}>
                      <div className="preset-preview" style={{ background: 'linear-gradient(45deg, #00f2ff, #bd00ff)' }}></div>
                      <span>Default 3D</span>
                  </div>
                  {customBackgrounds.map(bg => (
                      <div key={bg.id} className="preset-item" onClick={() => { setBgType(bg.type === 'video' ? 'VIDEO' : 'IMAGE'); setBgUrl(bg.url); }}>
                          {bg.type === 'image' ? (
                              <img src={bg.url} className="preset-preview" style={{ objectFit: 'cover' }} alt={bg.name} />
                          ) : (
                              <video src={bg.url} className="preset-preview" style={{ objectFit: 'cover' }} muted />
                          )}
                          <span>{bg.name.substring(0,8)}...</span>
                      </div>
                  ))}
                </div>
            </div>
        )}

        {/* --- ANALYTICS TAB --- */}
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
                    <div className="insight-text" style={{fontSize:'0.9rem', marginTop:'10px'}}>Try to schedule lighter tasks on {insights.worstDay === 'N/A' ? 'rest days' : insights.worstDay}s.</div>
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
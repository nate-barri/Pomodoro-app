import React, { useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline'; 
import axios from 'axios';
import './App.css';

// --- CONFIGURATION ---
const HOME_SCENE = "https://prod.spline.design/c061UZajAbTdVul9/scene.splinecode";
const AMBIENT_SCENE = "https://prod.spline.design/NOsFxKrgCM7qeitD/scene.splinecode";
const ALARM_URL = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";

const BACKUP_QUOTES = [{ quote: "Focus on being productive instead of busy.", author: "Tim Ferriss" }];

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

export default function App() {
  const [view, setView] = useState('HOME'); 
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('ANALYTICS'); 

  // --- MUSIC STATE ---
  const [showMusic, setShowMusic] = useState(false);
  const [musicTab, setMusicTab] = useState('LIBRARY'); 
  const [playlists, setPlaylists] = useState([]);
  const [currentUrl, setCurrentUrl] = useState(null);
  const [newPlaylistUrl, setNewPlaylistUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // --- APP STATE ---
  const [mode, setMode] = useState('HOME'); 
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(600); 
  const [isActive, setIsActive] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState(25);
  
  const [energy, setEnergy] = useState('MED');
  const [difficulty, setDifficulty] = useState('MED');
  const [streak, setStreak] = useState(0);
  const [trees, setTrees] = useState([]); 
  
  const [currentQuote, setCurrentQuote] = useState({ quote: "Loading...", author: "" });
  const alarmAudio = useRef(typeof Audio !== "undefined" ? new Audio(ALARM_URL) : null);

  // --- INIT DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const qRes = await axios.get('http://localhost:5000/api/quote');
        if(qRes.data) setCurrentQuote(qRes.data);
        const pRes = await axios.get('http://localhost:5000/api/playlists');
        if(pRes.data) setPlaylists(pRes.data);
      } catch (e) { 
        console.log("Backend offline, using backups."); 
        setCurrentQuote(BACKUP_QUOTES[0]);
      }
    };
    fetchData();
  }, []);

  // --- FULLSCREEN ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e => console.log(e));
    else if (document.exitFullscreen) document.exitFullscreen();
  };

  // --- MUSIC HANDLERS ---
  const savePlaylist = async () => {
    if(!newPlaylistUrl) return;
    try {
      const payload = { name: newPlaylistName || 'Custom', url: newPlaylistUrl };
      const res = await axios.post('http://localhost:5000/api/playlists', payload);
      setPlaylists([...playlists, res.data]);
      setCurrentUrl(res.data.url);
      setNewPlaylistUrl(''); setNewPlaylistName('');
    } catch(e) { alert("Failed to save playlist. Check backend."); }
  };

  const renderMusicPanel = () => (
    <div className="music-panel">
      <div className="music-header-tabs">
        <button className={`music-tab ${musicTab === 'LIBRARY' ? 'active' : ''}`} onClick={() => setMusicTab('LIBRARY')}>Library</button>
        <button className={`music-tab ${musicTab === 'MY_MUSIC' ? 'active' : ''}`} onClick={() => setMusicTab('MY_MUSIC')}>Add New</button>
      </div>
      {musicTab === 'LIBRARY' && (
        <div className="playlist-grid">
          {playlists.map(p => (
            <div key={p.id} className="playlist-item" onClick={() => setCurrentUrl(p.url)}>
              <span className="playlist-icon">{p.icon || '🎵'}</span>
              <span className="playlist-name">{p.name}</span>
            </div>
          ))}
        </div>
      )}
      {musicTab === 'MY_MUSIC' && (
        <div className="custom-playlist-form">
          <input className="music-input" placeholder="Paste Spotify URL..." value={newPlaylistUrl} onChange={(e) => setNewPlaylistUrl(e.target.value)} />
          <input className="music-input" placeholder="Playlist Name..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} />
          <div style={{display:'flex', gap:'10px'}}>
             <button className="btn-music-action" onClick={savePlaylist}>Save & Play</button>
          </div>
        </div>
      )}
      {currentUrl && (
        <div className="active-player-container">
           <iframe src={currentUrl} width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
        </div>
      )}
    </div>
  );

  // --- TIMER LOGIC ---
  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        if (mode === 'WORK') {
          setWorkSeconds(prev => {
            const next = prev + 1;
            if (next === targetMinutes * 60 && alarmAudio.current) alarmAudio.current.play();
            return next;
          });
        } else if (mode === 'BREAK') {
          setBreakSeconds(prev => {
            if (prev <= 1) {
              if (alarmAudio.current) alarmAudio.current.play();
              switchToWorkMode(); return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, mode, targetMinutes]);

  // --- HANDLERS ---
  const switchToWorkMode = () => { setMode('WORK'); setTargetMinutes(25); setWorkSeconds(0); setIsActive(true); };
  const setupAmbientBreak = () => { setMode('BREAK'); setBreakSeconds(600); setIsActive(false); };
  const skipBreak = () => { setIsActive(false); switchToWorkMode(); };
  const startStandardSession = () => { setMode('WORK'); setWorkSeconds(0); setIsActive(true); setView('FOCUS'); };
  
  const finishWorkAndCalcBreak = () => {
    const overtime = Math.max(0, workSeconds - (targetMinutes * 60));
    setBreakSeconds((5 * 60) + overtime); 
    setStreak(s => s + 1); setTrees(prev => [...prev, { date: new Date(), duration: workSeconds }]);
    axios.post('http://localhost:5000/api/session', { duration: workSeconds, date: new Date(), energy, difficulty }).catch(e => console.log("Backend offline"));
    setMode('BREAK'); setView('FOCUS');
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- RENDERERS ---
  const renderHome = () => (
    <div className="glass-panel">
      <h1 className="home-title">HYPER FOCUS</h1>
      <div style={{ marginBottom: '20px' }}>
         <SelectorTag label="Energy Level" selected={energy} onSelect={setEnergy} options={[{label:'Low', value:'LOW', icon:'🪫'}, {label:'Med', value:'MED', icon:'🔋'}, {label:'High', value:'HIGH', icon:'⚡'}]} />
         <SelectorTag label="Task Difficulty" selected={difficulty} onSelect={setDifficulty} options={[{label:'Easy', value:'EASY', icon:'🍃'}, {label:'Med', value:'MED', icon:'⚖️'}, {label:'Hard', value:'HARD', icon:'🔥'}]} />
      </div>
      <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
        <div style={{flex:1}}> <p className="section-title">Target (M)</p> <input type="number" className="time-input" value={targetMinutes} onChange={(e)=>setTargetMinutes(parseInt(e.target.value)||0)} /> </div>
        <div style={{flex:1}}> <p className="section-title">Break (M)</p> <input type="number" className="time-input" defaultValue={5} readOnly /> </div>
      </div>
      <button className="btn-gamified" onClick={startStandardSession}>START SESSION</button>
    </div>
  );

  const renderAmbient = () => (
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
  );

  const renderFocus = () => (
    <div className="focus-container">
      <div className="focus-timer-large">{mode === 'WORK' ? formatTime(workSeconds) : mode === 'BREAK' ? formatTime(breakSeconds) : `${formatTime(targetMinutes * 60)}`}</div>
      <div className="focus-controls-row">
        {mode === 'HOME' && <button className="btn-gamified" style={{ width: '200px' }} onClick={startStandardSession}>START</button>}
        {mode === 'WORK' && <><button className="btn-gamified" style={{ width: '150px' }} onClick={() => setIsActive(!isActive)}>{isActive ? 'PAUSE' : 'RESUME'}</button><button className="btn-gamified" style={{ width: '150px', background: 'white', color: 'black' }} onClick={finishWorkAndCalcBreak}>FINISH</button></>}
        {mode === 'BREAK' && <button className="btn-gamified" style={{ width: '200px' }} onClick={skipBreak}>SKIP BREAK</button>}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      <div className="scene-wrapper" style={{ opacity: view === 'AMBIENT' ? 1 : 0, pointerEvents: view === 'AMBIENT' ? 'all' : 'none' }}> <Spline scene={AMBIENT_SCENE} /> </div>
      <div className="scene-wrapper" style={{ opacity: view !== 'AMBIENT' ? 1 : 0, pointerEvents: view !== 'AMBIENT' ? 'all' : 'none' }}> <Spline scene={HOME_SCENE} /> </div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        {view === 'HOME' && renderHome()}
        {view === 'AMBIENT' && renderAmbient()}
        {view === 'FOCUS' && renderFocus()}
        {view === 'FOREST' && <div className="glass-panel"><h2>Forest View</h2><p>Streak: {streak}</p></div>}
      </div>

      {/* --- TOP LEFT: QUOTES --- */}
      <div style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 90 }}>
        <div className="quote-container" style={{ position: 'static', margin: 0, animation: 'fadeIn 1s ease' }}>
          <div className="quote-text">"{currentQuote.quote}"</div>
          <div className="quote-author">- {currentQuote.author}</div>
        </div>
      </div>

      {/* --- BOTTOM LEFT: MUSIC --- */}
      <div style={{ position: 'absolute', bottom: '40px', left: '40px', zIndex: 90, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {showMusic && renderMusicPanel()}
        <button className={`music-toggle-btn ${showMusic ? 'active' : ''}`} onClick={() => setShowMusic(!showMusic)} title="Music Player">🎵</button>
      </div>

      <div className="bottom-dock">
        <div className="dock-pill">
          <button className={`dock-mode-btn ${view === 'AMBIENT' ? 'active' : ''}`} onClick={() => { setView('AMBIENT'); if(mode==='HOME') setupAmbientBreak(); }}>🍃</button>
          <button className={`dock-mode-btn ${view === 'HOME' ? 'active' : ''}`} onClick={() => setView('HOME')}>🏠</button>
          <button className={`dock-mode-btn ${view === 'FOCUS' ? 'active' : ''}`} onClick={() => setView('FOCUS')}>💡</button>
        </div>
        <button className={`dock-icon-btn ${view === 'FOREST' ? 'active' : ''}`} onClick={() => setView('FOREST')}>🎁</button>
        <button className="dock-icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
        <button className="dock-icon-btn" onClick={toggleFullScreen}>⛶</button>
      </div>

      {/* Settings Sidebar */}
      {showSettings && <div className="settings-overlay" onClick={() => setShowSettings(false)} />}
      <div className={`settings-sidebar ${showSettings ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h2 style={{ fontSize: '2rem', margin: 0 }}>Menu</h2><button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor:'pointer' }}>✕</button></div>
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'ANALYTICS' ? 'active' : ''}`} onClick={() => setActiveTab('ANALYTICS')}>Analytics</button>
          <button className={`tab-btn ${activeTab === 'THEMES' ? 'active' : ''}`} onClick={() => setActiveTab('THEMES')}>Themes</button>
        </div>
        {activeTab === 'ANALYTICS' && (
          <div className="analytics-dashboard">
            <div className="stat-grid-quad">
              <div className="stat-card"><span className="stat-value">{trees.length}</span><span className="stat-label">Sessions</span></div>
              <div className="stat-card"><span className="stat-value">{Math.floor((trees.reduce((acc, curr) => acc + (curr.duration || 0), 0)) / 60)}h</span><span className="stat-label">Hours</span></div>
              <div className="stat-card"><span className="stat-value">{streak}</span><span className="stat-label">Streak</span></div>
              <div className="stat-card"><span className="stat-value">{trees.length > 0 ? Math.floor(trees.reduce((acc, c)=>acc+c.duration,0)/trees.length/60) : 0}m</span><span className="stat-label">Avg</span></div>
            </div>
            <div className="chart-card"><div className="chart-title">Activity (30 Days)</div><div className="heatmap-grid">{Array.from({length:30}).map((_,i)=><div key={i} className={`heatmap-cell level-${Math.random()>0.7?2:1}`}></div>)}</div></div>
          </div>
        )}
        {activeTab === 'THEMES' && (
          <div><h3 style={{ fontSize: '1rem', color: '#888', marginBottom: '15px' }}>Backgrounds</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}><div style={{ height: '80px', background: 'linear-gradient(to right, #00f2ff, #bd00ff)', borderRadius: '8px' }}></div><div style={{ height: '80px', background: 'linear-gradient(to right, #ff9f43, #ff6b6b)', borderRadius: '8px', opacity: 0.5 }}></div></div></div>
        )}
      </div>
    </div>
  );
}
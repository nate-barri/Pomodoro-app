const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// In-memory storage
let sessions = [];
let playlists = [
    { id: 1, name: 'Lofi Beats', url: 'https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4FyS8kM', icon: '🎧' },
    { id: 2, name: 'Rainy Day', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DXbvABJXBI1Sc', icon: 'xrXs' },
    { id: 3, name: 'Focus Flow', url: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO', icon: '🧠' }
];

// --- QUOTES ---
app.get('/api/quote', async (req, res) => {
    try {
        const apiKey = "oOJEYq56JuxZZldYkOM/8g==i0tvMlZOsKP2k2Ff";
        const response = await axios.get('https://api.api-ninjas.com/v1/quotes?category=happiness', {
            headers: { 'X-Api-Key': apiKey }
        });
        if (response.data && response.data.length > 0) res.json(response.data[0]);
        else res.status(404).json({ message: "No quote found" });
    } catch (error) {
        res.status(500).json({ message: "Error fetching quote" });
    }
});

// --- SESSIONS ---
app.post('/api/session', (req, res) => {
    const { duration, date, energy, difficulty } = req.body;
    sessions.push({ id: sessions.length + 1, duration, date, energy, difficulty });
    res.status(201).json({ message: "Session Logged" });
});

app.get('/api/stats', (req, res) => res.json(sessions));

// --- PLAYLISTS (NEW) ---
app.get('/api/playlists', (req, res) => res.json(playlists));

app.post('/api/playlists', (req, res) => {
    const { name, url, icon } = req.body;
    // Simple validation to ensure it's an embed link if possible, or just trust user
    const newPlaylist = { id: playlists.length + 1, name, url, icon: icon || '🎵' };
    playlists.push(newPlaylist);
    res.status(201).json(newPlaylist);
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
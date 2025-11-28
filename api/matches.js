const axios = require('axios');
const NodeCache = require('node-cache');

// Cache data for 60 seconds to save API calls
const myCache = new NodeCache({ stdTTL: 60 });

module.exports = async (req, res) => {
    // 1. Handle CORS (Security)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Check Cache
        const cachedData = myCache.get("live_matches");
        if (cachedData) {
            console.log("Serving from Cache");
            return res.json(cachedData);
        }

        // 3. Fetch from Real API
        // Note: You must set 'API_KEY' in your Vercel Environment Variables
        if (!process.env.API_KEY) {
            throw new Error("Missing API Key configuration");
        }

        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: { live: 'all' }, // Fetch ALL live matches
            headers: {
                'X-RapidAPI-Key': process.env.API_KEY,
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        const rawMatches = response.data.response;

        // 4. Transform Data for Frontend
        // We map the complex API data to the simple format your app expects
        const cleanMatches = rawMatches.map(m => ({
            id: m.fixture.id,
            league: m.league.name,
            date: "Today",
            home: m.teams.home.name,
            away: m.teams.away.name,
            homeLogo: m.teams.home.logo,
            awayLogo: m.teams.away.logo,
            score: `${m.goals.home ?? 0} - ${m.goals.away ?? 0}`,
            status: m.fixture.status.short, // '1H', '2H', 'HT'
            minute: m.fixture.status.elapsed + "'",
            
            // Note: The 'live' endpoint might not return full stats/events to save bandwidth.
            // We provide defaults to prevent the app from crashing.
            events: m.events ? m.events.map(e => ({
                type: e.type.toLowerCase(),
                team: e.team.id === m.teams.home.id ? 'home' : 'away',
                player: e.player.name,
                time: e.time.elapsed + "'"
            })) : [],
            stats: { 
                possession: [50, 50], 
                shots: [0, 0], 
                xg: [0, 0] 
            }
        }));

        // 5. Save to Cache and Return
        myCache.set("live_matches", cleanMatches);
        res.json(cleanMatches);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch live scores" });
    }
};
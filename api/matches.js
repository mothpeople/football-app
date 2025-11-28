const axios = require('axios');
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 60 });

module.exports = async (req, res) => {
    // 1. Handle CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // 2. Check Cache
        const cachedData = myCache.get("live_matches");
        if (cachedData) {
            return res.json(cachedData);
        }

        // 3. Validation
        if (!process.env.API_KEY) {
            throw new Error("SERVER CONFIG ERROR: API_KEY is missing in Vercel.");
        }

        // 4. Fetch from Real API
        const options = {
            method: 'GET',
            url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
            params: { live: 'all' }, 
            headers: {
                // .trim() fixes the accidental space issue!
                'X-RapidAPI-Key': process.env.API_KEY.trim(),
                'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);
        
        // 5. Transform & Return
        const rawMatches = response.data.response;
        
        // If API returns success but 0 matches (common), we pass that through
        const cleanMatches = rawMatches.map(m => ({
            id: m.fixture.id,
            league: m.league.name,
            date: "Today",
            home: m.teams.home.name,
            away: m.teams.away.name,
            homeLogo: m.teams.home.logo,
            awayLogo: m.teams.away.logo,
            score: `${m.goals.home ?? 0} - ${m.goals.away ?? 0}`,
            status: m.fixture.status.short,
            minute: m.fixture.status.elapsed + "'",
            events: m.events || [],
            stats: { 
                possession: [50, 50], 
                shots: [0, 0], 
                xg: [0, 0] 
            }
        }));

        myCache.set("live_matches", cleanMatches);
        res.json(cleanMatches);

    } catch (error) {
        console.error("BACKEND ERROR:", error.message);
        
        // Extract the REAL error from RapidAPI response
        let status = 500;
        let message = error.message;

        if (error.response) {
            status = error.response.status;
            // RapidAPI often sends the reason in 'message' or data
            message = JSON.stringify(error.response.data) || error.response.statusText;
        }

        res.status(status).json({ 
            error: "Backend Error", 
            details: message 
        });
    }
};

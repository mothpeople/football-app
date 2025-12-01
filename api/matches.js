const axios = require('axios');

module.exports = async (req, res) => {
    const { date } = req.query;
    // Default to today if no date provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    // IDs for: EPL, La Liga, Serie A, Ligue 1, UCL, Europa, SPL, V-League, J1, K1, Asian Cup, WCQ
    const myLeagues = [39, 140, 135, 61, 2, 3, 351, 336, 98, 292, 15, 10];

    try {
        const response = await axios.get('https://api-football-v1.p.rapidapi.com/v3/fixtures', {
            params: {
                date: targetDate,
                timezone: 'Asia/Singapore'
            },
            headers: {
                // MATCHING YOUR SCREENSHOT:
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                'x-rapidapi-key': process.env.API_KEY // This pulls from Vercel Settings
            }
        });

        // Filter results to only your selected leagues
        const allMatches = response.data.response;
        const filteredMatches = allMatches.filter(m => myLeagues.includes(m.league.id));

        res.status(200).json(filteredMatches);
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

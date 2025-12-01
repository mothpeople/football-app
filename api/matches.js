// File: api/matches.js
const axios = require('axios');

module.exports = async (req, res) => {
    // 1. Get the date from the frontend (or default to today)
    // Format required by API-Football: YYYY-MM-DD
    const { date } = req.query; 
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 2. Define the Leagues we care about (ID mapping from API-Football)
    // 39=EPL, 140=La Liga, 135=Serie A, 61=Ligue 1, 2=UCL, 3=Europa, 
    // 351=SPL, 336=V-League, 98=J1, 292=K1, 15=Asian Cup
    const myLeagues = [39, 140, 135, 61, 2, 3, 351, 336, 98, 292, 15]; 

    try {
        const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
            params: { 
                date: targetDate, 
                timezone: 'Asia/Singapore' // Adjust this if needed
            },
            headers: { 
                'x-rapidapi-key': process.env.API_KEY // We will set this in Vercel
            }
        });

        // 3. Filter data to only show YOUR leagues
        const allMatches = response.data.response;
        const filteredMatches = allMatches.filter(m => myLeagues.includes(m.league.id));

        res.status(200).json(filteredMatches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch data" });
    }
};

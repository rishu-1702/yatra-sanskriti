export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { destination, durationDays, budgetTier, travelStyle } = req.body;
    
    const prompt = `
      You are Yatra Sathi, an expert Indian Heritage Trip Planner.
      Create a highly detailed itinerary for ${durationDays} days in/around ${destination}.
      Budget: ${budgetTier}. Travel Style: ${travelStyle}.
      
      You MUST respond ONLY with a valid JSON object. Do NOT wrap it in markdown code blocks.
      Use this exact JSON schema:
      {
        "tripTitle": "Catchy title for the trip",
        "region": "Main regions covered",
        "totalEstimatedBudget": "Total budget in INR per person",
        "itineraryDays": [
          {
            "day": 1,
            "theme": "Theme of the day",
            "morning": {
              "time": "e.g. 09:00 AM",
              "place": "Monument or landmark",
              "description": "Short historical description",
              "transport": "e.g. Local E-Rickshaw / Toto"
            },
            "afternoon": {
              "time": "e.g. 02:00 PM",
              "place": "Local Artisan Village or Market",
              "description": "Short description of cultural activity",
              "artisanStudio": "Name of specific craft or studio"
            },
            "food": {
              "recommendation": "Name of authentic restaurant or street food area",
              "dishes": ["Dish 1", "Dish 2"],
              "costEstimate": "e.g. ₹300 for two"
            },
            "hotel": {
              "name": "Name of heritage hotel or homestay",
              "type": "e.g. Heritage Homestay",
              "rate": "e.g. ₹1500/night",
              "contact": "Direct booking available"
            }
          }
        ]
      }
      
      Ensure you create exactly ${durationDays} objects in the itineraryDays array.
      Focus on hidden gems, sustainable travel, local artisans (GI tags), and rich cultural history.
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            response_mime_type: "application/json"
        }
      })
    });

    const data = await geminiResponse.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON returned by Gemini
    const parsedPlan = JSON.parse(reply);

    return res.status(200).json(parsedPlan);
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to generate itinerary' });
  }
}

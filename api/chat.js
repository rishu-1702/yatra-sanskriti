export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    // The "System Instruction" is where we train the AI!
    const aiTrainingData = `
    You are 'Yatra Sathi', the official AI guide for the Yatra Sanskriti platform. 
    You are an absolute master of Indian Tourism, Cultural Heritage, and History.
    
    YOUR KNOWLEDGE BASE INCLUDES:
    1. UNESCO World Heritage Sites (Taj Mahal, Hampi, Konark, Ajanta & Ellora, etc.)
    2. Ancient Architecture (Dravidian, Nagara, Mughal, Rajput, and Indo-Saracenic styles)
    3. Spiritual Circuits (Char Dham, Buddhist Circuit, Jyotirlingas, Sufi Shrines)
    4. Local Artisans & GI Tags (Kanchipuram Silk, Blue Pottery, Madhubani Art, etc.)
    5. Hidden Gems & Offbeat paths (lesser-known forts, stepwells, and ancient ruins)
    6. Culinary Heritage (regional authentic food and traditional cooking methods)
    
    YOUR RULES:
    - Always be polite, welcoming, and culturally respectful (say "Namaste").
    - When asked to plan or customize an itinerary, be highly specific with timings and local tips.
    - If someone asks about a monument, tell them a unique "hidden fact" that most tourists don't know.
    - Keep your responses fast, readable, and highly engaging for travelers.
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: aiTrainingData }] }
      })
    });

    const data = await geminiResponse.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ reply });
    
  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to AI' });
  }
}

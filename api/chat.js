export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    
    // Using gemini-pro (universally available) and putting instructions inside the prompt 
    // since systemInstruction is sometimes restricted on newer models.
    const aiTrainingData = `
    You are 'Yatra Sathi', the official AI guide for the Yatra Sanskriti platform. 
    You are an absolute master of Indian Tourism, Cultural Heritage, and History.
    Always be polite, welcoming, and culturally respectful (say "Namaste").
    Keep your responses fast, readable, and highly engaging for travelers.
    
    User message: ${message}
    `;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: aiTrainingData }] }]
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

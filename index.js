const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const RUNWAY_VERSION = '2024-11-06';
const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1';

app.get('/', (req, res) => res.send('AnimeForge server is running'));

app.post('/generate', async (req, res) => {
  const { apiKey, prompt, imageBase64, duration } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'No API key' });
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  const dur = duration === 5 ? 5 : 10;

  try {
    const fetch = (await import('node-fetch')).default;

    // Use gen4.5 — supports BOTH text-only and image+text
    // ratio must be '16:9' for gen4.5, NOT '1280:768'
    const body = {
      model: 'gen4.5',
      promptText: prompt,
      duration: dur,
      ratio: '1280:720'
    };

    // Only add image if one was provided
    if (imageBase64) {
      body.promptImage = imageBase64;
    }

    console.log('Sending to Runway:', { model: body.model, duration: dur, hasImage: !!imageBase64 });

    const response = await fetch(RUNWAY_BASE + '/image_to_video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'X-Runway-Version': RUNWAY_VERSION
      },
      body: JSON.stringify(body)
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { 
      console.error('Non-JSON response:', text);
      return res.status(500).json({ error: text }); 
    }

    if (!response.ok) {
      console.error('Runway error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.message || JSON.stringify(data) });
    }

    console.log('Task created successfully:', data.id);
    res.json({ id: data.id });

  } catch(err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/status/:taskId', async (req, res) => {
  const { apiKey } = req.body;
  const { taskId } = req.params;
  if (!apiKey) return res.status(400).json({ error: 'No API key' });

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(RUNWAY_BASE + '/tasks/' + taskId, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'X-Runway-Version': RUNWAY_VERSION
      }
    });
    const data = await response.json();
    console.log('Task status:', taskId, data.status);
    res.json(data);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('AnimeForge server running on port ' + PORT));

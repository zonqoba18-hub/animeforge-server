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
    let endpoint, body;

    if (imageBase64) {
      // Image to video using gen4.5
      endpoint = RUNWAY_BASE + '/image_to_video';
      body = {
        model: 'gen4_turbo',
        promptImage: imageBase64,
        promptText: prompt,
        duration: dur,
        ratio: '1280:768'
      };
    } else {
      // Text to video using gen4.5 — supports text only
      endpoint = RUNWAY_BASE + '/text_to_video';
      body = {
        model: 'gen4_turbo',
        promptText: prompt,
        duration: dur,
        ratio: '1280:768'
      };
    }

    const response = await fetch(endpoint, {
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
    try { data = JSON.parse(text); } catch(e) { return res.status(500).json({ error: text }); }

    if (!response.ok) {
      console.error('Runway error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.message || data.error || JSON.stringify(data) });
    }

    console.log('Task created:', data.id);
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

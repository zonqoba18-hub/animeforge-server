// ═══════════════════════════════════════════════════════
//  AnimeForge — Runway Proxy Server
//  Paste this entire file into Replit, then hit Run
// ═══════════════════════════════════════════════════════

const express = require('express');
const cors    = require('cors');
const fetch   = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app  = express();
app.use(cors());               // Allows your HTML file to talk to this server
app.use(express.json({ limit: '20mb' })); // Allows large character images

const RUNWAY_VERSION = '2024-11-06';

// ── Health check (visit your Replit URL to confirm it's running) ──
app.get('/', (req, res) => {
  res.send('✅ AnimeForge server is running! Paste this URL into AnimeForge → Settings → Backend Server URL');
});

// ── Generate a clip ──
app.post('/generate', async (req, res) => {
  const { apiKey, prompt, imageBase64, duration } = req.body;
  const clipDuration = duration === 5 ? 5 : 10;

  if (!apiKey) return res.status(400).json({ error: 'No API key provided' });
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  try {
    let endpoint, body;

    if (imageBase64) {
      endpoint = 'https://api.dev.runwayml.com/v1/image_to_video';
      body = { model: 'gen3a_turbo', promptImage: imageBase64, promptText: prompt, duration: clipDuration, ratio: '1280:768' };
    } else {
      endpoint = 'https://api.dev.runwayml.com/v1/text_to_video';
      body = { model: 'gen3a_turbo', promptText: prompt, duration: clipDuration, ratio: '1280:768' };
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Runway error' });
    }

    // Returns task ID — the frontend will poll /status/:id
    res.json({ id: data.id });

  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Check generation status ──
app.post('/status/:taskId', async (req, res) => {
  const { apiKey } = req.body;
  const { taskId } = req.params;

  if (!apiKey) return res.status(400).json({ error: 'No API key' });

  try {
    const response = await fetch('https://api.dev.runwayml.com/v1/tasks/' + taskId, {
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'X-Runway-Version': RUNWAY_VERSION
      }
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start server ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('✅ AnimeForge server running on port ' + PORT);
  console.log('   Visit your Replit URL to confirm it works');
});

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const VERSION = '2024-11-06';

app.get('/', (req, res) => res.send('AnimeForge server is running'));
app.get('/api/', (req, res) => res.send('AnimeForge server is running'));

app.post('/api/generate', async (req, res) => {
  const { apiKey, prompt, imageBase64, duration } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'No API key' });
  if (!prompt) return res.status(400).json({ error: 'No prompt' });
  const dur = duration === 5 ? 5 : 10;
  try {
    const fetch = (await import('node-fetch')).default;
    const endpoint = imageBase64
      ? 'https://api.runwayml.com/v1/image_to_video'
      : 'https://api.runwayml.com/v1/text_to_video';
    const body = imageBase64
      ? { model:'gen3a_turbo', promptImage:imageBase64, promptText:prompt, duration:dur, ratio:'1280:768' }
      : { model:'gen3a_turbo', promptText:prompt, duration:dur, ratio:'1280:768' };
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+apiKey, 'X-Runway-Version':VERSION }
      , body: JSON.stringify(body)
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { return res.status(500).json({ error: text }); }
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/status/:taskId', async (req, res) => {
  const { apiKey } = req.body;
  const { taskId } = req.params;
  if (!apiKey) return res.status(400).json({ error: 'No API key' });
  try {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch('https://api.runwayml.com/v1/tasks/' + taskId, {
      headers: { 'Authorization':'Bearer '+apiKey, 'X-Runway-Version':VERSION }
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));

const express = require('express');
const gTTS = require('google-tts-api');
const ffmpeg = require('fluent-ffmpeg');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(outputPath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Default route - Plays predefined TTS
app.get('/', async (req, res) => {
  const text = 'Namaste, main vfy AI hoon. Mujhe Vivek masonawale ne banaya hai.';
  const lang = 'hi-IN';

  const ttsPath = path.join(__dirname, 'intro.mp3');
  const voiceFxPath = path.join(__dirname, 'introfx.mp3');

  try {
    const url = gTTS.getAudioUrl(text, {
      lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    await downloadFile(url, ttsPath);

    await new Promise((resolve, reject) => {
      ffmpeg(ttsPath)
        .audioFilters([
          'asetrate=44100*0.77',
          'atempo=0.88',
          'aecho=0.6:0.8:40:0.22'
        ])
        .audioBitrate(192)
        .save(voiceFxPath)
        .on('end', resolve)
        .on('error', reject);
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    const stream = fs.createReadStream(voiceFxPath);
    stream.pipe(res);
    stream.on('end', () => {
      [ttsPath, voiceFxPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('Intro TTS failed');
  }
});

// Custom TTS route
app.get('/tts', async (req, res) => {
  const text = req.query.text || 'Thanks for using, मैं जानती हूँ कि मेरी आवाज़ अभी उतनी नैचुरल नहीं है, लेकिन भविष्य में इसे सही किया जाएगा। अभी इस पर! काम चल रहा है ';
  const lang = req.query.lang || 'hi-IN';

  const ttsPath = path.join(__dirname, 'input.mp3');
  const voiceFxPath = path.join(__dirname, 'output.mp3');

  try {
    const url = gTTS.getAudioUrl(text, {
      lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    await downloadFile(url, ttsPath);

    await new Promise((resolve, reject) => {
      ffmpeg(ttsPath)
        .audioFilters([
          'asetrate=44100*0.77',
          'atempo=0.88',
          'aecho=0.6:0.8:40:0.22'
        ])
        .audioBitrate(192)
        .save(voiceFxPath)
        .on('end', resolve)
        .on('error', reject);
    });

    res.download(voiceFxPath, 'vfy-ai-tts.mp3', () => {
      [ttsPath, voiceFxPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('TTS generation or audio processing failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/tts?text=Main+tumse+pyaar+karti+hoon`);
});

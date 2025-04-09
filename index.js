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

app.get('/tts', async (req, res) => {
  const text = req.query.text || 'Main tumse bahut pyaar karti hoon!';
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

    // Apply pitch shift (chipmunk effect) + tempo + echo
    await new Promise((resolve, reject) => {
      ffmpeg(ttsPath)
        .audioFilters([
          'asetrate=44100*0.77', // increase pitch
          'atempo=0.88',         // slightly faster tempo
          'aecho=0.6:0.8:40:0.22' // soft echo
        ])
        .audioBitrate(192)
        .save(voiceFxPath)
        .on('end', resolve)
        .on('error', reject);
    });

    res.download(voiceFxPath, 'cute-girl-tts.mp3', () => {
      [ttsPath, voiceFxPath].forEach(p => fs.existsSync(p) && fs.unlinkSync(p));
    });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).send('TTS generation or audio processing failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/tts?text=Main+tumse+pyaar+karti+hoon`);
});

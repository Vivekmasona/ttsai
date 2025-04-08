const express = require('express');
const gTTS = require('google-tts-api');
const ffmpeg = require('fluent-ffmpeg');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/tts', async (req, res) => {
  const text = req.query.text || 'Hello, this is a test!';
  const lang = req.query.lang || 'hi'; // Hindi by default

  try {
    const url = gTTS.getAudioUrl(text, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    const tempInput = path.join(__dirname, 'input.mp3');
    const tempOutput = path.join(__dirname, 'output.mp3');

    // Download the Google TTS audio
    const file = fs.createWriteStream(tempInput);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          // Convert with FFmpeg
          ffmpeg(tempInput)
            .audioBitrate(192)
            .audioChannels(2)
            .toFormat('mp3')
            .save(tempOutput)
            .on('end', () => {
              res.download(tempOutput, 'tts.mp3', () => {
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
              });
            })
            .on('error', (err) => {
              console.error('FFmpeg error:', err);
              res.status(500).send('Conversion failed');
            });
        });
      });
    });
  } catch (err) {
    res.status(500).send('TTS generation failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

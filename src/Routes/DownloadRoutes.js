import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const DownloadRoutes = express.Router();

const name = fileURLToPath(import.meta.url);
const dirname = path.dirname(name);

DownloadRoutes.get('/transcript/:filename', (req, res) => {
  const filename = req.params.filename;
  const transcriptPath = path.join(dirname, '../persistent_storage/transcripts', filename);

  fs.access(transcriptPath, fs.constants.F_OK, (err) => {
    if (err) return res.end(); 

    res.download(transcriptPath, filename, (err) => {
      if (err) res.end();
    });
  });
});

export default DownloadRoutes;

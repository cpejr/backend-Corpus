import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = path.dirname(currentFilePath);

class DownloadController {
  static async downloadTranscript(req, res) {
    try {
      const filename = req.params.filename;
      const transcriptPath = path.join(currentDirName, '../persistent_storage/transcripts', filename);
      
      fs.access(transcriptPath, fs.constants.F_OK, (error) => {
        if (error) {
          return res.status(404).end();
        }
        
        res.download(transcriptPath, filename, (error) => {
          if (error) {
            console.error('Download error:', error);
            res.status(500).end();
          }
        });
      });
    } catch (error) {
      console.error('Download controller error:', error);
      res.status(500).end();
    }
  }
}

export default DownloadController;
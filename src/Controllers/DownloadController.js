import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirName = path.dirname(currentFilePath);

class DownloadController {
  static async downloadTranscript(req, res) {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const transcriptPath = path.join(currentDirName, '../persistent_storage/transcripts', filename);
      
      fs.access(transcriptPath, fs.constants.F_OK, (error) => {
        if (error) {
          console.error('File not found:', transcriptPath);
          return res.status(404).json({ error: 'File not found' });
        }
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        

        const fileStream = fs.createReadStream(transcriptPath);
        
        fileStream.on('error', (error) => {
          console.error('File stream error:', error);
          res.status(500).json({ error: 'Error reading file' });
        });
        
        fileStream.pipe(res);
      });
    } catch (error) {
      console.error('Download controller error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default DownloadController;
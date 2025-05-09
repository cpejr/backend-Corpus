import express from 'express';
import DownloadController from '../Controllers/DownloadController.js';

const DownloadRoutes = express.Router();

DownloadRoutes.get('/transcript/:filename', DownloadController.downloadTranscript);

export default DownloadRoutes;
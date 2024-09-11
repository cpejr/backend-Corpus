import VideosModel from "../Models/VideosModel.js";
import { NotFoundError } from "../Errors/baseErrors.js";
import { ForbiddenError } from "../Errors/baseErrors.js";
import { Dropbox } from "dropbox";
import fetch from "node-fetch";

class VideosController {
  async InsertVideo(req, res) {
    try {
      const dbx = new Dropbox({ accessToken: process.env.DPB_ACCESS_KEY, fetch: fetch });

      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 30);
      const formatExpirationTime = expirationTime.toISOString().split('.')[0] + 'Z';

      const pathFile = req.body.path;
      const sharedLinkSettings = {
        requested_visibility: 'public',
        access: 'viewer',
        expires: formatExpirationTime,
      };
      
      const response = await dbx.sharingCreateSharedLinkWithSettings({ path: pathFile, settings: sharedLinkSettings });

      const data = { "name": response.result.name, 
                     "date": response.result.client_modified, 
                     "link": response.result.url,
                     "transcription": null };
  
      return res.status(200).json(data);
    } catch (error) {
      console.error("Erro ao criar o link compartilhado:", error);
      return res.status(500).json({ error: 'Erro no servidor' });
    }
  }
  
  async GetVideo(req, res) {
    try {
      const video = await VideosModel.find();
      return res.status(200).json(video);
    } catch (error) {
      next(new NotFoundError(`Route '${req.baseUrl}' not found`));
    }
  }

  async DeleteVideo(req, res) {
    try {
      const { id } = req.params;

      await VideosModel.findByIdAndDelete(id);

      return res.status(200).json({ mensagem: "Video deletado com sucesso!" });
    } catch (error) {
      next(new ForbiddenError(`Route '${req.baseUrl}' forbidden`));
    }
  }
}

export default new VideosController();

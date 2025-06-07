import VideosModel from "../Models/VideosModel.js";
import CountryModel from "../Models/CountryModel.js";  
import LanguageModel from "../Models/LanguageModel.js"; 

class VideosController {
 
  async Create(req, res) {
    try {


      console.log('Starting video creation process...');

      const { 
        title, 
        language, 
        videoFile, 
        code, 
        date, 
        duration,
        country,
        totalParticipants,
        responsibles,
        context,
        ShortDescription
      } = req.body;

      const requiredFields = {
        title: 'Title',
        language: 'Language',
        videoFile: 'Video file',
        code: 'Code',
        country: 'Country',
        totalParticipants: 'Total participants',
        responsibles: 'Responsibles',
        context: 'Context',
        ShortDescription: 'Short description'
      };

      const missingFields = Object.entries(requiredFields)
        .filter(([field]) => !req.body[field])
        .map(([_, name]) => name);

      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: "Missing required fields!",
          missingFields
        });
      }


      const foundCode = await VideosModel.findOne({ code });
      if (foundCode) {
        return res.status(409).json({ message: "Code already registered!" });
      }

      const regex = /^data:(video\/)(\w+)(;base64,)(.+)$/;
      const matches = videoFile.match(regex);
      if (!matches) {
        return res.status(400).json({ message: 'Invalid video format!' });
      }

      const dataType = matches[2];
      const videoFileData = matches[4];
      const videoBuffer = Buffer.from(videoFileData, 'base64');
      if (videoBuffer.length === 0) {
        return res.status(400).json({ message: "Empty video file!" });
      }

      const videoPath = path.join("./src/Utils/database", `input.${dataType}`);
      await fs.promises.writeFile(videoPath, videoBuffer);
      console.log('Temporary video saved at:', videoPath);

      const thumbFile = await generateThumb(videoPath);
      if (!thumbFile) {
        await fs.promises.unlink(videoPath);
        return res.status(500).json({ message: "Error generating thumbnail!" });
      }

      const archivesID = await ArchivesController.createArchives({
        thumbFile: thumbFile, 
        videoFile: videoFileData,
        name: `${title}-${code}`,
      });


      const transcription = await generateTranscription(videoPath, language, title);
      console.log('Transcription result:', transcription ? 'Success' : 'Failure');

      await fs.promises.unlink(videoPath).catch(console.error);

      const videoData = {
        title,
        language,
        code,
        archives: archivesID,
        transcription: transcription.transcription || "Transcription not available", 
        duration: convertToMinutes(duration || 0),
        date: date || new Date(),
        country,
        totalParticipants: Number(totalParticipants),
        responsibles,
        context,
        ShortDescription
      };

      const video = await VideosModel.create(videoData);
      console.log('Video successfully created:', video._id);

      return res.status(201).json({
        message: "Video successfully created",
        video,
        thumbURL: thumbFile,
        transcription: transcription.transcription || "Transcription not available",
        transcriptURL: transcription.transcriptURL
      });

    } catch (error) {
      console.error('Server error:', {
        message: error.message,
        stack: error.stack,
        body: req.body
      });
      return res.status(500).json({ 
        message: "Server error", 
        error: error.message,
        details: error.errors 
      });
    }
  }


  async DownloadVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);

      if (!video || !video.archives || !video.archives.videoFile) {
        return res.status(404).json({ message: "Video not found" });
      }

      const base64 = video.archives.videoFile;
      const buffer = Buffer.from(base64, 'base64');

      res.set({
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${video.title}.mp4"`,
      });

      return res.send(buffer);
    } catch (error) {
      console.error("Error downloading video:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }



  async GetVideo(req, res) {
    try {

      const video = await VideosModel.find()
        .populate("language")  
        .populate("country"); 

      return res.status(200).json(video);  
    } catch (error) {
      return res.status(500).json({ message: "Not found", error: error.message });

    }
  }



  
  async GetVideoByParameters(req, res) {
    try {

      const { totalParticipants, dates, duration, country, language } = req.query.filters || {};  
      let filter = {};

     
      if (totalParticipants) {
        if (totalParticipants.min == 10) {
          filter.totalParticipants = { $gte: Number(11) };
        } else {
          filter.totalParticipants = {
            $gte: Number(totalParticipants.min),
            $lte: Number(totalParticipants.max),
          };
        }
      }

      
      if (country) {
        const countryDoc = await CountryModel.findOne({ name: { $regex: new RegExp(country, "i") } });  
        if (countryDoc) {
          filter.country = countryDoc._id; 
        } else {
          return res.status(404).json({ message: "País não encontrado." });
        }
      }

      
      if (language) {
        const languageDoc = await LanguageModel.findOne({ name: { $regex: new RegExp(language, "i") } });  
        if (languageDoc) {
          filter.language = languageDoc._id;  
        } else {
          return res.status(404).json({ message: "Linguagem não encontrada." });
        }
      }

      if (dates) {
        filter.date = { $gte: new Date(dates) };
      }

      if (duration) {
        filter.duration = { $gte: Number(duration) };

      }
      if (country) filter.country = country;
      if (language) filter.language = language;
      if (dates) filter.date = { $gte: new Date(dates) };
      if (duration) filter.duration = { $gte: Number(duration) };


    
      console.log('Filtro aplicado:', filter);

   
      const videos = await VideosModel.find(filter)
        .populate('country')   
        .populate('language'); 


      return res.status(200).json(videos);

    } catch (error) {
      console.error('Error filtering videos:', error);
      return res.status(500).json({ message: "Error filtering videos" });
    }
  }


  async UpdateVideo(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findByIdAndUpdate(
        id, 
        req.body, 
        { new: true, runValidators: true }
      ).populate('archives');
      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      return res.status(200).json(video);
    } catch (error) {
      console.error('Error updating video:', error);
      return res.status(500).json({ message: "Error updating video" });
    }
  }

  async Destroy(req, res) {
    try {
      const { id } = req.params;
      const video = await VideosModel.findById(id);

      
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      if (video.archives) {
        await ArchivesController.deleteArchives(video.archives._id);
      }


      await VideosModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "Video successfully deleted!" });


    } catch (error) {
      console.error('Error deleting video:', error);
      return res.status(500).json({ message: "Error deleting video" });
    }
  }
}

export default new VideosController();

import TranscriptionModel from "../Models/TranscriptionModel.js";

class TranscriptionController {
  async createTranscription(req, res) {
    try {
      const transcription = await TranscriptionModel.create(req.body);
      return res.status(200).json(transcription);
    } catch (error) {
      return res.status(500).json({ message: "Erro ao criar transcrição", error: error.message });
    }
  }

  async getTranscription(req, res) {
    try {
      const transcription = await TranscriptionModel.find();
      return res.status(200).json(transcription);
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar transcrição", error: error.message });
    }
  }

  async updateTranscription(req, res) {
    try {
      const { id } = req.params;
      const transcriptionUpdated = await TranscriptionModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

      if (!transcriptionUpdated) {
        return res.status(404).json({ message: "Transcrição não encontrada" });
      }
      return res.status(200).json(transcription);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Erro ao atualizar transcrição", error: error.message });
    }
  }

  async deleteTranscription(req, res) {
    try {
      const { id } = req.params;
      const transcription = await TranscriptionModel.findByIdAndDelete(id);
      if (!transcription) {
        return res.status(404).json({ message: "Transcrição não encontrada" });
      }
      return res.status(200).json({ message: "Transcrição deletada com sucesso!" });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao deletar transcrição", error: error.message });
    }
  }
}

export default new TranscriptionController();

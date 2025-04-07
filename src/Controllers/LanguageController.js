import LanguageModel from "../Models/LanguageModel.js";

class LanguageController {
  async createLanguage(req, res) {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Campos obrigatórios não preenchidos." });
      }

      const alreadyExists = await LanguageModel.findOne({ $or: [{ name }, { code }] });

      if (alreadyExists) {
        return res.status(409).json({ message: "Língua já cadastrada!" });
      }

      const language = await LanguageModel.create({ name, code });
      return res.status(201).json(language);
    } catch (error) {
      return res.status(500).json({ message: "Erro no servidor", error: error.message });
    }
  }

  async deleteLanguage(req, res) {
    try {
      const { id } = req.params;
      await LanguageModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "Língua deletada com sucesso!" });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao deletar", error: error.message });
    }
  }

  async getLanguageById(req, res) {
    try {
      //const { id } = req.params;
      const language = await LanguageModel.find();

      if (!language) {
        return res.status(404).json({ message: "Lígua não encontrado" });
      }

      return res.status(200).json(language);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar Língua", error: error.message });
    }
  }
}

export default new LanguageController();

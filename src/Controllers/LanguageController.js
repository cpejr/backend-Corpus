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

  // Função para buscar idiomas com base nos parâmetros passados pelo body
  async getLanguageFromBody(req, res) {
    try {
      const { id, name, code } = req.body; // Recebe os parâmetros pelo body

      if (!id && !name && !code) {
        return res.status(400).json({ message: "É necessário fornecer ao menos um parâmetro: id, name ou code." });
      }

      // Cria o filtro com base no que foi passado no body
      let filter = {};
      if (id) filter._id = id;  // Se id foi enviado, adiciona ao filtro
      if (name) filter.name = name;  // Se name foi enviado, adiciona ao filtro
      if (code) filter.code = code;  // Se code foi enviado, adiciona ao filtro

      const language = await LanguageModel.findOne(filter); // Busca o idioma no banco

      if (!language) {
        return res.status(404).json({ message: "Língua não encontrada" });
      }

      return res.status(200).json(language);  // Retorna o idioma encontrado
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar a língua", error: error.message });
    }
  }

  // Função para buscar todos os idiomas
  async getAllLanguages(req, res) {
    try {
      const languages = await LanguageModel.find();  // Busca todos os idiomas cadastrados

      if (!languages || languages.length === 0) {
        return res.status(200).json([]);  // Se não houver idiomas, retorna um array vazio
      }

      return res.status(200).json(languages);  // Retorna todos os idiomas encontrados
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar idiomas", error: error.message });
    }
  }
}

export default new LanguageController();
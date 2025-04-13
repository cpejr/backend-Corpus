import CountryModel from "../Models/CountryModel.js";

class CountryController {
  // Função para criar um novo país
  async createCountry(req, res) {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Nome e código do país são obrigatórios." });
      }

      const existingCountry = await CountryModel.findOne({ name, code });
      if (existingCountry) {
        return res.status(409).json({ message: "País já cadastrado." });
      }

      const country = await CountryModel.create({ name, code });
      return res.status(201).json(country);  // Retorna o país recém-criado
    } catch (error) {
      return res.status(500).json({ message: "Erro ao criar país", error: error.message });
    }
  }

  // Função para buscar um país com base no body (por ID, nome ou código)
  async getCountryFromBody(req, res) {
    try {
      const { id, name, code } = req.body;

      if (!id && !name && !code) {
        return res.status(400).json({ message: "É necessário fornecer ao menos um parâmetro: id, name ou code." });
      }

      // Cria o filtro com base no que foi passado no body
      let filter = {};
      if (id) filter._id = id;
      if (name) filter.name = name;
      if (code) filter.code = code;

      const country = await CountryModel.findOne(filter);

      if (!country) {
        return res.status(404).json({ message: "País não encontrado." });
      }

      return res.status(200).json(country);  // Retorna o país encontrado
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar país", error: error.message });
    }
  }

  // Função para buscar todos os países
  async getAllCountries(req, res) {
    try {
      const countries = await CountryModel.find();

      if (countries.length === 0) {
        return res.status(200).json([]);  // Se não houver países, retorna um array vazio
      }

      return res.status(200).json(countries);  // Retorna todos os países encontrados
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar países", error: error.message });
    }
  }

  // Função para atualizar um país
  async updateCountry(req, res) {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      const countryExists = await CountryModel.findById(id);
      if (!countryExists) {
        return res.status(404).json({ message: "País não encontrado." });
      }

      const updatedCountry = await CountryModel.findByIdAndUpdate(id, { name, code }, { new: true });
      return res.status(200).json(updatedCountry);  // Retorna o país atualizado
    } catch (error) {
      return res.status(500).json({ message: "Erro ao atualizar país", error: error.message });
    }
  }

  // Função para deletar um país
  async deleteCountry(req, res) {
    try {
      const { id } = req.params;

      const countryExists = await CountryModel.findById(id);
      if (!countryExists) {
        return res.status(404).json({ message: "País não encontrado." });
      }

      await CountryModel.findByIdAndDelete(id);
      return res.status(200).json({ message: "País deletado com sucesso." });
    } catch (error) {
      return res.status(500).json({ message: "Erro ao deletar país", error: error.message });
    }
  }
}

export default new CountryController();
  
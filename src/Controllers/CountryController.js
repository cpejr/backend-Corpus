import CountryModel from "../Models/CountryModel.js";

class CountryController {
  
  async createCountry(req, res) {
    try {
      const { name } = req.body;

      if (!name ) {
        return res.status(400).json({ message: "Nome e código do país são obrigatórios." });
      }

      const existingCountry = await CountryModel.findOne({ name});
      if (existingCountry) {
        return res.status(409).json({ message: "País já cadastrado." });
      }

      const country = await CountryModel.create({ name, code });
      return res.status(201).json(country); 
    } catch (error) {
      return res.status(500).json({ message: "Erro ao criar país", error: error.message });
    }
  }

  
  async getCountryFromBody(req, res) {
    try {
      const { id, name} = req.body;

      if (!id && !name ) {
        return res.status(400).json({ message: "É necessário fornecer ao menos um parâmetro: id, name ou code." });
      }

      
      let filter = {};
      if (id) filter._id = id;
      if (name) filter.name = name;
      

      const country = await CountryModel.findOne(filter);

      if (!country) {
        return res.status(404).json({ message: "País não encontrado." });
      }

      return res.status(200).json(country);  // Retorna o país encontrado
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar país", error: error.message });
    }
  }

  
  async getAllCountries(req, res) {
    try {
      const countries = await CountryModel.find();

      if (countries.length === 0) {
        return res.status(200).json([]);  
      }

      return res.status(200).json(countries);  
    } catch (error) {
      return res.status(500).json({ message: "Erro ao buscar países", error: error.message });
    }
  }

  
  async updateCountry(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const countryExists = await CountryModel.findById(id);
      if (!countryExists) {
        return res.status(404).json({ message: "País não encontrado." });
      }

      const updatedCountry = await CountryModel.findByIdAndUpdate(id, { name}, { new: true });
      return res.status(200).json(updatedCountry);  
    } catch (error) {
      return res.status(500).json({ message: "Erro ao atualizar país", error: error.message });
    }
  }

  
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
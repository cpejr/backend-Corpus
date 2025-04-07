import CountryModel from "../Models/CountryModel.js";

class CountryController {
  async createCountry(req, res) {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Nome e código do país são obrigatórios" });
      }

      const existingCountry = await CountryModel.findOne({ name, code });
      if (existingCountry) {
        return res.status(409).json({ message: "País já cadastrado" });
      }

      const country = await CountryModel.create({ name, code });
      return res.status(201).json(country);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar país", error: error.message });
    }
  }

  async getCountryById(req, res) {
    try {
      //const { id } = req.params;
      const country = await CountryModel.find();

      if (!country) {
        return res.status(404).json({ message: "País não encontrado" });
      }

      return res.status(200).json(country);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar país", error: error.message });
    }
  }

  async updateCountry(req, res) {
    try {
      const { id } = req.params;
      const { name, code } = req.body;

      const updatedCountry = await CountryModel.findByIdAndUpdate(
        id,
        { name, code },
        { new: true }
      );

      if (!updatedCountry) {
        return res.status(404).json({ message: "País não encontrado" });
      }

      return res.status(200).json(updatedCountry);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar país", error: error.message });
    }
  }

  async deleteCountry(req, res) {
    try {
      const { id } = req.params;
      const deletedCountry = await CountryModel.findByIdAndDelete(id);

      if (!deletedCountry) {
        return res.status(404).json({ message: "País não encontrado" });
      }

      return res.status(200).json({ message: "País deletado com sucesso" });
    } catch (error) {
      res.status(500).json({ message: "Erro ao deletar país", error: error.message });
    }
  }
}

export default new CountryController();

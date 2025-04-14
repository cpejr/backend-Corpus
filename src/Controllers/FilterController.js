import mongoose from "mongoose";
import CountryModel from "../Models/CountryModel.js";
import LanguageModel from "../Models/LanguageModel.js";

export async function buildVideoFilters(filters) {
  const { totalParticipants, dates, duration, country, language } = filters;
  const filter = {};

  // Filtro de totalParticipants
  if (totalParticipants) {
    if (totalParticipants.min == 10) {
      filter.totalParticipants = { $gte: 11 };  
    } else {
      filter.totalParticipants = {
        $gte: Number(totalParticipants.min),
        $lte: Number(totalParticipants.max),
      };
    }
  }

  // Filtro de país
  if (country) {
    try {
      const countryDoc = await CountryModel.findOne({
        name: { $regex: new RegExp(country, "i") }, //pesquisar pela string
      });

      if (countryDoc) {
        filter.country = countryDoc._id;
      } else {
        throw new Error("País não encontrado.");
      }
    } catch (error) {
      throw new Error(`Erro ao buscar país: ${error.message}`);
    }
  }

  // Filtro de idioma
  if (language) {
    try {
      const languageDoc = await LanguageModel.findOne({
        name: { $regex: new RegExp(language, "i") },
      });

      if (languageDoc) {
        filter.language = languageDoc._id;
      } else {
        throw new Error("Linguagem não encontrada.");
      }
    } catch (error) {
      throw new Error(`Erro ao buscar linguagem: ${error.message}`);
    }
  }

  // Filtro de datas (caso tenha um intervalo ou apenas uma data) //chatgpt
  if (dates) {
    if (Array.isArray(dates) && dates.length === 2) {                            
      // Se o `dates` é um intervalo (ex: [startDate, endDate])                  
      filter.date = { $gte: new Date(dates[0]), $lte: new Date(dates[1]) };
    } else {
      // Se é apenas uma data de início (ex: `gte`)
      filter.date = { $gte: new Date(dates) };
    }
  }

  //chatgpt
  if (duration) {
    filter.duration = { $gte: Number(duration) };  
  }

  return filter;
}

import mongoose from "mongoose";
import CountryModel from "../Models/CountryModel.js";
import LanguageModel from "../Models/LanguageModel.js";

export async function buildVideoFilters(filters = {}) {  // Defaulting filters to an empty object
  const { totalParticipants, dates, duration, country, language } = filters;
  const filter = {};

  // Verifica se totalParticipants está presente
  if (totalParticipants) {
    if (totalParticipants.min === 10) {
      filter.totalParticipants = { $gte: 11 };  
    } else {
      filter.totalParticipants = {
        $gte: Number(totalParticipants.min),
        $lte: Number(totalParticipants.max),
      };
    }
  }

  // Verifica se a variável 'country' foi fornecida
  if (country) {
    try {
      const countryDoc = await CountryModel.findOne({
        name: { $regex: new RegExp(country, "i") },
      });

      if (countryDoc) {
        filter.country = countryDoc._id;
      } else {
        // Log de erro em vez de lançar uma exceção
        console.log(`País "${country}" não encontrado, filtro ignorado.`);
      }
    } catch (error) {
      console.error(`Erro ao buscar país "${country}": ${error.message}`);
    }
  }

  // Verifica se a variável 'language' foi fornecida
  if (language) {
    try {
      const languageDoc = await LanguageModel.findOne({
        name: { $regex: new RegExp(language, "i") },
      });

      if (languageDoc) {
        filter.language = languageDoc._id;
      } else {
        // Log de erro em vez de lançar uma exceção
        console.log(`Idioma "${language}" não encontrado, filtro ignorado.`);
      }
    } catch (error) {
      console.error(`Erro ao buscar linguagem "${language}": ${error.message}`);
    }
  }

  /* 
  // Bloco de 'dates' e 'duration' comentado, pode ser descomentado quando necessário.
  if (dates) {
    if (Array.isArray(dates) && dates.length === 2) {
      // Se o `dates` é um intervalo (ex: [startDate, endDate])                   
      filter.date = { $gte: new Date(dates[0]), $lte: new Date(dates[1]) };
    } else {
      // Se é apenas uma data de início (ex: `gte`)
      filter.date = { $gte: new Date(dates) };
    }
  }

  if (duration) {
    filter.duration = { $gte: Number(duration) };
  }
  */

  return filter;
}

// Exportando no final, conforme solicitado
export default buildVideoFilters;

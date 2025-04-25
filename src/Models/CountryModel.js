// src/Models/CountryModel.js
import mongoose from "mongoose";

const CountrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const CountryModel = mongoose.model("Country", CountrySchema);

export default CountryModel;
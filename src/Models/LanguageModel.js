import mongoose from "mongoose";

const LanguageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    code: {
      type: String,
      required: true,
      unique: true
    }
  },
  {
    timestamps: true
  }
);

const LanguageModel =mongoose.model("Language", LanguageSchema)

export default LanguageModel

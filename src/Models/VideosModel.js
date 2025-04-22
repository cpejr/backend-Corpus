import mongoose from "mongoose";

const Schema = mongoose.Schema;

const VideosSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    ShortDescription: {
      type: String,
      required: true,
      trim: true,
    },
    archives: {
      type: Schema.Types.ObjectId,
      ref: "archives",
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    context: {
      type: String,
      required: true,
      trim: true,
    },
    responsibles: {
      type: String,
      required: true,
      trim: true,
    },
    totalParticipants: {
      type: Number,
      required: true,
      min: 1,
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    language: {
      type: Schema.Types.ObjectId,
      ref: "Language",
      required: true,
    },
    duration: {
      type: Number,
      min: [0, "A duração do vídeo não pode ser negativa"],
    },
    birthday: {
      type: Date,
      required: true,
    },
    transcription: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;

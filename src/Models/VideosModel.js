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
      trim: true,
    },
    country: [{
      type: Schema.Types.ObjectId,
      ref: "Country", // referencia para a collection de países
      required: true,
    }],
    language: [{
      type: Schema.Types.ObjectId,
      ref: "Language", // referencia para a collection de línguas
      required: true,
    }],
    duration: {
      type: Number,
      min: [0, "Video duration cannot be less than 0 seconds"],
    },
    birthday: {
      type: Date,
      required: true,
    },
    transcription: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;

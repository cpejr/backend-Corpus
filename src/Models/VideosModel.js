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
    country: [
      {
        type: Schema.Types.ObjectId,
        ref: "Country",
        required: true,
      },
    ],
    language: [
      {
        type: Schema.Types.ObjectId,
        ref: "Language",
        required: true,
      },
    ],
    duration: {
      type: Number,
      min: [0, "Video duration cannot be less than 0 seconds"],
    },
    birthday: {
      type: Date,
      required: true,
    },
    transcription: 
      {
        type: Schema.Types.ObjectId,
        ref: "Transcription",
        required: false,
      },
    

    vttS3Key: {
      type: String, 
      required: false,
    },
    ManualTranscriptionArchive: {
      type: Schema.Types.ObjectId,
      ref: "ManualTranscriptionArchive",
    },
  },
  {
    timestamps: true,
  }
);

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;

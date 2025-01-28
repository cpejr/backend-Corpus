import mongoose, { mongo } from "mongoose";

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
    country: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      min: [0, "Video duration cannot be less than 0 seconds"],
    },
    date: {
      type: String,
      required: true,
    },
    // transcription: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
  },
  {
    timestamps: true,
  }
);

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;

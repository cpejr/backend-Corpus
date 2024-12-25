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

    video: {
      type: String,
      required: true,
      // enum: [
      //   "video/x-flv",
      //   "video/mp4",
      //   "video/MP2T",
      //   "video/3gpp",
      //   "video/quicktime",
      //   "video/x-msvideo",
      //   "video/x-ms-wmv",
      // ],
      unique: false,
    },
    thumbnail: {
      type: String,
      required: true,
      //enum: ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/svg+xml"],
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
    time: {
      type: String,
      required: true,
      trim: true,
    },
    // totalParticipants: {
    //   type: Number,
    //   required: true,
    //   trim: true,
    // },
    // country: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // language: {
    //   type: String,
    //   required: true,
    //   trim: true,
    // },
    // duration: {
    //   type: Number,
    //   min: [0, "Video duration cannot be less than 0 seconds"],
    // },
    // date: {
    //   type: String,
    //   required: true,
    // },
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

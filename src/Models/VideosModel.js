import mongoose, { mongo } from "mongoose";

const Schema = mongoose.Schema;

const VideosSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: false,
    },
    resume: {
        type: String,
        required: true,
        trim: false,
    },
    file: {
        type: Boolean,
        required: true,
    }
});

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;
import mongoose, { mongo } from "mongoose";

const Schema = mongoose.Schema;

const VideosSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: false,
    },
    id_category: {
	type: Schema.Types.ObjectId,
        ref: 'projeto',
    },
    resume: {
        type: String,
        required: true,
        trim: false,
    },
    file: {
        type: Boolean,
        required: true,
    },
},{
    timestamps: true
});

const VideosModel = mongoose.model("videos", VideosSchema);

export default VideosModel;

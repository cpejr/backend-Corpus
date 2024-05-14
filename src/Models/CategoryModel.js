import mongoose from "mongoose";

const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
    },
});

const CategoryModel = mongoose.model("videos", CategorySchema);

export default CategoryModel;
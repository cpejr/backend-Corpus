import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ArchivesSchema = new Schema({
  videoKey: {
    type: String,
    required: true,
  },
  thumbKey: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const ArchivesModel = mongoose.model("archives", ArchivesSchema);

export default ArchivesModel;
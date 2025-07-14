import mongoose from "mongoose";

const Schema = mongoose.Schema;

const ManualTranscriptionArchiveSchema = new Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
});

const ManualTranscriptionArchiveModel = mongoose.model(
  "ManualTranscriptionArchive",
  ManualTranscriptionArchiveSchema
);

export default ManualTranscriptionArchiveModel;

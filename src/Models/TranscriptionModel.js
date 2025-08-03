import mongoose from "mongoose";

const TranscriptionSchema = new mongoose.Schema({
  text: { type: String, required: false , unique: false },
  Key: { type: String, required: false },  
});

const TranscriptionModel = mongoose.model("Transcription", TranscriptionSchema);
export default TranscriptionModel;


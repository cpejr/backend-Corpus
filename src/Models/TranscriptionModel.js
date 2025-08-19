import mongoose from "mongoose";

const TranscriptionSchema = new mongoose.Schema({

  Key: { type: String, required: false },  
});

const TranscriptionModel = mongoose.model("Transcription", TranscriptionSchema);
export default TranscriptionModel;
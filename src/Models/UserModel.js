import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: Boolean,
        required: false,
        default: false,
    },
});

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;

import mongoose from "mongoose";
import bcrypt from "bcrypt";

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
        unique: true,
        trim: true,
        lowercase: true,
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
    birthday: {
        type: String,
        required: true,
    }
});

UserSchema.pre("save", async function(next){
    if(this.isModified("password")){
        const salt = await bcrypt.genSalt();
        this.password = await bcrypt.hash(this.password, salt);
    }
    next()
});

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;

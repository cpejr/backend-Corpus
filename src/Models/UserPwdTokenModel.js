import mongoose from "mongoose";

const Schema = mongoose.Schema;

const UserPwdTokenSchema = new Schema(
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: "users",
        required: true,
      },
      token: {
        type: String,
        required: true,
        unique: true,
      },
      createdAt: {
        type: Date,
        required: true,
        default: Date.now,
        expires: 900, // The document will expires at createdAt + 900 seconds (15 minutes). Check https://mongoosejs.com/docs/api/schemadateoptions.html#SchemaDateOptions.prototype.expires
      },
    },
    { versionKey: false }
);
  
const UserPwdTokenModel = mongoose.model("userpwdtokens", UserPwdTokenSchema);

export default UserPwdTokenModel;
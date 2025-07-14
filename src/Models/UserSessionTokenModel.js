import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const UserTokenSchema = new Schema(
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
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // The document will expires at expiresAt + 0 seconds. Check https://mongoosejs.com/docs/api/schemadateoptions.html#SchemaDateOptions.prototype.expires
    },
  },
  { versionKey: false }
);

UserTokenSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
  });
  next();
});

const UserSessionTokenModel = mongoose.model("refresh", UserTokenSchema);

export default UserSessionTokenModel;
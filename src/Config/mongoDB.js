import mongoose from "mongoose";

async function startDB(){
    const mongoUri = 
        "mongodb+srv://" + 
        `${encodeURI(process.env.MONGO_USER)}:` + 
        `${encodeURI(process.env.MONGO_PASS)}@` + 
        `${encodeURI(process.env.MONGO_SERVER)}/` + 
        `${encodeURI(process.env.MONGO_DATABASE)}?`+
        `${encodeURI(process.env.MONGO_OPTIONS)}`;
    await mongoose.connect(mongoUri);
    console.log("DB conectado.");
}

export default startDB;
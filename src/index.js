import app from "./App.js";
import mongoDB from "./Config/mongoDB.js";

mongoDB();
app.listen(process.env.PORT || 8000);

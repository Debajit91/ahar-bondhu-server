const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const connectToDB = require("./DB/connect");
const usersRoutes = require('./routes/users');
const foodRoutes = require('./routes/foods');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectToDB().then((db) => {

  app.use('/users', usersRoutes);
  app.use("/foods", foodRoutes(db));
  

  app.get("/", (req, res) => {
    res.send("Ahar Bondhu Server is running...");
  });

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

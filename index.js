const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const connectToDB = require("./DB/connect");
const usersRoutes = require("./routes/users");
const foodRoutes = require("./routes/foods");
const contactRoutes = require("./routes/contacts");

 const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectToDB().then((db) => {
  app.use("/users", usersRoutes);
  app.use("/foods", foodRoutes(db));
  app.use("/contacts", contactRoutes(db));

  app.get("/", (req, res) => {
    res.send("Ahar Bondhu Server is running...");
  });

 

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  transporter.verify((err, success) => {
    if (err) {
      // console.error("Email transporter error:", err);
    } else {
      // console.log("Email transporter ready to send messages");
    }
  });

  app.listen(port, () => {
    // console.log(`Server running on port ${port}`);
  });
});

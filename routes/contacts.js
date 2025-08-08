const express = require("express");

module.exports = function (db) {
  const router = express.Router();
  const contactCollection = db.collection("contacts");

  router.post("/", async (req, res) => {
    try {
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      await contactCollection.insertOne({
        name,
        email,
        message,
        date: new Date(),
      });

      res.status(201).json({ success: true, message: "Message received" });
    } catch (error) {
      console.error("Error saving contact:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  return router;
};

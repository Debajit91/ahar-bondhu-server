const express = require("express");
const router = express.Router();

module.exports = (db) => {
  const foodCollection = db.collection("foods");

  router.get("/", async (req, res) => {
  const sortBy = req.query.sortBy;
  const filter = { status: "available" };

  const foods = await db.collection("foods")
    .find(filter)
    .sort(sortBy === "expireDate" ? { expireDate: 1 } : {})
    .toArray();

  res.send(foods);
});


  // POST: Add Food
  router.post("/", async (req, res) => {
    try {
      const result = await foodCollection.insertOne(req.body);
      res.status(201).send({ insertedId: result.insertedId });
    } catch (err) {
      console.error("Error adding food:", err);
      res.status(500).send({ error: "Failed to add food" });
    }
  });

  return router;
};

const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = (db) => {
  const foodCollection = db.collection("foods");

  router.get("/", async (req, res) => {
    const sortBy = req.query.sortBy;
    const filter = { status: "available" };

    const foods = await db
      .collection("foods")
      .find(filter)
      .sort(sortBy === "expireDate" ? { expireDate: 1 } : {})
      .toArray();

    res.send(foods);
  });

  router.get("/my-requests", async (req, res) => {
    try {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      const requests = await db
        .collection("foods")
        .find({ status: "requested", requestedBy: email })
        .toArray();

      res.send(requests);
    } catch (err) {
      res.status(500).send({ error: "Could not fetch requested foods" });
    }
  });

  //   single food details route
  router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const food = await db
        .collection("foods")
        .findOne({ _id: new ObjectId(id) });

      if (!food) {
        return res.status(404).send({ message: "Food not found" });
      }

      res.send(food);
    } catch (error) {
      res.status(500).send({ message: "Server error" });
    }
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

  router.patch("/request/:id", async (req, res) => {
    const { id } = req.params;
    const { notes, userEmail, requestDate } = req.body;

    try {
      await db.collection("foods").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "requested",
            requestedBy: userEmail,
            requestDate,
            notes,
          },
        }
      );
      res.send({ message: "Request successful" });
    } catch (err) {
      res.status(500).send({ error: "Update failed" });
    }
  });

  return router;
};

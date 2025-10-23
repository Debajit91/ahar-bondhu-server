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
      .sort(sortBy === "expiredAt" ? { expiredAt: 1 } : {});

    res.send(foods);
  });

  router.get("/user", async (req, res) => {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send({ error: "Email is required" });
    }

    try {
      const userFoods = await db
        .collection("foods")
        .find({ donorEmail: email })
        .toArray();

      res.send(userFoods);
    } catch (err) {
      res.status(500).send({ error: "Failed to fetch user foods" });
    }
  });

  router.get("/nearby", async (req, res) => {
    try {
      // lat, lng কে number এ convert করা
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).send({ error: "Invalid latitude or longitude" });
      }

      const allFoods = await foodCollection
        .find({ status: "available" })
        .toArray();

      // Approx distance filter
      const nearbyFoods = allFoods.filter((food) => {
        if (!food.location) return false;

        const distance = Math.sqrt(
          (food.location.lat - lat) ** 2 + (food.location.lng - lng) ** 2
        );

        return distance < 0.1; // adjust range as needed (~10–15km)
      });

      res.send(nearbyFoods);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Failed to fetch nearby foods" });
    }
  });

  router.get("/featured", async (req, res) => {
    try {
      const foods = await db
        .collection("foods")
        .find({ status: "available" })
        .sort({ quantity: -1 })
        .limit(6)
        .toArray();

      res.send(foods);
    } catch (err) {
      res.status(500).send({ error: "Failed to fetch featured foods" });
    }
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

  router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { foodName, pickupLocation, expiredAt } = req.body;

    try {
      const result = await db.collection("foods").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            foodName,
            pickupLocation,
            expiredAt,
          },
        }
      );

      res.send({ message: "Food updated", result });
    } catch (err) {
      res.status(500).send({ error: "Update failed" });
    }
  });

  // POST: Add Food
  router.post("/", async (req, res) => {
    try {
      const {
        foodName,
        foodImage,
        quantity,
        pickupLocation,
        expiredAt,
        notes,
        donorName,
        donorEmail,
        donorImage, // optional
        status = "available",
        location, // optional: { lat, lng } থাকলে রেখে দাও
      } = req.body;

      const newFood = {
        foodName,
        foodImage,
        quantity,
        pickupLocation,
        expiredAt,
        notes,
        donorName,
        donorEmail,
        donorImage: donorImage || null,
        location: location || null,
        status,
        createdAt: new Date(),
      };

      const result = await foodCollection.insertOne(newFood);
      res.status(201).send({ insertedId: result.insertedId });
    } catch (err) {
      console.error(err);
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

  router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const result = await db
        .collection("foods")
        .deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).send({ error: "Food not found" });
      }

      res.send({ message: "Food deleted successfully" });
    } catch (err) {
      res.status(500).send({ error: "Delete failed" });
    }
  });

  return router;
};

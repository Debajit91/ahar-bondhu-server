const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();

module.exports = (db) => {
  // Helper: get collection safely at request time
  const getFoodCollection = (req) => {
    const database = db || req.app?.locals?.db;
    if (!database) {
      throw new Error("Database handle not available");
    }
    return database.collection("foods");
  };

  // GET /foods
  router.get("/", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const sortBy = req.query.sortBy;
      const filter = { status: "available" };

      let cursor = foodCollection.find(filter);

      // allow-list sort key(s)
      const allowedSorts = new Set(["expiredAt"]);
      if (allowedSorts.has(sortBy)) {
        cursor = cursor.sort({ [sortBy]: 1 });
      }

      const foods = await cursor.toArray();
      res.send(foods);
    } catch (err) {
      console.error("GET /foods failed:", err);
      res.status(500).send({ error: "Failed to fetch foods" });
    }
  });

  // GET /foods/user
  router.get("/user", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email is required" });

      const userFoods = await foodCollection.find({ donorEmail: email }).toArray();
      res.send(userFoods);
    } catch (err) {
      res.status(500).send({ error: "Failed to fetch user foods" });
    }
  });

  // GET /foods/nearby
  router.get("/nearby", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);

      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).send({ error: "Invalid latitude or longitude" });
      }

      const allFoods = await foodCollection.find({ status: "available" }).toArray();

      const nearbyFoods = allFoods.filter((food) => {
        if (!food.location) return false;
        const distance = Math.sqrt(
          (food.location.lat - lat) ** 2 + (food.location.lng - lng) ** 2
        );
        return distance < 0.1;
      });

      res.send(nearbyFoods);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Failed to fetch nearby foods" });
    }
  });

  // GET /foods/featured
  router.get("/featured", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const foods = await foodCollection
        .find({ status: "available" })
        .sort({ quantity: -1 })
        .limit(6)
        .toArray();
      res.send(foods);
    } catch (err) {
      res.status(500).send({ error: "Failed to fetch featured foods" });
    }
  });

  // GET /foods/my-requests
  router.get("/my-requests", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const email = req.query.email;
      if (!email) return res.status(400).send({ error: "Email is required" });

      const requests = await foodCollection
        .find({ status: "requested", requestedBy: email })
        .toArray();

      res.send(requests);
    } catch (err) {
      res.status(500).send({ error: "Could not fetch requested foods" });
    }
  });

  // GET /foods/:id
  router.get("/:id", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const { id } = req.params;
      const food = await foodCollection.findOne({ _id: new ObjectId(id) });
      if (!food) return res.status(404).send({ message: "Food not found" });
      res.send(food);
    } catch (error) {
      res.status(500).send({ message: "Server error" });
    }
  });

  // PATCH /foods/:id
  router.patch("/:id", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const { id } = req.params;
      const { foodName, pickupLocation, expiredAt } = req.body;

      const result = await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { foodName, pickupLocation, expiredAt } }
      );
      res.send({ message: "Food updated", result });
    } catch (err) {
      res.status(500).send({ error: "Update failed" });
    }
  });

  // POST /foods
  router.post("/", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const {
        foodName,
        foodImage,
        quantity,
        pickupLocation,
        expiredAt,
        notes,
        donorName,
        donorEmail,
        donorImage,
        status = "available",
        location,
      } = req.body;

      const newFood = {
        foodName,
        foodImage,
        quantity,
        pickupLocation,
        expiredAt: expiredAt ? new Date(expiredAt) : null,
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

  // PATCH /foods/request/:id
  router.patch("/request/:id", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const { id } = req.params;
      const { notes, userEmail, requestDate } = req.body;

      await foodCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: "requested", requestedBy: userEmail, requestDate, notes } }
      );
      res.send({ message: "Request successful" });
    } catch (err) {
      res.status(500).send({ error: "Update failed" });
    }
  });

  // DELETE /foods/:id
  router.delete("/:id", async (req, res) => {
    try {
      const foodCollection = getFoodCollection(req);
      const { id } = req.params;
      const result = await foodCollection.deleteOne({ _id: new ObjectId(id) });
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

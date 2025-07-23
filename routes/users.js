const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const connectToDB = require('../DB/connect');

router.get("/top-donators", async (req, res)=>{
  try{
    const db = await connectToDB();
    const pipeline = [
      {
        $group:{
          _id: "$donorEmail",
          name:{ $first: "$donorName"},
          count:{ $sum: 1 },
        },
      },
      { $sort: {count: -1}},
      { $limit: 5 },
    ];
    const result = await db.collection("foods").aggregate(pipeline).toArray();
    res.send(result);
  } catch (error){
    res.status(500).send({ message:"Error fetching top donators"});
  }
})

// POST /api/users/register — create new user
router.post('/register', async (req, res) => {
  const { name, email, photoURL } = req.body;

  

  try {
    const db = await connectToDB();

    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = {
      name,
      email,
      photoURL,
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newUser);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Register route error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// // GET /api/users — get all users (for admin or testing)
// router.get('/', async (req, res) => {
//   try {
//     const db = await connectToDB();
//     const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray(); // exclude passwords
//     res.json(users);
//   } catch (error) {
//     console.error('Get users error:', error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// GET /api/users/:id — get single user by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await connectToDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

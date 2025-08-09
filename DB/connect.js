const { MongoClient } = require("mongodb");


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.khtcm39.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri);

const connectToDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db("aharBondhuDB"); 
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
  }
};

module.exports = connectToDB;
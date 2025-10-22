const express = require("express");
const nodemailer = require("nodemailer");

module.exports = function (db) {
  const router = express.Router();
  const contactCollection = db.collection("contacts");

  router.post("/", async (req, res) => {
    const { name, email, message } = req.body;

    // 1️⃣ Basic validation first
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      // 2️⃣ Setup email transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER, // your Gmail address
          pass: process.env.EMAIL_PASS, // your Gmail App Password
        },
      });

      // 3️⃣ Send email to admin (receiver)
      await transporter.sendMail({
        from: `"Ahar Bondhu" <${process.env.EMAIL_USER}>`,
        to: process.env.RECEIVER_EMAIL, // where you’ll receive messages
        subject: `📩 New Message from ${name}`,
        html: `
          <h3>New Contact Message</h3>
          <p><b>Name:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Message:</b><br>${message}</p>
        `,
      });

      // 4️⃣ Send auto-reply to user
      await transporter.sendMail({
        from: `"Ahar Bondhu" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Thank you for contacting Ahar Bondhu!",
        html: `
          <p>Hi ${name},</p>
          <p>We’ve received your message and will get back to you soon.</p>
          <br/>
          <p>Warm regards,<br/>The Ahar Bondhu Team 🍱</p>
        `,
      });

      

      // 5️⃣ Save contact info to database
      await contactCollection.insertOne({
        name,
        email,
        message,
        date: new Date(),
      });

      // 6️⃣ Response
      res.status(201).json({ success: true, message: "Message received and email sent" });
    } catch (error) {
      // console.error("Error in contact route:", error);
      res.status(500).json({ error: "Failed to send email or save message" });
    }
  });

  return router;
};

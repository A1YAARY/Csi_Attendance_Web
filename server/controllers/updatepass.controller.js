const bcrypt = require("bcrypt");
const User = require("../models/user.models"); 

async function updatePassword(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await User.findByIdAndUpdate(userId, { 
      password: hashedPassword, 
      passwordChangedAt: Date.now() // optional
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("updatePassword error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = { updatePassword };

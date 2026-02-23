import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
  try {
    console.log("🔐 REGISTER - Request body:", req.body);
    
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log("❌ REGISTER - Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("❌ REGISTER - User already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    console.log("🔐 REGISTER - Hashing password...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    console.log("🔐 REGISTER - Creating user...");
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    console.log("✅ REGISTER - User created:", user._id);

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ REGISTER - Success");
    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ REGISTER ERROR:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ message: error.message || "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    console.log("🔐 LOGIN - Request body:", req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log("❌ LOGIN - Missing fields");
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user
    console.log("🔐 LOGIN - Looking for user:", email);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log("❌ LOGIN - User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("🔐 LOGIN - User found, comparing password...");
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("❌ LOGIN - Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log("✅ LOGIN - Password matched");

    // Generate token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ LOGIN - Success");
    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ LOGIN ERROR:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ message: error.message || "Login failed" });
  }
};
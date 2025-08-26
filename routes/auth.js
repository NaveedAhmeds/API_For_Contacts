import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

// ===== SIGNUP =====
router.post("/signup", async (req, res) => {
	try {
		const { name, email, password } = req.body;

		if (!name || !email || !password)
			return res.status(400).json({ message: "Name, email, and password are required" });

		const normalizedEmail = email.toLowerCase();

		const existingUser = await User.findOne({ email: normalizedEmail });
		if (existingUser) return res.status(400).json({ message: "User already exists" });

		const newUser = await User.create({
			name,
			email: normalizedEmail,
			password, // hashed automatically via schema pre-save
		});

		res.status(201).json({ message: "Account created successfully", userId: newUser._id });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password)
			return res.status(400).json({ message: "Email and password are required" });

		const normalizedEmail = email.toLowerCase();

		// Case-insensitive search (works for old DB entries)
		const user = await User.findOne({ email: new RegExp(`^${normalizedEmail}$`, "i") });
		if (!user) return res.status(400).json({ message: "Invalid credentials" });

		const isMatch = await user.matchPassword(password);
		if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

		const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
			expiresIn: "1h",
		});

		res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

// ===== FORGOT PASSWORD =====
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;
		if (!email) return res.status(400).json({ message: "Email is required" });

		const normalizedEmail = email.toLowerCase();
		const user = await User.findOne({ email: normalizedEmail });
		if (!user) return res.status(404).json({ message: "User not found" });

		const token = crypto.randomBytes(32).toString("hex");
		user.resetPasswordToken = token;
		user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
		await user.save();

		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
		});

		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: user.email,
			subject: "Password Reset Request",
			text: `Click the link to reset your password: ${process.env.FRONTEND_URL}/reset-password/${token}`,
		});

		res.json({ message: "Password reset link sent to your email" });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

// ===== RESET PASSWORD =====
router.post("/reset-password/:token", async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpires: { $gt: Date.now() },
		});

		if (!user) return res.status(400).json({ message: "Invalid or expired token" });

		user.password = password; // pre-save will hash automatically
		user.resetPasswordToken = undefined;
		user.resetPasswordExpires = undefined;
		await user.save();

		res.json({ message: "Password has been reset successfully" });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

export default router;

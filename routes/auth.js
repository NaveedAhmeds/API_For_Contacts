import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const router = express.Router();

// ===== SIGNUP =====
router.post("/signup", async (req, res) => {
	try {
		const { name, email, password } = req.body;

		const existingUser = await User.findOne({ email });
		if (existingUser)
			return res.status(400).json({ message: "User already exists" });

		const hashedPassword = await bcrypt.hash(password, 10);

		const newUser = await User.create({
			name,
			email,
			password: hashedPassword,
		});

		res
			.status(201)
			.json({ message: "User registered successfully", userId: newUser._id });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

// ===== LOGIN =====
router.post("/login", async (req, res) => {
	try {
		const { email, password } = req.body;

		const user = await User.findOne({ email });
		if (!user) return res.status(400).json({ message: "Invalid credentials" });

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch)
			return res.status(400).json({ message: "Invalid credentials" });

		const token = jwt.sign(
			{ id: user._id, email: user.email },
			process.env.JWT_SECRET,
			{ expiresIn: "1h" }
		);

		res.json({
			token,
			user: { id: user._id, name: user.name, email: user.email },
		});
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

// ===== FORGOT PASSWORD =====
router.post("/forgot-password", async (req, res) => {
	try {
		const { email } = req.body;

		const user = await User.findOne({ email });
		if (!user) return res.status(404).json({ message: "User not found" });

		// Generate token
		const token = crypto.randomBytes(32).toString("hex");
		user.resetPasswordToken = token;
		user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
		await user.save();

		// Setup email
		const transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_USER,
				pass: process.env.EMAIL_PASS,
			},
		});

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user.email,
			subject: "Password Reset Request",
			text: `You requested a password reset. Click the link to reset your password: ${process.env.FRONTEND_URL}/reset-password/${token}`,
		};

		await transporter.sendMail(mailOptions);

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
			resetPasswordExpires: { $gt: Date.now() }, // still valid
		});

		if (!user) {
			return res.status(400).json({ message: "Invalid or expired token" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpires = undefined;
		await user.save();

		res.json({ message: "Password has been reset successfully" });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

export default router;

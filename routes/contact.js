import express from "express";
import Contact from "../models/Contact.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

//Add new contact...
router.post("/", authMiddleware, async (req, res) => {
	try {
		const { name, email, phone, notes } = req.body;

		const contact = await Contact.create({
			userId: req.user.id,
			name,
			email,
			phone,
			notes,
		});

		res.status(201).json(contact);
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

//Get all contacts for logged in user...
router.get("/", authMiddleware, async (req, res) => {
	try {
		const contacts = await Contact.find({ userId: req.user.id });
		res.json(contacts);
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

//Update a contact...
router.put("/:id", authMiddleware, async (req, res) => {
	try {
		const { name, email, phone, notes } = req.body;

		const contact = await Contact.findOneAndUpdate(
			{ _id: req.params.id, userId: req.user.id },
			{ name, email, phone, notes },
			{ new: true }
		);

		if (!contact) return res.status(404).json({ message: "Contact not found" });

		res.json(contact);
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

//Delete a contact...
router.delete("/:id", authMiddleware, async (req, res) => {
	try {
		const contact = await Contact.findOneAndDelete({
			_id: req.params.id,
			userId: req.user.id,
		});

		if (!contact) return res.status(404).json({ message: "Contact not found" });

		res.json({ message: "Contact deleted" });
	} catch (err) {
		res.status(500).json({ message: "Server error", error: err.message });
	}
});

export default router;

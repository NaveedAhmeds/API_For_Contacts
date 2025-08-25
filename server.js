import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js";
import contactRoutes from "./routes/contact.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI =
	process.env.MONGO_URI ||
	"mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority";

//Connect to MongoDB and start server only if successful...
const startServer = async () => {
	try {
		await mongoose.connect(MONGO_URI);
		console.log("MongoDB connected successfully");

		//Register routes after DB connection...
		app.use("/api/auth", authRoutes);
		app.use("/api/contacts", contactRoutes);

		//Test route...
		app.get("/", (req, res) => {
			res.send("API is running...");
		});

		const PORT = process.env.PORT || 5000;
		app.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
		});
	} catch (err) {
		console.error("MongoDB connection error:", err);
		process.exit(1);
	}
};

startServer();

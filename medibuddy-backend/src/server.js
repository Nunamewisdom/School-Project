import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "MediBuddy API running successfully 🚀" });
});

// TODO: Import your routes here
// import routes from "./routes/index.js";
// app.use("/api", routes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
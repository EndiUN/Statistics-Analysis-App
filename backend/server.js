const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
require("dotenv").config();

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: "*",
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✓ MongoDB connected successfully"))
  .catch((error) => {
    console.error("✗ MongoDB connection error:", error);
    process.exit(1);
  });

// Routes
const scenarioRoutes = require("./routes/scenarios");
app.use("/api/scenarios", scenarioRoutes);

const datasetRoutes = require("./routes/datasets");
app.use("/api/datasets", datasetRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(
    `✓ API endpoints available at http://localhost:${PORT}/api/scenarios`,
  );
});

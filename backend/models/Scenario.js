const mongoose = require("mongoose");

const scenarioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    toolType: {
      type: String,
      enum: [
        "minitool1",
        "minitool2",
        "minitool3",
      ],
      required: true,
    },
    /**
     * Polymorphic per-toolType payload. Validation lives in
     * utils/scenarioValidator.js (see canonicalizeFromRows / validateCanonical).
     *
     * NOTE: Mongoose cannot detect in-place mutations of a Mixed field, so any
     * route that updates an existing document MUST call
     *   scenario.markModified("data");
     * before scenario.save(). The PUT handler in routes/scenarios.js does this.
     */
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Scenario", scenarioSchema);

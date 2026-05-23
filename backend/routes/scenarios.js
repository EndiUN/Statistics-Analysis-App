const express = require("express");
const mongoose = require("mongoose");
const Scenario = require("../models/Scenario");
const {
  validateCanonical,
  VALID_TOOL_TYPES,
} = require("../utils/scenarioValidator");

const router = express.Router();

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

/** Validate that a route param is a valid MongoDB ObjectId */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/scenarios
 * Retrieve all scenarios
 */
router.get("/", async (req, res) => {
  try {
    const scenarios = await Scenario.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: scenarios.length,
      data: scenarios,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scenarios/tool/:toolType
 * Retrieve all scenarios for a specific tool type
 */
router.get("/tool/:toolType", async (req, res) => {
  try {
    if (!VALID_TOOL_TYPES.includes(req.params.toolType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid toolType. Must be one of: ${VALID_TOOL_TYPES.join(", ")}`,
      });
    }

    const scenarios = await Scenario.find({
      toolType: req.params.toolType,
    }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: scenarios.length,
      data: scenarios,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/scenarios/:id
 * Retrieve a single scenario by ID
 */
router.get("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid scenario ID" });
    }
    const scenario = await Scenario.findById(req.params.id);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: "Scenario not found",
      });
    }
    res.json({
      success: true,
      data: scenario,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve scenario",
    });
  }
});

/**
 * POST /api/scenarios
 * Create a new scenario (manual creation from the app).
 * Body: { name, description, toolType, data }
 *
 * The `data` field must match the canonical shape defined in
 * utils/scenarioValidator.js so that documents are interchangeable
 * with those created via file upload (POST /api/datasets/upload).
 */
router.post("/", async (req, res) => {
  try {
    const { name, description, toolType, data } = req.body;

    // 1. Basic Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: "Scenario name is required",
      });
    }

    if (name.trim().length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Scenario name must be ${MAX_NAME_LENGTH} characters or less`,
      });
    }

    if (description && description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({
        success: false,
        error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
      });
    }

    if (!VALID_TOOL_TYPES.includes(toolType)) {
      return res.status(400).json({
        success: false,
        error: `toolType must be one of: ${VALID_TOOL_TYPES.join(", ")}. Received: ${toolType}`,
      });
    }

    if (!data) {
      return res.status(400).json({
        success: false,
        error: "Data is required",
      });
    }

    // 2. Validate against the canonical schema
    try {
      validateCanonical(data, toolType);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message,
      });
    }

    // 3. Create Scenario
    const scenario = new Scenario({
      name: name.trim(),
      description: description || "",
      toolType,
      data,
    });

    await scenario.save();
    res.status(201).json({
      success: true,
      message: "Scenario created successfully",
      data: scenario,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to create scenario",
    });
  }
});

/**
 * PUT /api/scenarios/:id
 * Update an existing scenario
 * Body: { name, description, data }
 */
router.put("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid scenario ID" });
    }

    const { name, description, data } = req.body;

    const scenario = await Scenario.findById(req.params.id);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: "Scenario not found",
      });
    }

    // Update fields if provided
    if (name) {
      if (name.trim().length > MAX_NAME_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Scenario name must be ${MAX_NAME_LENGTH} characters or less`,
        });
      }
      scenario.name = name.trim();
    }
    if (description !== undefined) {
      if (description.length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({
          success: false,
          error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`,
        });
      }
      scenario.description = description;
    }
    if (data) {
      // Validate against the canonical schema for this tool type
      try {
        validateCanonical(data, scenario.toolType);
      } catch (validationError) {
        return res.status(400).json({
          success: false,
          error: validationError.message,
        });
      }
      scenario.data = data;
      scenario.markModified("data");
    }

    await scenario.save();
    res.json({
      success: true,
      message: "Scenario updated successfully",
      data: scenario,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to update scenario",
    });
  }
});

/**
 * DELETE /api/scenarios/:id
 * Delete a scenario
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid scenario ID" });
    }
    const scenario = await Scenario.findByIdAndDelete(req.params.id);
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: "Scenario not found",
      });
    }
    res.json({
      success: true,
      message: "Scenario deleted successfully",
      data: scenario,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete scenario",
    });
  }
});

module.exports = router;

const path = require("path");
const XLSX = require("xlsx");
const Papa = require("papaparse");
const Scenario = require("../models/Scenario");
const {
  VALID_TOOL_TYPES,
  canonicalizeFromRows,
} = require("../utils/scenarioValidator");

/**
 * Parse a CSV buffer into an array of objects.
 * PapaParse with `header:true` so each row becomes { col: val, ... }.
 */
function parseCsv(buffer) {
  const text = buffer.toString("utf-8");
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (result.errors.length > 0) {
    const fatalErrors = result.errors.filter(
      (e) => e.type === "Quotes" || e.type === "FieldMismatch",
    );
    if (fatalErrors.length > 0) {
      throw new Error(
        `CSV parsing error: ${fatalErrors.map((e) => e.message).join("; ")}`,
      );
    }
  }

  return result.data;
}

/** Parse an Excel buffer (first sheet only) into an array of row objects. */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (workbook.SheetNames.length === 0) {
    throw new Error("Excel file contains no sheets.");
  }
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null });
}

/**
 * POST /api/datasets/upload
 *
 * The upload pipeline parses the file, transforms the rows into the canonical
 * `data` shape (the same shape the manual POST /api/scenarios endpoint
 * persists) and saves it. Both endpoints therefore yield interchangeable
 * documents.
 */
async function uploadDataset(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded. Please select a .csv, .xls, or .xlsx file.",
      });
    }

    const { name, description, toolType } = req.body;

    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, error: "Scenario name is required." });
    }

    if (!VALID_TOOL_TYPES.includes(toolType)) {
      return res.status(400).json({
        success: false,
        error:
          "toolType must be one of: " +
          VALID_TOOL_TYPES.join(", ") +
          `. Received: ${toolType}`,
      });
    }

    // --- Parse ---
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawData;
    try {
      if (ext === ".csv") {
        rawData = parseCsv(req.file.buffer);
      } else if (ext === ".xls" || ext === ".xlsx") {
        rawData = parseExcel(req.file.buffer);
      } else {
        return res.status(400).json({
          success: false,
          error: `Unsupported file format "${ext}".`,
        });
      }
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: "File parsing failed: " + parseError.message,
      });
    }

    // --- Canonicalize + validate (single source of truth) ---
    let canonicalData;
    try {
      canonicalData = canonicalizeFromRows(rawData, toolType);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: "Data validation failed: " + validationError.message,
      });
    }

    // --- Persist ---
    const scenario = await Scenario.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      toolType,
      data: canonicalData,
    });

    return res.status(200).json({
      success: true,
      message: `Scenario "${scenario.name}" uploaded successfully.`,
      data: scenario,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error while processing the upload.",
    });
  }
}

module.exports = { uploadDataset };

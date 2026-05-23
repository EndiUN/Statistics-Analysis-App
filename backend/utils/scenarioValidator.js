/**
 * Canonical scenario validator + transformer.
 *
 * This module is the single source of truth for the shape of `Scenario.data`
 * per `toolType`. Both the manual POST /api/scenarios endpoint and the file
 * upload pipeline (POST /api/datasets/upload) MUST funnel through here so
 * the persisted documents are interchangeable.
 *
 * Two entry points are exported:
 *   - validateCanonical(data, toolType) — validates an already-canonical
 *     `data` payload (the shape used in the DB).
 *   - canonicalizeFromRows(rows, toolType) — converts a parsed CSV/Excel
 *     row array into the canonical `data` payload, then validates it.
 */

const VALID_TOOL_TYPES = [
  "minitool1",
  "minitool2",
  "minitool3",
];

const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);

/* -------------------------------------------------------------------------- */
/*  Validation of an already-canonical payload                                */
/* -------------------------------------------------------------------------- */

function validateCanonical(data, toolType) {
  if (typeof data !== "object" || data === null) {
    throw new Error("Data must be an object.");
  }

  switch (toolType) {
    case "minitool1": {
      if (!Array.isArray(data.bars)) {
        throw new Error("minitool1: data.bars must be an array.");
      }
      if (!isFiniteNumber(data.minLifespan) || !isFiniteNumber(data.maxLifespan)) {
        throw new Error(
          "minitool1: data.minLifespan and data.maxLifespan must be numbers.",
        );
      }
      const ok = data.bars.every(
        (b) =>
          b &&
          typeof b === "object" &&
          typeof b.brand === "string" &&
          isFiniteNumber(b.lifespan) &&
          b.lifespan >= 1 &&
          b.lifespan <= 130,
      );
      if (!ok) {
        throw new Error(
          "minitool1: every bar must have a string brand and numeric lifespan in [1, 130].",
        );
      }
      return true;
    }

    case "minitool2": {
      if (!Array.isArray(data.dataBefore) || !Array.isArray(data.dataAfter)) {
        throw new Error(
          "minitool2: data.dataBefore and data.dataAfter must be arrays.",
        );
      }
      if (
        !data.dataBefore.every(isFiniteNumber) ||
        !data.dataAfter.every(isFiniteNumber)
      ) {
        throw new Error(
          "minitool2: dataBefore and dataAfter must contain only numbers.",
        );
      }
      return true;
    }

    case "minitool3": {
      if (!Array.isArray(data.currentData)) {
        throw new Error("minitool3: data.currentData must be an array.");
      }
      const ok = data.currentData.every(
        (p) => p && typeof p === "object" && isFiniteNumber(p.x) && isFiniteNumber(p.y),
      );
      if (!ok) {
        throw new Error(
          "minitool3: every point must have numeric x and y values.",
        );
      }
      return true;
    }

    default:
      throw new Error(
        `Invalid toolType "${toolType}". Supported: ${VALID_TOOL_TYPES.join(", ")}.`,
      );
  }
}

/* -------------------------------------------------------------------------- */
/*  Canonicalization from parsed CSV / Excel rows                             */
/* -------------------------------------------------------------------------- */

/** Find a column name (case-insensitive) within a row object. */
function findKey(obj, name) {
  return Object.keys(obj).find((k) => k.toLowerCase() === name.toLowerCase());
}

function coerceNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Convert a parsed row array into the canonical `data` payload.
 * Throws with a teacher-readable message on any structural problem.
 */
function canonicalizeFromRows(rows, toolType) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Parsed file is empty or contains no data rows.");
  }

  switch (toolType) {
    case "minitool1": {
      const sample = rows[0];
      const brandKey = findKey(sample, "brand");
      const lifespanKey = findKey(sample, "lifespan");
      if (!brandKey || !lifespanKey) {
        throw new Error(
          "minitool1 expects columns 'brand' and 'lifespan'. Found: " +
            Object.keys(sample).join(", "),
        );
      }
      const bars = rows.map((r, i) => {
        const lifespan = coerceNumber(r[lifespanKey]);
        if (lifespan === null) {
          throw new Error(`Row ${i + 1}: 'lifespan' is not a valid number.`);
        }
        return { brand: String(r[brandKey]), lifespan };
      });
      const lifespans = bars.map((b) => b.lifespan);
      const data = {
        bars,
        minLifespan: Math.min(...lifespans),
        maxLifespan: Math.max(...lifespans),
      };
      validateCanonical(data, toolType);
      return data;
    }

    case "minitool2": {
      const sample = rows[0];
      const beforeKey = findKey(sample, "before");
      const afterKey = findKey(sample, "after");
      if (!beforeKey || !afterKey) {
        throw new Error(
          "minitool2 expects columns 'before' and 'after'. Found: " +
            Object.keys(sample).join(", "),
        );
      }
      const dataBefore = [];
      const dataAfter = [];
      rows.forEach((r, i) => {
        const b = coerceNumber(r[beforeKey]);
        const a = coerceNumber(r[afterKey]);
        if (b !== null) dataBefore.push(b);
        if (a !== null) dataAfter.push(a);
        if (b === null && a === null) {
          throw new Error(`Row ${i + 1}: both 'before' and 'after' are empty.`);
        }
      });
      const data = { dataBefore, dataAfter };
      validateCanonical(data, toolType);
      return data;
    }

    case "minitool3": {
      const sample = rows[0];
      const xKey = findKey(sample, "x");
      const yKey = findKey(sample, "y");
      if (!xKey || !yKey) {
        throw new Error(
          "minitool3 expects columns 'x' and 'y'. Found: " +
            Object.keys(sample).join(", "),
        );
      }
      const currentData = rows.map((r, i) => {
        const x = coerceNumber(r[xKey]);
        const y = coerceNumber(r[yKey]);
        if (x === null || y === null) {
          throw new Error(`Row ${i + 1}: 'x' and/or 'y' is not a valid number.`);
        }
        return { x, y };
      });
      const data = { currentData };
      validateCanonical(data, toolType);
      return data;
    }

    default:
      throw new Error(
        `Invalid toolType "${toolType}". Supported: ${VALID_TOOL_TYPES.join(", ")}.`,
      );
  }
}

module.exports = {
  VALID_TOOL_TYPES,
  validateCanonical,
  canonicalizeFromRows,
};

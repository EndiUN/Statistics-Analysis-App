const multer = require("multer");
const path = require("path");

// Allowed extensions for tabular uploads.
// MIME type is intentionally NOT used as an acceptance criterion: mobile
// platforms and several web browsers report it inconsistently (often
// `application/octet-stream`), which would lead to false rejections.
// File contents are validated downstream by the parser/canonicalizer.
const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

// 5 MB file size limit.
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Multer configuration:
 * - Memory storage (no temp files on disk -> no orphan cleanup, smaller attack surface)
 * - Extension-only file type filter
 * - 5MB size limit (DoS guard)
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(
          `Invalid file extension "${ext}". Only .csv, .xls, and .xlsx files are allowed.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
});

module.exports = upload;

import Click from "../models/Click.js";
import URLModel from "../models/URL.js";
import { buildShortUrl } from "../utils/shortUrl.js";
import AppError from "../utils/AppError.js";

const FORMATS = new Set(["csv", "excel", "json"]);

function assertFormat(format) {
  const normalizedFormat = String(format ?? "csv").toLowerCase();

  if (!FORMATS.has(normalizedFormat)) {
    throw new AppError("Export format must be csv, excel, or json.", 400);
  }

  return normalizedFormat;
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))].join("\n");
}

function rowsToExcel(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [headers.join("\t"), ...rows.map((row) => headers.map((header) => String(row[header] ?? "").replaceAll("\t", " ")).join("\t"))].join("\n");
}

function exportResponse(rows, format, basename) {
  if (format === "json") {
    return {
      filename: `${basename}.json`,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(rows, null, 2),
    };
  }

  if (format === "excel") {
    return {
      filename: `${basename}.xls`,
      contentType: "application/vnd.ms-excel; charset=utf-8",
      body: rowsToExcel(rows),
    };
  }

  return {
    filename: `${basename}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: rowsToCsv(rows),
  };
}

function sendExport(response, exportData) {
  response.set({
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="${exportData.filename}"`,
    "Content-Type": exportData.contentType,
  });
  response.send(exportData.body);
}

export async function exportUrls(userId, format) {
  const normalizedFormat = assertFormat(format);
  const urls = await URLModel.find({ user: userId }).select("+passwordHash").sort({ createdAt: -1 }).lean();
  const rows = urls.map((url) => ({
    id: url._id.toString(),
    title: url.title ?? "",
    originalUrl: url.originalUrl,
    shortUrl: buildShortUrl(url.shortCode),
    shortCode: url.shortCode,
    clicks: url.clickCount,
    active: url.isActive,
    archived: url.isArchived,
    favorite: url.isFavorite,
    passwordProtected: Boolean(url.passwordHash),
    activatesAt: url.activatesAt?.toISOString() ?? "",
    deactivatesAt: url.deactivatesAt?.toISOString() ?? "",
    expiresAt: url.expiresAt?.toISOString() ?? "",
    notes: url.notes ?? "",
    createdAt: url.createdAt?.toISOString() ?? "",
    updatedAt: url.updatedAt?.toISOString() ?? "",
  }));

  return exportResponse(rows, normalizedFormat, "shortly-urls");
}

export async function exportAnalytics(userId, format) {
  const normalizedFormat = assertFormat(format);
  const urls = await URLModel.find({ user: userId }).select("_id shortCode originalUrl title clickCount").lean();
  const urlIds = urls.map((url) => url._id);
  const clicks = await Click.find({ url: { $in: urlIds } }).sort({ clickedAt: -1 }).lean();
  const urlById = new Map(urls.map((url) => [url._id.toString(), url]));
  const rows = clicks.map((click) => {
    const url = urlById.get(click.url.toString());
    return {
      clickedAt: click.clickedAt?.toISOString() ?? "",
      shortUrl: url ? buildShortUrl(url.shortCode) : "",
      originalUrl: url?.originalUrl ?? "",
      browser: click.browser ?? "Unknown",
      device: click.device ?? "Unknown",
      operatingSystem: click.operatingSystem ?? "Unknown",
      country: click.country ?? "Unknown",
      city: click.city ?? "Unknown",
      referrer: click.referrer ?? "",
    };
  });

  return exportResponse(rows, normalizedFormat, "shortly-analytics");
}

export { sendExport };

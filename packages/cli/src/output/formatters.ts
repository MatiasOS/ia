import type { OutputFormat, CommandResult } from "../types.js";

/**
 * Format a CommandResult for output.
 */
export function formatOutput<T>(result: CommandResult<T>, format: OutputFormat): string {
  if (!result.data) {
    if (result.error) {
      return formatError(result.error.code, result.error.message);
    }
    return "";
  }

  switch (format) {
    case "json":
      return JSON.stringify(result.data, null, 2);
    case "table":
      return formatTable(result.data);
    case "stream":
      return JSON.stringify(result.data);
    default:
      return JSON.stringify(result.data, null, 2);
  }
}

function formatError(code: string, message: string): string {
  return JSON.stringify({ error: { code, message } }, null, 2);
}

function formatTable(data: unknown): string {
  if (Array.isArray(data)) {
    return formatArrayAsTable(data);
  }

  if (typeof data === "object" && data !== null) {
    // Check if it has an entries array (common pattern for algorithm results)
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.entries)) {
      return formatArrayAsTable(obj.entries as Record<string, unknown>[]);
    }

    // Format single object as key-value pairs
    return Object.entries(obj)
      .map(([key, value]) => `${key}: ${formatValue(value)}`)
      .join("\n");
  }

  return String(data);
}

function formatArrayAsTable(rows: unknown[]): string {
  if (rows.length === 0) return "(empty)";

  const firstRow = rows[0];
  if (typeof firstRow !== "object" || firstRow === null) {
    return rows.map(String).join("\n");
  }

  const keys = Object.keys(firstRow as object);
  const widths = keys.map((key) => {
    const values = rows.map((row) => {
      const val = (row as Record<string, unknown>)[key];
      return formatValue(val).length;
    });
    return Math.max(key.length, ...values);
  });

  const header = keys.map((key, i) => key.padEnd(widths[i] ?? 0)).join(" | ");
  const separator = widths.map((w) => "-".repeat(w)).join("-+-");
  const body = rows.map((row) => {
    return keys
      .map((key, i) => {
        const val = (row as Record<string, unknown>)[key];
        return formatValue(val).padEnd(widths[i] ?? 0);
      })
      .join(" | ");
  });

  return [header, separator, ...body].join("\n");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return JSON.stringify(value);
}

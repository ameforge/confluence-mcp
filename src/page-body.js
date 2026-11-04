import {writeFile} from "node:fs/promises";
import {z} from "zod";

export const bodyParamsSchema = {
  body_format: z
    .enum(["storage", "view", "none"])
    .optional()
    .describe(
      "Body representation: 'storage' (default, raw XHTML), 'view' (rendered HTML), or 'none' (metadata only)",
    ),
  body_limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Max characters of body to return (default 40000)"),
  body_start: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Character offset to start the body slice from (default 0)"),
  save_to: z
    .string()
    .optional()
    .describe(
      "Absolute local file path to write the full body to (must not exist); the result then carries metadata only. Use for large pages you want to grep or read in parts",
    ),
};

const DEFAULT_LIMIT = 40000;

export const expandForBody = (bodyFormat) => {
  if (bodyFormat === "none") return [];
  if (bodyFormat === "view") return ["body.view"];
  return ["body.storage"];
};

/**
 * @param {any} page
 * @param {{body_format?: string, body_start?: number, body_limit?: number, save_to?: string}} [opts]
 */
export const formatPage = async (
  page,
  {body_format, body_start, body_limit, save_to} = {},
) => {
  const format = body_format ?? "storage";
  const start = body_start ?? 0;
  const limit = body_limit ?? DEFAULT_LIMIT;

  const {body, ...rest} = page;

  if (format === "none") {
    return JSON.stringify(rest);
  }

  const raw = body?.[format]?.value ?? "";
  if (save_to) {
    // "wx" fails with EEXIST instead of silently replacing a local file.
    await writeFile(save_to, raw, {flag: "wx"});
    return JSON.stringify({
      ...rest,
      body: {body_length: raw.length, format, saved_to: save_to},
    });
  }
  const slice = raw.slice(start, start + limit);
  const end = start + slice.length;

  return JSON.stringify({
    ...rest,
    body: {
      body_end: end,
      body_length: raw.length,
      body_start: start,
      format,
      truncated: end < raw.length,
      value: slice,
    },
  });
};

import {z} from "zod";
import {readForEdit, writePage} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";
import {resolveBody, writeBodyParamsSchema} from "../../markdown.js";

export const updatePage = async ({
  body,
  body_format,
  expected_version,
  page_id,
  title,
}) => {
  const current = await readForEdit(page_id);
  // A body built from an older get_page would wipe edits saved since then.
  if (
    expected_version !== undefined &&
    current.version.number !== expected_version
  ) {
    throw new Error(
      `Page ${page_id} is at version ${current.version.number}, not ${expected_version}: someone edited it since. Read it again with get_page and rebuild the body. Nothing was written.`,
    );
  }
  const value = resolveBody(body, body_format) ?? current.body.storage.value;
  return writePage(page_id, {current, title, value});
};

export const registerUpdatePage = (server) => {
  defineTool(
    server,
    "update_page",
    {
      description:
        "Update a Confluence page. This is a full replace and auto-increments the version. Pass Markdown with body_format='markdown' (converted server-side), or raw Confluence storage format (XHTML) with the default body_format='storage'; omit body/title to keep existing values",
      inputSchema: z.object({
        body: z
          .string()
          .optional()
          .describe(
            "New page content. Markdown when body_format='markdown', else Confluence storage format; omit to keep existing content",
          ),
        expected_version: z
          .number()
          .int()
          .optional()
          .describe(
            "Version number get_page returned for the page this body was built from; the update is refused if the page has changed since",
          ),
        page_id: z.string().describe("Confluence page/content ID to update"),
        title: z
          .string()
          .optional()
          .describe("New title; omit to keep existing title"),
        ...writeBodyParamsSchema,
      }),
    },
    updatePage,
  );
};

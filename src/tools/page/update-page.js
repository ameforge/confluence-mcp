import {z} from "zod";
import {readForEdit, writePage} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";
import {resolveBody, writeBodyParamsSchema} from "../../markdown.js";

export const updatePage = async ({body, body_format, page_id, title}) => {
  const current = await readForEdit(page_id);
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

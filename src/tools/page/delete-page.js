import {z} from "zod";
import {runBatch} from "../../batch.js";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const deletePage = async ({page_id}) => {
  await confluenceRequest("DELETE", `/content/${page_id}`);
  return `Page ${page_id} moved to trash`;
};

export const registerDeletePage = (server) => {
  defineTool(
    server,
    "delete_page",
    {
      description:
        "Move a Confluence page to trash (recoverable). Does not permanently purge",
      inputSchema: z.object({
        page_id: z
          .string()
          .describe("Confluence page/content ID to move to trash"),
      }),
    },
    deletePage,
  );

  defineTool(
    server,
    "delete_pages",
    {
      description:
        "Move several Confluence pages to trash (recoverable). Does not permanently purge. Pages are processed in order; a failure on one does not stop the rest, and the result lists each page's outcome",
      inputSchema: z.object({
        page_ids: z
          .array(z.string())
          .min(1)
          .describe("Confluence page/content IDs to move to trash"),
      }),
    },
    ({page_ids}) => runBatch(page_ids, (page_id) => deletePage({page_id})),
  );
};

import {z} from "zod";
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
};

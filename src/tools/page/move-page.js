import {z} from "zod";
import {runBatch} from "../../batch.js";
import {
  confluenceRequest,
  readForEdit,
  writePage,
} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const movePage = async ({page_id, parent_id}) => {
  const [current, parent] = await Promise.all([
    readForEdit(page_id),
    confluenceRequest("GET", `/content/${parent_id}?expand=space`),
  ]);
  await writePage(page_id, {
    current,
    parentId: parent_id,
    spaceKey: parent.space.key,
    value: current.body.storage.value,
  });
  return `Page ${page_id} moved under "${parent.title}" (${parent_id}) in space ${parent.space.key}`;
};

export const registerMovePage = (server) => {
  defineTool(
    server,
    "move_page",
    {
      description:
        "Move a Confluence page (with its children) under a new parent page, including a parent in another space. Content and title are kept; the version increments",
      inputSchema: z.object({
        page_id: z.string().describe("Confluence page/content ID to move"),
        parent_id: z
          .string()
          .describe("ID of the page that becomes the new parent"),
      }),
    },
    movePage,
  );

  defineTool(
    server,
    "move_pages",
    {
      description:
        "Move several Confluence pages (each with its children) under the same new parent page, including a parent in another space. Pages are processed in order; a failure on one does not stop the rest, and the result lists each page's outcome",
      inputSchema: z.object({
        page_ids: z
          .array(z.string())
          .min(1)
          .describe("Confluence page/content IDs to move"),
        parent_id: z
          .string()
          .describe("ID of the page that becomes the new parent"),
      }),
    },
    ({page_ids, parent_id}) =>
      runBatch(page_ids, (page_id) => movePage({page_id, parent_id})),
  );
};

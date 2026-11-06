import {z} from "zod";
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
};

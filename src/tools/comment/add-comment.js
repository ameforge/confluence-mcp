import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const addComment = async ({body, page_id}) => {
  const payload = {
    body: {storage: {representation: "storage", value: body}},
    container: {id: page_id, type: "page"},
    type: "comment",
  };
  return confluenceRequest("POST", "/content", payload);
};

export const registerAddComment = (server) => {
  defineTool(
    server,
    "add_comment",
    {
      description:
        "Add a comment to a Confluence page. Body must be Confluence storage format (XHTML), not Markdown",
      inputSchema: z.object({
        body: z
          .string()
          .describe(
            "Comment content in Confluence storage format (XHTML), not Markdown",
          ),
        page_id: z
          .string()
          .describe("Confluence page/content ID to comment on"),
      }),
    },
    addComment,
  );
};

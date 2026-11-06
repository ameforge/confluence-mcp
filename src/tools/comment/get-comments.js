import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const getComments = async ({page_id, start = 0}) => {
  const params = new URLSearchParams({
    expand: "body.view",
    limit: "50",
    start: String(start),
  });
  return confluenceRequest(
    "GET",
    `/content/${page_id}/child/comment?${params}`,
  );
};

export const registerGetComments = (server) => {
  defineTool(
    server,
    "get_comments",
    {
      description:
        "Get comments on a Confluence page, 50 per call. When the result has _links.next, call again with start increased by 50",
      inputSchema: z.object({
        page_id: z
          .string()
          .describe("Confluence page/content ID to fetch comments for"),
        start: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("Offset of the first comment (default 0)"),
      }),
    },
    getComments,
  );
};

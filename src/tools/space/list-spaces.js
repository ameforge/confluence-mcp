import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const listSpaces = async ({limit = 25, space_key}) => {
  if (space_key) {
    return confluenceRequest("GET", `/space/${space_key}`);
  }
  const params = new URLSearchParams({limit: String(limit)});
  return confluenceRequest("GET", `/space?${params}`);
};

export const registerListSpaces = (server) => {
  defineTool(
    server,
    "list_spaces",
    {
      description: "List Confluence spaces, or fetch a single space by key",
      inputSchema: z.object({
        limit: z
          .number()
          .default(25)
          .optional()
          .describe("Max results (ignored if space_key is set)"),
        space_key: z
          .string()
          .optional()
          .describe(
            "Exact space key to fetch a single space; omit to list all spaces",
          ),
      }),
    },
    listSpaces,
  );
};

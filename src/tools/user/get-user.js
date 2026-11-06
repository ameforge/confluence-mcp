import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const getUser = async ({key, username}) => {
  if (!key && !username) {
    throw new Error("Provide either 'key' or 'username'.");
  }
  const params = new URLSearchParams();
  if (key) params.set("key", key);
  else params.set("username", username);
  return confluenceRequest("GET", `/user?${params}`);
};

export const registerGetUser = (server) => {
  defineTool(
    server,
    "get_user",
    {
      description:
        "Resolve a Confluence user's display name and profile from a userKey or username. Useful for turning a page's stored userkey (e.g. from a user mention/link) into a readable name.",
      inputSchema: z.object({
        key: z
          .string()
          .optional()
          .describe("User key (e.g. 2c94808299488f660199f0f7f8910013)"),
        username: z.string().optional().describe("Username (login name)"),
      }),
    },
    getUser,
  );
};

import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";
import {bodyParamsSchema, expandForBody, formatPage} from "../../page-body.js";

export const getPageByTitle = async ({space_key, title, ...opts}) => {
  const params = new URLSearchParams({
    expand: [...expandForBody(opts.body_format), "version"].join(","),
    spaceKey: space_key,
    title,
  });
  const result = await confluenceRequest("GET", `/content?${params}`);
  const page = result.results?.[0];
  if (!page) {
    return `No page found with title "${title}" in space ${space_key}`;
  }
  return formatPage(page, opts);
};

export const registerGetPageByTitle = (server) => {
  defineTool(
    server,
    "get_page_by_title",
    {
      description: "Get a Confluence page by its space key and exact title",
      inputSchema: z.object({
        space_key: z.string().describe("Confluence space key, e.g. ENG"),
        title: z.string().describe("Exact page title to look up"),
        ...bodyParamsSchema,
      }),
    },
    getPageByTitle,
  );
};

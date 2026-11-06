import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";

export const searchPages = async ({cql, limit = 25, start = 0}) => {
  const params = new URLSearchParams({
    cql,
    limit: String(limit),
    start: String(start),
  });
  return confluenceRequest("GET", `/content/search?${params}`);
};

export const registerSearchPages = (server) => {
  defineTool(
    server,
    "search_pages",
    {
      description:
        "Search Confluence content using CQL (Confluence Query Language)",
      inputSchema: z.object({
        cql: z
          .string()
          .describe(
            "CQL query, e.g. 'type=page AND space=ENG AND title~\"deploy\"', or 'ancestor=123456' for every page under a page (parent=123456 for direct children only). Fields: space,title,type,text,label,creator,created,lastmodified,ancestor,parent. Operators: = != ~ !~ > >= < <= IN. Keywords: AND OR NOT ORDER BY",
          ),
        limit: z
          .number()
          .default(25)
          .optional()
          .describe("Max results per page"),
        start: z.number().default(0).optional().describe("Pagination offset"),
      }),
    },
    searchPages,
  );
};

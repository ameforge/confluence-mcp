import {z} from "zod";
import {confluenceRequest} from "../../confluence-client.js";
import {defineTool} from "../../define-tool.js";
import {bodyParamsSchema, expandForBody, formatPage} from "../../page-body.js";
import {getPageByTitle} from "./get-page-by-title.js";

/** Turn a page ID or a Confluence page URL into {page_id} or {space_key, title}. */
export const parsePageRef = (ref) => {
  if (/^\d+$/.test(ref)) return {page_id: ref};
  let url;
  try {
    url = new URL(ref);
  } catch {
    throw new Error(`Not a page ID or URL: ${ref}`);
  }
  const id =
    url.searchParams.get("pageId") ?? url.pathname.match(/\/pages\/(\d+)/)?.[1];
  if (id) return {page_id: id};
  const display = url.pathname.match(/\/display\/([^/]+)\/([^/]+)/);
  if (display) {
    // In /display/ links "+" encodes a space and a literal "+" is %2B.
    const decode = (s) => decodeURIComponent(s.replace(/\+/g, " "));
    return {space_key: decode(display[1]), title: decode(display[2])};
  }
  throw new Error(
    `Unsupported Confluence URL (use a pageId or /display/SPACE/Title link): ${ref}`,
  );
};

export const getPage = async ({page_id, ...opts}) => {
  const {page_id: id, space_key, title} = parsePageRef(page_id.trim());
  if (!id) return getPageByTitle({space_key, title, ...opts});
  const expand = [
    ...expandForBody(opts.body_format),
    "version",
    "space",
    "ancestors",
  ].join(",");
  const page = await confluenceRequest(
    "GET",
    `/content/${id}?expand=${expand}`,
  );
  return formatPage(page, opts);
};

export const registerGetPage = (server) => {
  defineTool(
    server,
    "get_page",
    {
      description:
        "Get full details of a Confluence page by its numeric content ID or by a pasted page URL (viewpage.action?pageId=..., /spaces/KEY/pages/ID/..., or /display/SPACE/Title)",
      inputSchema: z.object({
        page_id: z
          .string()
          .describe(
            "Confluence page/content ID, e.g. 123456, or a full page URL",
          ),
        ...bodyParamsSchema,
      }),
    },
    getPage,
  );
};

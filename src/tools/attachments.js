import {writeFile} from "node:fs/promises";
import {z} from "zod";
import {confluenceDownload, confluenceRequest} from "../confluence-client.js";
import {defineTool} from "../define-tool.js";

// shortcut: one page of up to 200 attachments, add start/limit paging if a page ever holds more.
const fetchAttachments = (page_id, filename) =>
  confluenceRequest(
    "GET",
    `/content/${page_id}/child/attachment?limit=200&expand=version${
      filename ? `&filename=${encodeURIComponent(filename)}` : ""
    }`,
  );

export const listAttachments = async ({page_id}) => {
  const {results} = await fetchAttachments(page_id);
  return results.map(({_links, extensions, id, title, version}) => ({
    download: _links?.download,
    fileSize: extensions?.fileSize,
    id,
    mediaType: extensions?.mediaType,
    title,
    version: version?.number,
  }));
};

export const downloadAttachment = async ({dest_path, filename, page_id}) => {
  const {
    results: [att],
  } = await fetchAttachments(page_id, filename);
  if (!att) throw new Error(`No attachment "${filename}" on page ${page_id}`);
  const data = await confluenceDownload(att._links.download);
  // "wx" fails with EEXIST instead of silently replacing a local file.
  await writeFile(dest_path, data, {flag: "wx"});
  return {bytes: data.length, dest_path, id: att.id, title: att.title};
};

export const registerAttachments = (server) => {
  defineTool(
    server,
    "list_attachments",
    {
      description:
        "List the attachments of a Confluence page (name, size, media type, version, download link)",
      inputSchema: z.object({
        page_id: z.string().describe("Confluence page/content ID"),
      }),
    },
    listAttachments,
  );
  defineTool(
    server,
    "download_attachment",
    {
      description:
        "Download a page attachment (latest version) to a local file. Fails if dest_path already exists",
      inputSchema: z.object({
        dest_path: z
          .string()
          .describe("Absolute local path to save to; must not already exist"),
        filename: z.string().describe("Exact attachment file name on the page"),
        page_id: z.string().describe("Confluence page/content ID"),
      }),
    },
    downloadAttachment,
  );
};

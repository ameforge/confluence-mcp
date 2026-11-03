import {readFile} from "node:fs/promises";
import {basename} from "node:path";
import {z} from "zod";
import {confluenceRequest} from "../confluence-client.js";
import {defineTool} from "../define-tool.js";

export const uploadAttachment = async ({
  comment,
  file_name,
  file_path,
  overwrite = false,
  page_id,
}) => {
  const name = file_name ?? basename(file_path);
  const form = new FormData();
  form.append("file", new Blob([await readFile(file_path)]), name);
  if (comment) form.append("comment", comment);
  const base = `/content/${page_id}/child/attachment`;
  let path = base;
  if (overwrite) {
    const {
      results: [existing],
    } = await confluenceRequest(
      "GET",
      `${base}?filename=${encodeURIComponent(name)}`,
    );
    // Posting to /data adds a new version of the existing attachment.
    if (existing) path = `${base}/${existing.id}/data`;
  }
  const res = await confluenceRequest("POST", path, form);
  return (res.results ?? [res]).map(({_links, id, title}) => ({
    download: _links?.download,
    id,
    title,
  }));
};

export const registerUploadAttachment = (server) => {
  defineTool(
    server,
    "upload_attachment",
    {
      description:
        'Attach a local file to a Confluence page. If an attachment with the same name exists, fails unless overwrite=true, which uploads it as a new version. Reference it in the body with <ac:image><ri:attachment ri:filename="..."/></ac:image> or an ac:link',
      inputSchema: z.object({
        comment: z.string().optional().describe("Optional attachment comment"),
        file_name: z
          .string()
          .optional()
          .describe(
            "Name to store the file under; defaults to the file's basename",
          ),
        file_path: z
          .string()
          .describe("Absolute path of the local file to upload"),
        overwrite: z
          .boolean()
          .optional()
          .describe(
            "Replace a same-name attachment with a new version (default false: fail instead)",
          ),
        page_id: z.string().describe("Confluence page/content ID to attach to"),
      }),
    },
    uploadAttachment,
  );
};

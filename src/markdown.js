import MarkdownIt from "markdown-it";
import {z} from "zod";

// Confluence storage is strict XHTML: xhtmlOut self-closes void tags, html: false escapes raw tags.
const md = new MarkdownIt({html: false, linkify: true, xhtmlOut: true});

export const toStorage = (markdown) => md.render(markdown);

export const writeBodyParamsSchema = {
  body_format: z
    .enum(["storage", "markdown"])
    .optional()
    .describe(
      "Format of the provided body: 'storage' (default, raw Confluence storage XHTML) or 'markdown' (Markdown, converted to storage server-side). Use 'storage' for Confluence macros (code, panel, expand, TOC) which Markdown cannot express.",
    ),
};

export const resolveBody = (body, bodyFormat) =>
  bodyFormat === "markdown" && body != null ? toStorage(body) : body;

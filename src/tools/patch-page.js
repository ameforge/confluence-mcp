import {z} from "zod";
import {readForEdit, writePage} from "../confluence-client.js";
import {defineTool} from "../define-tool.js";

/** Apply edits in order; throws before anything is written if any edit doesn't match exactly once. */
export const applyEdits = (body, edits) =>
  edits.reduce((acc, {new_string, old_string}, i) => {
    const where = edits.length > 1 ? `edits[${i}]: ` : "";
    const matches = acc.split(old_string).length - 1;
    if (matches === 0) {
      throw new Error(`${where}old_string not found in page body`);
    }
    if (matches > 1) {
      throw new Error(
        `${where}old_string matches ${matches} times; add more context to make it unique`,
      );
    }
    return acc.replace(old_string, () => new_string);
  }, body);

export const patchPage = async ({edits, new_string, old_string, page_id}) => {
  const single = old_string !== undefined || new_string !== undefined;
  if (edits ? single : old_string === undefined || new_string === undefined) {
    throw new Error("Pass either old_string + new_string, or edits");
  }
  const current = await readForEdit(page_id);
  const value = applyEdits(
    current.body.storage.value,
    edits ?? [{new_string, old_string}],
  );
  return writePage(page_id, {current, title: current.title, value});
};

const editSchema = {
  new_string: z.string().describe("Replacement text"),
  old_string: z
    .string()
    .describe(
      "Exact text to find in the current storage-format body; must be unique",
    ),
};

export const registerPatchPage = (server) => {
  defineTool(
    server,
    "patch_page",
    {
      description:
        "Replace exact substrings in a Confluence page's storage-format body without resending the full body. Pass one old_string/new_string pair, or several in edits to change many spots in one version (applied in order; if any edit fails to match exactly once, nothing is written). Use for targeted edits to large pages where update_page's full-body replace is impractical.",
      inputSchema: z.object({
        edits: z
          .array(z.object(editSchema))
          .min(1)
          .optional()
          .describe(
            "Several replacements applied in order as one page version; use instead of old_string/new_string",
          ),
        new_string: editSchema.new_string.optional(),
        old_string: editSchema.old_string.optional(),
        page_id: z.string().describe("Confluence page/content ID to update"),
      }),
    },
    patchPage,
  );
};

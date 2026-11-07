import assert from "node:assert/strict";
import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {uploadAttachment} from "../src/tools/attachment/upload-attachment.js";
import {movePage} from "../src/tools/page/move-page.js";
import {updatePage} from "../src/tools/page/update-page.js";

// Records each request and answers from `reply(method, path)`.
const stubFetch = (reply) => {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(url, "http://x").pathname.replace(
      /^.*\/rest\/api/,
      "",
    );
    sent.push({body: init.body, method: init.method, path});
    return {
      json: async () => reply(init.method, path),
      ok: true,
      status: 200,
    };
  };
  return sent;
};

test("update_page without body keeps the current body and bumps the version", async () => {
  const sent = stubFetch(() => ({
    body: {storage: {value: "<p>kept</p>"}},
    space: {key: "ENG"},
    title: "Old",
    version: {number: 3},
  }));

  await updatePage({page_id: "42", title: "New"});

  const put = sent.find((r) => r.method === "PUT");
  const body = JSON.parse(put.body);
  assert.equal(body.body.storage.value, "<p>kept</p>");
  assert.equal(body.version.number, 4);
  assert.equal(body.title, "New");
});

test("upload_attachment never replaces a same-name attachment by default", async () => {
  const dir = await mkdtemp(join(tmpdir(), "conf-mcp-"));
  const file = join(dir, "a.png");
  await writeFile(file, "x");
  const sent = stubFetch((method) =>
    method === "GET" ? {results: [{id: "att9"}]} : {results: [{id: "att1"}]},
  );

  await uploadAttachment({file_path: file, page_id: "42"});

  const post = sent.find((r) => r.method === "POST");
  assert.equal(post.path, "/content/42/child/attachment");
});

test("upload_attachment with overwrite=true posts a new version of the same-name attachment", async () => {
  const dir = await mkdtemp(join(tmpdir(), "conf-mcp-"));
  const file = join(dir, "a.png");
  await writeFile(file, "x");
  const sent = stubFetch((method) =>
    method === "GET" ? {results: [{id: "att9"}]} : {id: "att9"},
  );

  await uploadAttachment({file_path: file, overwrite: true, page_id: "42"});

  const post = sent.find((r) => r.method === "POST");
  assert.equal(post.path, "/content/42/child/attachment/att9/data");
});

test("move_page keeps the body and takes the space of the new parent", async () => {
  const sent = stubFetch((_method, path) =>
    path === "/content/7"
      ? {space: {key: "OTHER"}, title: "P"}
      : {
          body: {storage: {value: "<p>kept</p>"}},
          space: {key: "ENG"},
          title: "T",
          version: {number: 3},
        },
  );

  await movePage({page_id: "42", parent_id: "7"});

  const body = JSON.parse(sent.find((r) => r.method === "PUT").body);
  assert.equal(body.body.storage.value, "<p>kept</p>");
  assert.equal(body.space.key, "OTHER");
  assert.deepEqual(body.ancestors, [{id: "7"}]);
  assert.equal(body.version.number, 4);
});

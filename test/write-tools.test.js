import assert from "node:assert/strict";
import {mkdtemp, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {uploadAttachment} from "../src/tools/attachment/upload-attachment.js";
import {registerDeletePage} from "../src/tools/page/delete-page.js";
import {movePage, registerMovePage} from "../src/tools/page/move-page.js";
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

const tools = (register) => {
  const map = new Map();
  register({registerTool: (name, _config, handler) => map.set(name, handler)});
  return map;
};

test("delete_pages trashes every page and reports the one that failed", async () => {
  const sent = [];
  globalThis.fetch = async (url, init) => {
    sent.push(`${init.method} ${new URL(url, "http://x").pathname}`);
    if (String(url).endsWith("/2")) {
      return {ok: false, status: 404, text: async () => "gone"};
    }
    return {json: async () => ({}), ok: true, status: 204};
  };

  const result = await tools(registerDeletePage).get("delete_pages")({
    page_ids: ["1", "2", "3"],
  });

  assert.equal(sent.length, 3);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /1 of 3 failed/);
  assert.match(result.content[0].text, /^.*Page 1 moved to trash/m);
  assert.match(result.content[0].text, /Page 3 moved to trash/);
});

test("move_pages moves every page under the same parent", async () => {
  const sent = stubFetch((_method, path) =>
    path === "/content/7"
      ? {space: {key: "OTHER"}, title: "P"}
      : {
          body: {storage: {value: "<p>x</p>"}},
          space: {key: "ENG"},
          title: "T",
          version: {number: 1},
        },
  );

  const result = await tools(registerMovePage).get("move_pages")({
    page_ids: ["41", "42"],
    parent_id: "7",
  });

  const puts = sent.filter((r) => r.method === "PUT").map((r) => r.path);
  assert.deepEqual(puts, ["/content/41", "/content/42"]);
  assert.equal(result.isError, undefined);
});

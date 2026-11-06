import assert from "node:assert/strict";
import {test} from "node:test";
import {parsePageRef} from "../src/tools/page/get-page.js";
import {applyEdits} from "../src/tools/page/patch-page.js";

test("parsePageRef accepts a bare ID and the URL shapes users paste", () => {
  const host = "https://conf.example.com";
  assert.deepEqual(parsePageRef("212786641"), {page_id: "212786641"});
  assert.deepEqual(
    parsePageRef(`${host}/pages/viewpage.action?pageId=212786641`),
    {page_id: "212786641"},
  );
  assert.deepEqual(parsePageRef(`${host}/spaces/KJ/pages/42/Some+Title`), {
    page_id: "42",
  });
  assert.deepEqual(
    parsePageRef(
      `${host}/display/KJMTP2/%5B08-11-2026%5D%5BGEM+Team%5D+Release+Note`,
    ),
    {space_key: "KJMTP2", title: "[08-11-2026][GEM Team] Release Note"},
  );
  assert.deepEqual(parsePageRef(`${host}/display/ENG/C%2B%2B+Guide`), {
    space_key: "ENG",
    title: "C++ Guide",
  });
  assert.throws(() => parsePageRef(`${host}/x/AbCd`), /Unsupported/);
  assert.throws(() => parsePageRef("not a page"), /Not a page ID or URL/);
});

test("applyEdits applies edits in order and treats $ literally", () => {
  const out = applyEdits("<p>a</p><p>b</p>", [
    {new_string: "<p>A</p>", old_string: "<p>a</p>"},
    {new_string: "<p>$&B</p>", old_string: "<p>b</p>"},
  ]);
  assert.equal(out, "<p>A</p><p>$&B</p>");
});

test("applyEdits names the failing edit and rejects ambiguous matches", () => {
  const edits = [
    {new_string: "x", old_string: "a"},
    {new_string: "y", old_string: "missing"},
  ];
  assert.throws(
    () => applyEdits("a b", edits),
    /^Error: edits\[1\]: .*not found/,
  );
  assert.throws(
    () => applyEdits("a a", [{new_string: "x", old_string: "a"}]),
    /matches 2 times/,
  );
});

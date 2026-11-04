import assert from "node:assert/strict";
import {test} from "node:test";
import {defineTool} from "../src/define-tool.js";

const register = (handler) => {
  let handle;
  defineTool(
    {registerTool: (_name, _config, cb) => (handle = cb)},
    "t",
    {},
    handler,
  );
  return handle;
};

test("passes through a string result as-is", async () => {
  const handle = register(async () => "hello");
  assert.deepEqual(await handle({}), {
    content: [{text: "hello", type: "text"}],
  });
});

test("JSON-stringifies a non-string result", async () => {
  const handle = register(async () => ({a: 1}));
  assert.deepEqual(await handle({}), {
    content: [{text: JSON.stringify({a: 1}, null, 2), type: "text"}],
  });
});

test("catches a thrown error into the isError shape and logs it to stderr", async (t) => {
  const log = t.mock.method(console, "error", () => {});
  const handle = register(async () => {
    throw new Error("boom");
  });
  assert.deepEqual(await handle({}), {
    content: [{text: "boom", type: "text"}],
    isError: true,
  });
  assert.equal(log.mock.callCount(), 1);
  assert.match(
    log.mock.calls[0].arguments[0],
    /^\[\d{4}-\d\d-\d\dT[^\]]+\] t failed: boom$/,
  );
});

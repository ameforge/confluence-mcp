import assert from "node:assert/strict";
import {test} from "node:test";

// Set before the module reads them. Empty values also keep dotenv from
// filling them in from a local .env.
process.env.CONFLUENCE_TOKEN = "";
process.env.CONFLUENCE_USERNAME = "";
process.env.CONFLUENCE_PASSWORD = "conf-pass";
process.env.ATLASSIAN_USERNAME = "shared-user";
process.env.ATLASSIAN_PASSWORD = "shared-pass";
const {confluenceRequest} = await import("../src/confluence-client.js");

test("an unset CONFLUENCE_* credential falls back to ATLASSIAN_*, a set one wins", async () => {
  let auth;
  globalThis.fetch = async (_url, init) => {
    auth = init.headers.Authorization;
    return {json: async () => ({}), ok: true, status: 200};
  };
  await confluenceRequest("GET", "/content/1");
  assert.equal(
    auth,
    `Basic ${Buffer.from("shared-user:conf-pass").toString("base64")}`,
  );
});

/**
 * Wire a plain handler (input -> data, throws on failure) into an MCP tool:
 * catches thrown errors into the isError content shape, and formats a
 * returned string as-is or a returned value as pretty JSON.
 * @param {any} server
 * @param {string} name
 * @param {any} config
 * @param {(input: any) => Promise<any>} handler
 */
export const defineTool = (server, name, config, handler) => {
  server.registerTool(name, config, async (input) => {
    try {
      const result = await handler(input);
      const text =
        typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return {content: [{text, type: "text"}]};
    } catch (err) {
      // stderr lands in the MCP client's log (stdout is the protocol channel).
      console.error(
        `[${new Date().toISOString()}] ${name} failed: ${err.message}`,
      );
      return {content: [{text: err.message, type: "text"}], isError: true};
    }
  });
};

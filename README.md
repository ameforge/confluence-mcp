# Confluence mcp

MCP server for Confluence Server/Data Center (REST API). It lets an AI assistant such as Claude Code or Claude Desktop read and write your Confluence.

## Requirements

- A Confluence Server/Data Center account (username + password).
- Node.js 18+.

## Quick start

You can let Claude Code install it for you. Paste this prompt into a Claude Code session and replace the values with your own:

```text
Add the MCP server "conf-mcp" with `claude mcp add`, running `npx -y conf-mcp@latest`, with these environment variables:
CONFLUENCE_HOST=https://conf.company.com
CONFLUENCE_USERNAME=your_username
CONFLUENCE_PASSWORD=your_password
Use the command syntax for my shell, then run `claude mcp list` to check that it connects.
```

The prompt puts your password into the conversation. If you would rather keep it out, run the command below yourself, in a regular terminal rather than a Claude Code session. Either way, restart Claude Code afterwards so it loads the server.

Pick the block for your shell, since each one continues lines differently.

bash / zsh (macOS, Linux, Git Bash or WSL on Windows):

```bash
claude mcp add conf-mcp \
  -e CONFLUENCE_HOST="https://conf.company.com" \
  -e CONFLUENCE_USERNAME="your_username" \
  -e CONFLUENCE_PASSWORD="your_password" \
  -- npx -y conf-mcp@latest
```

PowerShell (Windows):

```powershell
claude mcp add conf-mcp `
  -e CONFLUENCE_HOST="https://conf.company.com" `
  -e CONFLUENCE_USERNAME="your_username" `
  -e CONFLUENCE_PASSWORD="your_password" `
  -- npx -y conf-mcp@latest
```

Command Prompt (cmd.exe): put the whole command on one line, or end each line with `^` instead of `\`.

Or manually add to `.claude/settings.json` (or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "conf-mcp": {
      "command": "npx",
      "args": ["-y", "conf-mcp@latest"],
      "env": {
        "CONFLUENCE_HOST": "https://conf.company.com",
        "CONFLUENCE_USERNAME": "your_username",
        "CONFLUENCE_PASSWORD": "your_password"
      }
    }
  }
}
```

Restart Claude Code/Desktop after editing the config.

To check that it connected, run `/mcp` inside Claude Code, or `claude mcp list` in a terminal.

Official setup guides:

- Claude Code: [Connect Claude Code to tools via MCP](https://code.claude.com/docs/en/mcp) explains `claude mcp add`, the local, project and user scopes, and the shared `.mcp.json` file.
- Claude Desktop: [Connect to local MCP servers](https://modelcontextprotocol.io/docs/develop/connect-local-servers) shows, with screenshots, how to open `claude_desktop_config.json` from Settings, Developer, Edit Config, and where to find the logs when a server does not start.

## Environment variables

| Variable              | Required | Description                                                        |
| --------------------- | -------- | ------------------------------------------------------------------ |
| `ATLASSIAN_MCP_USAGE` | no       | Set to `off` to turn off the local usage log (see Usage log)       |
| `ATLASSIAN_MCP_TOOLS` | no       | Comma-separated tool or package names to expose (default all)      |
| `CONFLUENCE_HOST`     | yes      | Base URL, e.g. `https://conf.company.com`                          |
| `CONFLUENCE_USERNAME` | yes*     | Confluence username; `ATLASSIAN_USERNAME` is read when it is unset |
| `CONFLUENCE_PASSWORD` | yes*     | Confluence password; `ATLASSIAN_PASSWORD` is read when it is unset |
| `CONFLUENCE_TOKEN`    | no       | Personal Access Token; when set, replaces username/password (*)    |

## Tools

| Tool                  | Description                                                                                                                             | Key parameters                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `get_page`            | Get a page by numeric content ID or pasted page URL                                                                                     | `page_id` (ID or URL), `body_format`, `body_start`, `body_limit`, `save_to` (all optional except `page_id`)    |
| `get_page_by_title`   | Get a page by space key + exact title                                                                                                   | `space_key`, `title`, `body_format`, `body_start`, `body_limit`, `save_to` (all optional except the first two) |
| `create_page`         | Create a new page                                                                                                                       | `space_key`, `title`, `body`, `body_format` (optional), `parent_page_id` (optional)                            |
| `update_page`         | Update a page (full replace, auto-increments version)                                                                                   | `page_id`, `title` (optional), `body` (optional), `body_format` (optional), `expected_version` (optional)      |
| `patch_page`          | Replace substrings in a page (storage format only)                                                                                      | `page_id`, plus `old_string` + `new_string` or `edits` (list of pairs)                                         |
| `delete_page`         | Move a page to trash (recoverable, not permanently purged)                                                                              | `page_id`                                                                                                      |
| `delete_pages`        | Move several pages to trash (recoverable); one failure does not stop the rest, and any failure returns an error listing each outcome    | `page_ids`                                                                                                     |
| `move_page`           | Move a page (and its children) under a new parent, any space                                                                            | `page_id`, `parent_id`                                                                                         |
| `move_pages`          | Move several pages under the same new parent; one failure does not stop the rest, and any failure returns an error listing each outcome | `page_ids`, `parent_id`                                                                                        |
| `upload_attachment`   | Attach a local file to a page (overwrite=true: new version)                                                                             | `page_id`, `file_path`, `file_name` (optional), `comment` (optional), `overwrite` (default false)              |
| `list_attachments`    | List a page's attachments (name, size, type, version, link)                                                                             | `page_id`                                                                                                      |
| `download_attachment` | Download an attachment to a local file (never overwrites)                                                                               | `page_id`, `filename`, `dest_path`                                                                             |
| `search_pages`        | Search content using CQL (Confluence Query Language)                                                                                    | `cql`, `limit` (optional), `start` (optional)                                                                  |
| `list_spaces`         | List spaces, or fetch a single space by key                                                                                             | `space_key` (optional), `limit` (optional)                                                                     |
| `add_comment`         | Add a comment to a page                                                                                                                 | `page_id`, `body`                                                                                              |
| `get_comments`        | Get comments on a page, 50 per call                                                                                                     | `page_id`, optional: `start` (default 0)                                                                       |
| `get_user`            | Resolve a user's display name and profile from userKey/username                                                                         | `key` or `username`                                                                                            |
| `usage_report`        | Done, calls and errors from the local usage log, per package and tool; with `format` set to `html`, also writes and opens a board page  | optional: `days` (default 30), `format` (`text` or `html`)                                                     |

### Notes

- Page `body` (create_page/update_page): pass Markdown with `body_format='markdown'` (the server converts it), or raw Confluence storage format (XHTML), which is the default. Confluence macros (code, panel, expand, TOC) need storage format, because Markdown cannot express them. Example storage: `<p>Content</p>`, `<ul><li>Item 1</li></ul>`.
- Comment `body` (add_comment): must be Confluence storage format (XHTML) only.
- `update_page` replaces the whole page. To change only the title, omit `body` to keep the existing content, and the other way round.
- Pass `expected_version` (the `version.number` from `get_page`) to `update_page` so it refuses to write when someone saved the page after you read it; the error says so and nothing is written.
- `patch_page` replaces one exact substring in storage format (XHTML) without resending the full page body, which suits small edits to large pages. `old_string` must match exactly once; the call fails if it matches zero or several times. Pass `edits` to make several replacements as one page version: they apply in order, and if any one fails to match, nothing is written.
- `create_page`, `update_page` and `patch_page` return a short summary (`id`, `title`, `version`, `url`) instead of the full page body.
- `get_page` accepts a pasted URL in place of an ID: `viewpage.action?pageId=...`, `/spaces/KEY/pages/ID/...` or `/display/SPACE/Title`. Tiny links (`/x/...`) are not supported.
- `delete_page` only moves the page to trash; you can restore it from the Confluence UI.
- `search_pages` uses CQL syntax, e.g. `type=page AND space=ENG AND title~"deploy"`. Use `ancestor=<id>` to list every page under a page, or `parent=<id>` for direct children only.
- For large pages, `get_page`/`get_page_by_title` return at most 40000 characters of body by default (to avoid exceeding tool-output token limits). Choose the format with `body_format`: `storage` (default, XHTML) | `view` (rendered HTML) | `none` (metadata only). Page through large bodies with `body_start` + `body_limit`; check the `truncated` flag in the result. Or pass `save_to` with a local file path to write the full body there (fails if the file exists) and get metadata only back.
- All logs go to stderr; stdout is reserved for the MCP protocol.

## Usage log

Every tool call except `usage_report` is logged to a local file with the time, the package, the tool name and whether the call succeeded. Arguments and content are never logged, and nothing is sent anywhere. All the Atlassian packages share this one file.

The file is `$XDG_CONFIG_HOME/atlassian-mcp/usage.jsonl` when `XDG_CONFIG_HOME` is set. Otherwise it is `%APPDATA%\atlassian-mcp\usage.jsonl` on Windows and `~/.config/atlassian-mcp/usage.jsonl` elsewhere. Set `ATLASSIAN_MCP_USAGE=off` to stop logging. A log that cannot be written never fails a tool call.

Call the `usage_report` tool to read the log. Its optional parameters are:

- `days`: how many days back to count (default 30).
- `format`: `text` (default) gives a summary per package and tool. `html` also writes `board.html` next to the log and opens it in the browser. The board has range buttons for 7, 30 and 90 days, for `days` when it is another number, and for all time, totals for done, calls and errors, a done per day chart, a table per tool and a Share card button that shows a card you can download as a PNG or copy.

Done counts the write calls that succeeded. Read tools are those whose names start with `get_`, `list_`, `search_`, `find_`, `download_`, `generate_` or `compare_`. Every other tool counts as a write. Because the file is shared, the report also counts calls made through the other packages.

## Example prompts

- "Find pages in space ENG whose title contains 'deploy'"
- "Create a new page in space ENG titled 'Release notes v2.0' with content ..."
- "Update page 123456, change the title to 'Release notes v2.1'"
- "Add a comment to page 123456: 'Review done'"

## Troubleshooting

- 401/403: recheck `CONFLUENCE_TOKEN` when it is set, otherwise `CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD`, and whether the account can access the space.
- Connection/timeout: verify that `CONFLUENCE_HOST` includes the scheme (`https://`), and whether VPN/internal network is required.
- Error logs: every failed tool call except `usage_report` is written to stderr with a timestamp and the tool name, and the startup line shows the server version. On Windows, Claude Code keeps this in `%LOCALAPPDATA%\claude-cli-nodejs\Cache\<project>\mcp-logs-<server name>\`, where `<server name>` is the name you gave the server in your MCP config (for example `conf-mcp`).
- Reporting a bug: open an issue at <https://github.com/ameforge/atlassian-mcp/issues> with the server version, the tool you called and the matching log lines. Logs can contain page content and internal URLs, so remove anything sensitive before you post. Nothing is sent anywhere automatically.

## Development

```bash
pnpm install
cp .env.example .env   # edit with your credentials
pnpm build             # bundle to dist/index.js via rsbuild
pnpm test
```

Release from the repo root with `pnpm release:conf`; see [docs/RELEASE.md](https://github.com/ameforge/atlassian-mcp/blob/main/docs/RELEASE.md).

## Support

Questions or issues? Email [PNam](mailto:pnamhn16@gmail.com).

If this project helps you, consider buying me a coffee:

<img src="https://raw.githubusercontent.com/ameforge/atlassian-mcp/main/docs/buy-me-a-coffee.jpg" alt="Buy Me A Coffee" width="300">

---

Created by [PNam](mailto:pnamhn16@gmail.com)

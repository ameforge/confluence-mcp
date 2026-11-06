# Confluence mcp

MCP server for Confluence Server/Data Center (REST API). Lets an AI assistant (Claude Code, Claude Desktop, ...) read and write your Confluence directly.

## Requirements

- A Confluence Server/Data Center account (username + password).
- Node.js 18+.

## Quick start

Use Claude Code CLI. Run the command in a regular terminal, not inside a Claude Code session. Pick the block for your shell, since each one continues lines differently.

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

## Environment variables

| Variable              | Required | Description                                                     |
| --------------------- | -------- | --------------------------------------------------------------- |
| `CONFLUENCE_HOST`     | yes      | Base URL, e.g. `https://conf.company.com`                       |
| `CONFLUENCE_USERNAME` | yes*     | Confluence username                                             |
| `CONFLUENCE_PASSWORD` | yes*     | Confluence password                                             |
| `CONFLUENCE_TOKEN`    | no       | Personal Access Token; when set, replaces username/password (*) |

## Tools

| Tool                  | Description                                                     | Key parameters                                                                                                 |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `get_page`            | Get a page by numeric content ID or pasted page URL             | `page_id` (ID or URL), `body_format`, `body_start`, `body_limit`, `save_to` (all optional except `page_id`)    |
| `get_page_by_title`   | Get a page by space key + exact title                           | `space_key`, `title`, `body_format`, `body_start`, `body_limit`, `save_to` (all optional except the first two) |
| `create_page`         | Create a new page                                               | `space_key`, `title`, `body`, `body_format` (optional), `parent_page_id` (optional)                            |
| `update_page`         | Update a page (full replace, auto-increments version)           | `page_id`, `title` (optional), `body` (optional), `body_format` (optional)                                     |
| `patch_page`          | Replace substrings in a page (storage format only)              | `page_id`, plus `old_string` + `new_string` or `edits` (list of pairs)                                         |
| `delete_page`         | Move a page to trash (recoverable, not permanently purged)      | `page_id`                                                                                                      |
| `move_page`           | Move a page (and its children) under a new parent, any space    | `page_id`, `parent_id`                                                                                         |
| `upload_attachment`   | Attach a local file to a page (overwrite=true: new version)     | `page_id`, `file_path`, `file_name` (optional), `comment` (optional), `overwrite` (default false)              |
| `list_attachments`    | List a page's attachments (name, size, type, version, link)     | `page_id`                                                                                                      |
| `download_attachment` | Download an attachment to a local file (never overwrites)       | `page_id`, `filename`, `dest_path`                                                                             |
| `search_pages`        | Search content using CQL (Confluence Query Language)            | `cql`, `limit` (optional), `start` (optional)                                                                  |
| `list_spaces`         | List spaces, or fetch a single space by key                     | `space_key` (optional), `limit` (optional)                                                                     |
| `add_comment`         | Add a comment to a page                                         | `page_id`, `body`                                                                                              |
| `get_comments`        | Get comments on a page                                          | `page_id`                                                                                                      |
| `get_user`            | Resolve a user's display name and profile from userKey/username | `key` or `username`                                                                                            |

### Notes

- Page `body` (create_page/update_page): pass Markdown with `body_format='markdown'` (auto-converted server-side) or raw Confluence storage format (XHTML) by default. Storage format required for Confluence macros (code, panel, expand, TOC) which Markdown cannot express. Example storage: `<p>Content</p>`, `<ul><li>Item 1</li></ul>`.
- Comment `body` (add_comment): must be Confluence storage format (XHTML) only.
- `update_page` is a full replace — to change only the title, omit `body` to keep the existing content (and vice versa).
- `patch_page` replaces one exact substring in storage format (XHTML) without resending the full page body, useful for targeted edits to large pages where `update_page` is impractical. `old_string` must match exactly once; errors if found 0 or multiple times. Pass `edits` to make several replacements as one page version: they apply in order, and if any one fails to match, nothing is written.
- `create_page`, `update_page` and `patch_page` return a short summary (`id`, `title`, `version`, `url`) instead of the full page body.
- `get_page` accepts a pasted URL in place of an ID: `viewpage.action?pageId=...`, `/spaces/KEY/pages/ID/...` or `/display/SPACE/Title`. Tiny links (`/x/...`) are not supported.
- `delete_page` only moves the page to trash; you can restore it from the Confluence UI.
- `search_pages` uses CQL syntax, e.g. `type=page AND space=ENG AND title~"deploy"`. Use `ancestor=<id>` to list every page under a page, or `parent=<id>` for direct children only.
- For large pages, `get_page`/`get_page_by_title` return at most 40000 characters of body by default (to avoid exceeding tool-output token limits). Control with `body_format`: `storage` (default, XHTML) | `view` (rendered HTML) | `none` (metadata only). Page through large bodies with `body_start` + `body_limit`; check the `truncated` flag in the result. Or pass `save_to` with a local file path to write the full body there (fails if the file exists) and get metadata only back.
- All logs go to stderr; stdout is reserved for the MCP protocol.

## Example prompts

- "Find pages in space ENG whose title contains 'deploy'"
- "Create a new page in space ENG titled 'Release notes v2.0' with content ..."
- "Update page 123456, change the title to 'Release notes v2.1'"
- "Add a comment to page 123456: 'Review done'"

## Troubleshooting

- 401/403: recheck `CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD` and whether the account can access the space.
- Connection/timeout: verify `CONFLUENCE_HOST` format (starts with `https://`, no trailing `/`), and whether VPN/internal network is required.
- Error logs: every failed tool call is written to stderr with a timestamp and the tool name, and the startup line shows the server version. On Windows, Claude Code keeps this in `%LOCALAPPDATA%\claude-cli-nodejs\Cache\<project>\mcp-logs-<server name>\`, where `<server name>` is the name you gave the server in your MCP config (for example `conf-mcp`).
- Reporting a bug: open an issue at <https://github.com/pnam16/gem-conf-mcp/issues> with the server version, the tool you called and the matching log lines. Logs can contain page content and internal URLs, so remove anything sensitive before you post. Nothing is sent anywhere automatically.

## Development

```bash
pnpm install
cp .env.example .env   # edit with your credentials
pnpm build             # bundle to dist/index.js via esbuild
pnpm lint              # biome check + tsc
pnpm release           # release-it: runs lint, test and build, then bumps version, commits, tags, pushes (commit your changes first; npm publish is a separate step)
```

## Support

Questions or issues? Email [PNam](mailto:pnamhn16@gmail.com).

If this project helps you, consider buying me a coffee:

<img src="https://raw.githubusercontent.com/pnam16/gem-conf-mcp/main/docs/buy-me-a-coffee.jpg" alt="Buy Me A Coffee" width="300">

---

Created by [PNam](mailto:pnamhn16@gmail.com)

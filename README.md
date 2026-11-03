# Confluence mcp

MCP server for Confluence. Lets an AI assistant (Claude Code, Claude Desktop, ...) read and write your Confluence directly.

## Requirements

- A Confluence account (username + password).
- Node.js 18+.

## Quick start

Use Claude Code CLI:

```bash
claude mcp add conf-mcp npx -y conf-mcp@latest \
  --env CONFLUENCE_HOST="https://conf.company.com" \
  --env CONFLUENCE_USERNAME="your_username" \
  --env CONFLUENCE_PASSWORD="your_password"
```

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

| Variable              | Required | Description                               |
| --------------------- | -------- | ----------------------------------------- |
| `CONFLUENCE_HOST`     | yes      | Base URL, e.g. `https://conf.company.com` |
| `CONFLUENCE_USERNAME` | yes      | Confluence username                       |
| `CONFLUENCE_PASSWORD` | yes      | Confluence password                       |

## Tools

| Tool                | Description                                                     | Key parameters                                                                                    |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `get_page`          | Get a page by numeric content ID                                | `page_id`, `body_format` (optional), `body_start` (optional), `body_limit` (optional)             |
| `get_page_by_title` | Get a page by space key + exact title                           | `space_key`, `title`, `body_format` (optional), `body_start` (optional), `body_limit` (optional)  |
| `create_page`       | Create a new page                                               | `space_key`, `title`, `body`, `body_format` (optional), `parent_page_id` (optional)               |
| `update_page`       | Update a page (full replace, auto-increments version)           | `page_id`, `title` (optional), `body` (optional), `body_format` (optional)                        |
| `patch_page`        | Replace a substring in a page (storage format only)             | `page_id`, `old_string`, `new_string`                                                             |
| `delete_page`       | Move a page to trash (recoverable, not permanently purged)      | `page_id`                                                                                         |
| `move_page`         | Move a page (and its children) under a new parent, any space    | `page_id`, `parent_id`                                                                            |
| `upload_attachment` | Attach a local file to a page (overwrite=true: new version)     | `page_id`, `file_path`, `file_name` (optional), `comment` (optional), `overwrite` (default false) |
| `search_pages`      | Search content using CQL (Confluence Query Language)            | `cql`, `limit` (optional), `start` (optional)                                                     |
| `list_spaces`       | List spaces, or fetch a single space by key                     | `space_key` (optional), `limit` (optional)                                                        |
| `add_comment`       | Add a comment to a page                                         | `page_id`, `body`                                                                                 |
| `get_comments`      | Get comments on a page                                          | `page_id`                                                                                         |
| `get_user`          | Resolve a user's display name and profile from userKey/username | `key` or `username`                                                                               |

### Notes

- Page `body` (create_page/update_page): pass Markdown with `body_format='markdown'` (auto-converted server-side) or raw Confluence storage format (XHTML) by default. Storage format required for Confluence macros (code, panel, expand, TOC) which Markdown cannot express. Example storage: `<p>Content</p>`, `<ul><li>Item 1</li></ul>`.
- Comment `body` (add_comment): must be Confluence storage format (XHTML) only.
- `update_page` is a full replace — to change only the title, omit `body` to keep the existing content (and vice versa).
- `patch_page` replaces one exact substring in storage format (XHTML) without resending the full page body, useful for targeted edits to large pages where `update_page` is impractical. `old_string` must match exactly once; errors if found 0 or multiple times.
- `delete_page` only moves the page to trash; you can restore it from the Confluence UI.
- `search_pages` uses CQL syntax, e.g. `type=page AND space=ENG AND title~"deploy"`.
- For large pages, `get_page`/`get_page_by_title` return at most 40000 characters of body by default (to avoid exceeding tool-output token limits). Control with `body_format`: `storage` (default, XHTML) | `view` (rendered HTML) | `none` (metadata only). Page through large bodies with `body_start` + `body_limit`; check the `truncated` flag in the result.
- All logs go to stderr; stdout is reserved for the MCP protocol.

## Example prompts

- "Find pages in space ENG whose title contains 'deploy'"
- "Create a new page in space ENG titled 'Release notes v2.0' with content ..."
- "Update page 123456, change the title to 'Release notes v2.1'"
- "Add a comment to page 123456: 'Review done'"

## Troubleshooting

- 401/403: recheck `CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD` and whether the account can access the space.
- Connection/timeout: verify `CONFLUENCE_HOST` format (starts with `https://`, no trailing `/`), and whether VPN/internal network is required.
- No error logs: server logs go to stderr — check the MCP client (Claude Code/Desktop) output, not stdout.

## Alternatives

Run directly from GitHub without npm:

```json
"args": ["-y", "github:pnam16/gem-conf-mcp"]
```

Or point at a local build:

```json
{
  "command": "node",
  "args": ["/path/to/conf-mcp/dist/index.js"],
  "env": {"...": "..."}
}
```

## Development

```bash
pnpm install
cp .env.example .env   # edit with your credentials
pnpm build             # bundle to dist/index.js via esbuild
pnpm lint              # biome check + tsc
pnpm release           # release-it: bumps version, commits, tags, pushes (runs lint + build first, no pre-commit needed)
pnpm archive           # package release/conf-mcp-v<version>.zip
```

## Support

Questions or issues? Email [pnamhn16@gmail.com](mailto:pnamhn16@gmail.com).

If this project helps you, consider buying me a coffee:

<img src="https://raw.githubusercontent.com/pnam16/gem-conf-mcp/main/docs/buy-me-a-coffee.jpg" alt="Buy Me A Coffee" width="300">

---

Created by [PNam](mailto:pnamhn16@gmail.com)

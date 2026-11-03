# Hướng dẫn sử dụng

Confluence mcp là MCP server cho phép AI assistant (Claude Code, Claude Desktop, ...) đọc/ghi trực tiếp lên Confluence của bạn.

## Yêu cầu

- Một tài khoản Confluence Server/Data Center (username + password).
- Node.js 18+.

## Cách 1: Dùng Claude Code CLI (khuyến nghị)

```bash
claude mcp add conf-mcp npx -y conf-mcp@latest \
  --env CONFLUENCE_HOST="https://conf.company.com" \
  --env CONFLUENCE_USERNAME="your_username" \
  --env CONFLUENCE_PASSWORD="your_password"
```

## Cách 2: Cấu hình thủ công

Thêm vào `.claude/settings.json` (hoặc `claude_desktop_config.json`):

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

Khởi động lại Claude Code/Desktop sau khi sửa config.

## Cách 3: Chạy từ GitHub (không cần npm)

```json
{
  "mcpServers": {
    "conf-mcp": {
      "command": "npx",
      "args": ["-y", "github:pnam16/gem-conf-mcp"],
      "env": {"...": "..."}
    }
  }
}
```

## Cách 4: Cài đặt từ file zip release

1. Tải `conf-mcp-v<version>.zip` từ trang release.
2. Giải nén vào một thư mục, ví dụ `C:\tools\conf-mcp`.
3. Copy `.env.example` thành `.env` trong thư mục đó và điền thông tin Confluence (hoặc khai báo env trực tiếp trong config MCP client).
4. Không cần `npm install` — file `index.js` đã tự chứa toàn bộ dependencies.

```json
{
  "mcpServers": {
    "conf-mcp": {
      "command": "node",
      "args": ["/path/to/conf-mcp/index.js"],
      "env": {"...": "..."}
    }
  }
}
```

## Cấu hình biến môi trường

| Biến                  | Bắt buộc | Mô tả                                     |
| --------------------- | -------- | ----------------------------------------- |
| `CONFLUENCE_HOST`     | có       | URL gốc, ví dụ `https://conf.company.com` |
| `CONFLUENCE_USERNAME` | có       | Tên đăng nhập Confluence                  |
| `CONFLUENCE_PASSWORD` | có       | Mật khẩu Confluence                       |

## Danh sách công cụ (tools)

| Tool                | Chức năng                                                          | Tham số chính                                                                                      |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `get_page`          | Lấy chi tiết một trang theo ID                                     | `page_id`, `body_format` (tùy chọn), `body_start` (tùy chọn), `body_limit` (tùy chọn)              |
| `get_page_by_title` | Lấy trang theo space key + tiêu đề chính xác                       | `space_key`, `title`, `body_format` (tùy chọn), `body_start` (tùy chọn), `body_limit` (tùy chọn)   |
| `create_page`       | Tạo trang mới                                                      | `space_key`, `title`, `body`, `body_format` (tùy chọn), `parent_page_id` (tùy chọn)                |
| `update_page`       | Cập nhật trang (thay thế toàn bộ, tự tăng version)                 | `page_id`, `title` (tùy chọn), `body` (tùy chọn), `body_format` (tùy chọn)                         |
| `patch_page`        | Thay thế một chuỗi con trong trang (storage format chỉ)            | `page_id`, `old_string`, `new_string`                                                              |
| `delete_page`       | Chuyển trang vào thùng rác (khôi phục được, không xóa vĩnh viễn)   | `page_id`                                                                                          |
| `move_page`         | Chuyển trang (kèm trang con) sang trang cha mới, kể cả khác space  | `page_id`, `parent_id`                                                                             |
| `upload_attachment` | Đính kèm file local vào trang (overwrite=true: ghi đè version mới) | `page_id`, `file_path`, `file_name` (tùy chọn), `comment` (tùy chọn), `overwrite` (mặc định false) |
| `search_pages`      | Tìm kiếm bằng CQL (Confluence Query Language)                      | `cql`, `limit` (tùy chọn), `start` (tùy chọn)                                                      |
| `list_spaces`       | Liệt kê space, hoặc lấy 1 space theo key                           | `space_key` (tùy chọn), `limit` (tùy chọn)                                                         |
| `add_comment`       | Thêm comment vào trang                                             | `page_id`, `body`                                                                                  |
| `get_comments`      | Lấy danh sách comment của trang                                    | `page_id`                                                                                          |
| `get_user`          | Tra tên hiển thị + hồ sơ user từ userKey hoặc username             | `key` hoặc `username`                                                                              |

### Lưu ý quan trọng

- **Body trang** (create_page/update_page): gửi Markdown với `body_format='markdown'` (tự convert server-side) hoặc raw Confluence storage format (XHTML) theo mặc định. Cần storage format để dùng Confluence macros (code, panel, expand, TOC) mà Markdown không thể biểu hiện. Ví dụ storage: `<p>Nội dung</p>`, `<ul><li>Mục 1</li></ul>`.
- **Body comment** (add_comment): phải là **Confluence storage format (XHTML)** chỉ.
- `update_page` là full replace — nếu chỉ muốn đổi tiêu đề, có thể bỏ qua `body` để giữ nguyên nội dung cũ (và ngược lại).
- `patch_page` thay thế một chuỗi con trong storage format (XHTML) mà không cần gửi lại toàn bộ nội dung trang, hữu ích cho các sửa đổi nhỏ trên các trang lớn khi dùng `update_page` không thực tế. `old_string` phải khớp đúng 1 lần; báo lỗi nếu tìm thấy 0 hoặc >1 lần.
- `delete_page` chỉ chuyển vào trash, có thể khôi phục từ giao diện Confluence.
- `search_pages` dùng cú pháp CQL, ví dụ: `type=page AND space=ENG AND title~"deploy"`.
- Với trang lớn, `get_page`/`get_page_by_title` mặc định chỉ trả tối đa 40000 ký tự body (tránh vượt giới hạn token). Dùng `body_format`: `storage` (mặc định, XHTML) | `view` (HTML đã render) | `none` (chỉ metadata). Đọc từng phần bằng `body_start` + `body_limit`; xem cờ `truncated` trong kết quả để biết còn nội dung.

## Ví dụ prompt cho AI assistant

- "Tìm các trang trong space ENG có tiêu đề chứa 'deploy'"
- "Tạo trang mới trong space ENG tên là 'Release notes v2.0' với nội dung ..."
- "Cập nhật trang 123456, đổi tiêu đề thành 'Release notes v2.1'"
- "Thêm comment vào trang 123456: 'Đã review xong'"

## Xử lý sự cố

- **Lỗi 401/403**: kiểm tra lại `CONFLUENCE_USERNAME`/`CONFLUENCE_PASSWORD`, tài khoản có quyền truy cập space không.
- **Lỗi kết nối/timeout**: kiểm tra `CONFLUENCE_HOST` đúng định dạng (có `https://`, không có dấu `/` cuối), có VPN/mạng nội bộ cần thiết không.
- **Không thấy log lỗi**: log server nằm ở stderr, kiểm tra output của MCP client (Claude Code/Desktop) thay vì stdout.

---

Được tạo bởi [PNam](mailto:pnamhn16@gmail.com)

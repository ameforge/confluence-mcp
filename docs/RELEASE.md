# Hướng dẫn Release

## Yêu cầu

- Node.js 18+
- pnpm
- Đã cài dependencies: `pnpm install`

## Quy trình release

1. Chạy release (thủ công, khi sẵn sàng):

   ```bash
   pnpm release
   ```

   release-it sẽ thực hiện tự động:
   - Lint + build kiểm tra
   - Hỏi phiên bản mới (patch/minor/major)
   - Commit với message "chore: release v${version}"
   - Tạo git tag "v${version}"
   - Push commit và tag lên GitHub
   - Mở trang tạo GitHub release (cần điền thủ công trong browser)

   Không cần commit trước; release-it xử lý git operations. Chỉ cần run khi muốn release.

2. Đóng gói zip release:

   ```bash
   pnpm archive
   ```

   Script này chạy tuần tự:
   - `scripts/build.js` — bundle `src/index.js` bằng esbuild thành file duy nhất `dist/index.js` (kèm shebang `#!/usr/bin/env node`, không cần `node_modules` khi chạy).
   - `scripts/archive.js` — đóng gói `release/conf-mcp-v<version>.zip` gồm:
     - `index.js` (từ `dist/index.js`)
     - `package.json`
     - `README.md`
     - `.env.example`

3. Kiểm tra nhanh sau build:

   ```bash
   node dist/index.js
   ```

   Server phải khởi động và log ra stderr (stdout chỉ dành cho giao thức MCP), không có lỗi.

## Kênh phát hành

Các kênh cài đặt cho người dùng:

### 1. npm (khuyến nghị)

Khi chạy `pnpm release`, release-it tự động publish lên npm (cấu hình `.release-it.json` có `npm.publish: true`).

Người dùng cài qua: `npx conf-mcp@latest` hoặc `npm i -g conf-mcp`.

Lưu ý:
- Field `files` trong `package.json` giới hạn chỉ đóng gói `dist/` (không publish `src/`, `scripts/`, `.env`).
- Script `prepare` tự chạy `npm run build` trước khi publish → `dist/index.js` luôn mới.

### 2. GitHub (git install)

```bash
npx github:pnam16/gem-conf-mcp
```

Khi cài từ git, npm tự chạy script `prepare` (cấu hình `"prepare": "npm run build"`) để build `dist/index.js`. release-it tự động push tag lên GitHub — chỉ cần đảm bảo repo ở chế độ **public**.

### 3. Zip thủ công (release/conf-mcp-v<version>.zip)

Sau khi chạy `pnpm release` xong, chạy `pnpm archive` để đóng gói zip cho người dùng không có npm/git, xem [Hướng dẫn sử dụng](USAGE.md#cài-đặt-từ-file-zip-release).

## Checklist trước `pnpm release`

- [ ] Kiểm tra `.env` không bị commit (đã có trong `.gitignore`)
- [ ] README/docs tools/params phản ánh đúng code hiện tại
- [ ] Local branch updated, tất cả changes đã commit

release-it sẽ tự động:
- [ ] Chạy lint + build
- [ ] Bump version trong package.json
- [ ] Commit, tag, push
- [ ] Publish npm
- [ ] Mở browser để tạo GitHub release (copy changelog + submit form)

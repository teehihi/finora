# Làm việc với Finora

- Dùng Node 22 và pnpm theo `package.json`. Chạy script khởi tạo bằng `pnpm run setup`.
- Giữ ứng dụng hoạt động local với PostgreSQL 17 trong Compose, Expo và NestJS trên host. Giữ nguyên volume của người dùng khi kiểm thử.
- Tất cả đường đọc và ghi dữ liệu tài chính đi qua guard, gắn với user ID lấy từ phiên Better Auth. Chỉ expose `EXPO_PUBLIC_*` cần thiết cho client.
- Pin phiên bản native theo `expo/bundledNativeModules.json`; chạy `pnpm --filter @finora/app exec expo install --check` khi thay đổi.
- Đặt contract runtime ở `packages/contracts`, tính toán ở `packages/financial-engine`, dịch UI ở `packages/i18n`. Khi thay đổi công thức, thêm ca biên và giữ snapshot cũ có thể mở được.
- Dùng migration SQL đã commit và seed idempotent. Database reset là thao tác tương tác riêng.
- Dùng PNG gốc theo đúng tỷ lệ. Kiểm tra dòng tiếng Việt, dark mode, focus và vùng bấm native khi sửa UI.
- Trước khi push, chạy lint, typecheck, test, build và E2E phù hợp. Ghi rõ nền tảng nào đã chạy thực tế.

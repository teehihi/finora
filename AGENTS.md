# Làm việc với Finora

- Dùng Node 22 và pnpm theo `package.json`. Chạy script khởi tạo bằng `pnpm run setup`.
- Giữ ứng dụng hoạt động local với PostgreSQL 17 trong Compose, Expo và NestJS trên host. Giữ nguyên volume của người dùng khi kiểm thử.
- Tất cả đường đọc và ghi dữ liệu tài chính đi qua guard, gắn với user ID lấy từ phiên Better Auth. Chỉ expose `EXPO_PUBLIC_*` cần thiết cho client.
- Pin phiên bản native theo `expo/bundledNativeModules.json`; chạy `pnpm --filter @finora/app exec expo install --check` khi thay đổi.
- Đặt contract runtime ở `packages/contracts`, tính toán ở `packages/financial-engine`, dịch UI ở `packages/i18n`. Khi thay đổi công thức, thêm ca biên và giữ snapshot cũ có thể mở được.
- Dùng migration SQL đã commit và seed idempotent. Database reset là thao tác tương tác riêng.
- Dùng PNG gốc theo đúng tỷ lệ. Kiểm tra dòng tiếng Việt, dark mode, focus và vùng bấm native khi sửa UI.
- Trước khi push, chạy lint, typecheck, test, build và E2E phù hợp. Ghi rõ nền tảng nào đã chạy thực tế.

- Dùng nhánh riêng và quy trình trong [CONTRIBUTING.md](CONTRIBUTING.md). Không push hay merge vào `main`, không đổi giấy phép hoặc cấu hình GitHub có tác động quyền truy cập nếu chưa có quyết định của maintainer.
- Không chạy kiểm thử với tài khoản, OTP, hợp đồng vay hoặc database production. Dùng fixture tổng hợp, che thông tin nhạy cảm trong ảnh và log.
- Giữ trợ lý local là mặc định; gửi nội dung sang AI bên ngoài chỉ khi người dùng đồng ý cho yêu cầu đó. Không đưa hồ sơ lưu, lịch sử hoặc tài liệu tải lên vào payload.
- Nếu sửa UI, dùng thiết bị/nền tảng phù hợp để kiểm tra safe area, font tiếng Việt và fallback; ghi rõ phần chỉ được thử bằng web hoặc bundle.

## Quy trình thay đổi UX/UI

- Đọc [quy trình thiết kế](docs/design-system/DESIGN_GOVERNANCE.md), tài liệu sản phẩm và hành trình hiện có trước khi sửa UI. Xác định tác vụ và kiến trúc thông tin trước bố cục.
- Với thay đổi UX đáng kể, tạo wireframe và thử luồng; với UI lớn, phải có high-fidelity renderable và review nội bộ trước khi sửa production.
- Mở rộng token và component hiện có; giữ thương hiệu và điều hướng đã duyệt. Không tạo hệ riêng hay thay phong cách độc lập cho từng màn.
- Sau khi implement phải nhìn ảnh app thật, đối chiếu với thiết kế, thử lại luồng chính và lỗi/khôi phục. Ghi lại quyết định, thiết bị đã chạy và phần còn chờ owner UAT. Test xanh không thay cho visual QA hoặc UAT.

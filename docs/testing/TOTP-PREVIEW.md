# FINORA · Bản thử xác thực hai bước

Giữ bước đầu đã có: nhập mật khẩu, xác minh mã email hoặc đăng nhập qua nhà
cung cấp liên kết. Khi tài khoản bật 2FA, tất cả đều vào bước mã từ ứng dụng
xác thực, hoặc mã khôi phục một lần. Chưa có phiên đăng nhập cho đến khi mã
hợp lệ. Sau đó người dùng quay về đích đã chọn. Tài khoản chưa bật giữ nguyên
các luồng hiện có.

Bật tại **Hồ sơ → Hồ sơ cá nhân → Bảo mật**, với email đã xác minh. Tài khoản
có mật khẩu phải nhập mật khẩu lại; tài khoản không có mật khẩu phải dùng
phiên đăng nhập mới (tối đa 10 phút) để đổi tùy chọn này. Quét QR hoặc nhập
khóa thiết lập, lưu mã khôi phục, rồi xác nhận mã đầu tiên. Mã QR được vẽ tại
chỗ. Better Auth lưu bí mật và mã khôi phục đã mã hóa. Không đưa khóa hay
mã khôi phục vào ảnh, log hoặc analytics.

Khi bật, những phiên khác bị thu hồi. Không có tùy chọn nhớ thiết bị. Với
OAuth, callback giữ chuyển hướng và chỉ chuyển cookie thử thách còn hiệu
lực, không chuyển cookie phiên đã xác thực. Apple vẫn theo cấu hình và điều
kiện phát hành hiện có; nhánh này không tự bật nút Apple.

## Kiểm tra local

Dùng PostgreSQL và Mailpit. Chạy `pnpm install --frozen-lockfile`,
`pnpm db:generate`, `pnpm db:migrate`, `pnpm build`, rồi
`pnpm test:e2e tests/e2e/two-factor.spec.ts`. Kiểm tra callback Google và Apple
với dữ liệu tổng hợp bằng `pnpm --filter @finora/api test:auth:totp`. Các ca
OAuth này dùng cùng bộ xử lý callback, cookie và phiên của app; chúng không
gọi dịch vụ bên ngoài. Không dùng tài khoản hoặc database production. Thử trên
thiết bị và với cấu hình OAuth thật trước khi phát hành.

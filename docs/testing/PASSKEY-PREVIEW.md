# FINORA · Passkey đăng nhập

Trên thiết bị có passkey đã tạo, bấm **Đăng nhập bằng passkey**. Hệ điều hành
xác minh bằng Face ID, Touch ID, mã khóa máy hoặc cơ chế tương ứng, rồi ký yêu
cầu của FINORA. Chỉ sau khi server xác minh chữ ký và bằng chứng xác minh
người dùng mới có phiên đăng nhập. Không hỏi thêm email, mật khẩu hay TOTP.
FINORA không đọc, lưu hoặc truyền dữ liệu sinh trắc.

Tạo tại **Hồ sơ → Hồ sơ cá nhân → Bảo mật → Tạo passkey** sau khi đăng nhập
gần đây (tối đa 10 phút), với email đã xác minh. Người dùng có thể gỡ riêng
từng passkey. Không đổi luồng mật khẩu, OTP email hoặc OAuth. Bất cứ phương
thức cũ nào đăng nhập vào tài khoản đã bật TOTP đều vẫn qua TOTP.

## Web local

Chạy `pnpm install --frozen-lockfile`, `pnpm db:generate`, `pnpm db:migrate`.
Trong `apps/api/.env` cấu hình `PASSKEY_RP_ID=localhost` và
`PASSKEY_ORIGINS=http://localhost:8081`. Dùng đúng `http://localhost:8081`
cho Expo Web, không dùng địa chỉ IP LAN. Chạy local với PostgreSQL và
Mailpit, không dùng tài khoản thật. CI hoặc local có thể chạy
`pnpm test:e2e tests/e2e/passkey.spec.ts` với RP đã bật và Chromium.
Bài kiểm tra dùng thiết bị xác thực ảo, không giả làm test Face ID.

## iOS

1. Chọn hostname HTTPS do FINORA kiểm soát, ví dụ `auth.finora.example`.
   Đặt `PASSKEY_RP_ID` và `EXPO_PUBLIC_PASSKEY_RP_ID` cùng hostname, và
   đưa `https://<hostname>` vào `PASSKEY_ORIGINS`. Thêm origin web cụ thể
   nếu là subdomain được phép của RP. API phải có HTTPS; web client vẫn phải
   nằm trong `WEB_ORIGINS` để gọi API.
2. Bật Associated Domains cho App ID `dev.finora.app` trên Apple Developer.
   Đặt `PASSKEY_APPLE_APP_ID` theo application-identifier thực của app
   đã ký, dạng `TEAM_OR_APP_ID_PREFIX.dev.finora.app`.
3. RP hostname phải trả JSON `webcredentials.apps` chứa App ID tại
   `/.well-known/apple-app-site-association` qua HTTPS, không chuyển hướng.
   API đã cung cấp route nếu được cấu hình; nếu API ở host khác thì phục vụ
   JSON tương đương trên RP hostname.
4. Rebuild development hoặc release build (không dùng Expo Go) để có native
   module và entitlement `webcredentials:<hostname>`. Thử tạo và đăng
   nhập passkey trên iPhone có iCloud Keychain; thử hủy, đổi tài khoản, xóa
   credential và đường lui. Không tuyên bố Face ID đã chạy khi chỉ mới export
   JS hoặc chạy thiết bị xác thực ảo.

Khi thiếu cấu hình, cách đăng nhập cũ vẫn hiện như trước. Passkey iOS không
đồng nghĩa với “Đăng nhập bằng Apple”.

## Khi ghép giao diện đăng nhập

Nhánh riêng `codex/auth-ui-polish` phụ trách bố cục login. Khi tích hợp, giữ
bố cục và màn nhập OTP của nhánh UI. Chỉ ghép nút passkey ở bước đầu, trạng thái
xác thực TOTP sau khi đăng nhập bằng phương thức khác, và xử lý về đích đã
yêu cầu. Không thay nguyên file giao diện từ một nhánh sang nhánh kia.

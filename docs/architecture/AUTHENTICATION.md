# Xác thực Finora 2.0

Finora dùng Better Auth 1.6.35 trên NestJS, adapter Prisma và PostgreSQL. Phiên
web tiếp tục dùng cookie HTTP-only; Expo dùng plugin Better Auth Expo và
SecureStore. Guard của API vẫn lấy ID từ phiên, không từ nội dung request.
Không có migration mới, không sửa ID hoặc dữ liệu tài chính và không reset
volume. Đây là cấu hình phát triển cục bộ, không phải hướng dẫn triển khai
production.

## Email OTP qua Mailpit

1. Chạy `pnpm install --frozen-lockfile`, `pnpm run setup`, rồi `pnpm dev` như
   bình thường. Compose khởi động PostgreSQL 17 và Mailpit, đều bind loopback.
2. Mở Finora ở [localhost:8081](http://localhost:8081), nhập một email thử nghiệm như
   `finora-demo@example.test` rồi chọn tiếp tục bằng email.
3. Mở [Mailpit](http://127.0.0.1:8025), tìm email Finora và nhập mã 6 chữ số
   từ nội dung thư. Mailpit giữ email cục bộ; không gửi vào hộp thư thật.
4. Tài khoản mới được tạo sau khi xác minh mã. Email đã có dùng lại ID tài
   khoản và giữ dữ liệu. Cả hai dùng chung màn hình đăng nhập.
5. Đổi cổng Mailpit bằng `MAILPIT_SMTP_PORT` / `MAILPIT_UI_PORT` trong
   `.env` ở thư mục gốc. Nếu đã có `apps/api/.env`, tự đồng bộ biến
   `SMTP_PORT` với cổng SMTP của Compose; script setup không ghi đè file
   môi trường đã tồn tại.

Mã chỉ dùng một lần, hết hạn 5 phút, có tối đa 5 lượt thử. Better Auth 1.6.35
mã hóa OTP ở lớp verification và tiêu thụ mã nguyên tử khi thành công. Gửi lại
tạo mã mới sau 30 giây. API giới hạn theo IP và theo email đã chuẩn hóa; giới
hạn theo email hiện nằm trong tiến trình NestJS cục bộ, không dùng như bảo đảm
đa replica. Giá trị OTP không xuất hiện trong API hay log. Lỗi vận chuyển có
một thông điệp chung. Yêu cầu mã đăng nhập cho email cũ và mới có cùng phản hồi.
Các endpoint đổi email và khôi phục mật khẩu qua OTP chưa bật.

### Tài khoản mật khẩu đang có

- Người dùng đã có mật khẩu vẫn có thể chọn đăng nhập bằng mật khẩu.
- Nếu email chưa được xác minh, đăng nhập bằng mật khẩu và mở **Hồ sơ → Bảo mật**
  để xác minh email bằng OTP khi đang có phiên. Mã xác minh này chỉ dùng được
  bởi phiên của chính email đó; mật khẩu và dữ liệu được giữ nguyên.
- Nếu chọn đăng nhập bằng OTP trực tiếp cho một tài khoản cũ chưa xác minh,
  Better Auth coi đây là lần đầu chứng minh quyền kiểm soát email. Để tránh tài
  khoản bị chiếm sẵn, phiên và mật khẩu chưa được chứng minh sẽ bị thu hồi.
  ID người dùng và dữ liệu tài chính không đổi. Tài khoản đã xác minh không bị
  thu hồi mật khẩu khi đăng nhập bằng OTP.
- Xác thực lại bằng OTP vào tài khoản cũ có email lỗi đánh máy không tự nối
  sang tài khoản có email khác. Tình huống đó cần có email đúng và quy trình
  đổi email đã xác minh trong tương lai.

Email HTML và plain text dùng cùng nội dung. SMTP cục bộ mặc định không xác
thực và chỉ cho loopback. Cấu hình SMTP tùy chỉnh có thể dùng
`SMTP_MODE=starttls` (bắt buộc nâng cấp TLS) hoặc `SMTP_MODE=tls`, với cặp
`SMTP_USER`/`SMTP_PASSWORD` nếu cần. `EmailProvider` là ranh giới để thêm
Resend trong tương lai; không cần tài khoản dịch vụ mail để chạy hiện tại.

## Google OAuth (tùy chọn)

- Trong Google Cloud console: chọn project của bạn → Google Auth Platform →
  cấu hình Branding/Audience và thêm test users nếu app đang ở Testing. Vào
  **Clients → Create client → Web application**.
- Thêm **Authorized redirect URI** đúng bằng
  `http://localhost:3000/api/auth/callback/google` cho môi trường local mặc
  định. Với URL dev HTTPS khác đã được bạn cấu hình, dùng chính xác
  `<BETTER_AUTH_URL>/api/auth/callback/google`. Đừng đăng ký wildcard, route
  của Expo hay `finora://` làm callback Google; Google callback vào API, rồi
  Better Auth mới chuyển về Expo. Một địa chỉ LAN HTTP riêng không thay cho
  callback HTTPS được Google cho phép; dùng loopback cho web hoặc môi trường
  dev HTTPS đã được tổ chức cho phép khi kiểm tra trên điện thoại.
- Đặt cặp `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` trong
  `apps/api/.env`, rồi khởi động lại API. Không đặt secret vào bất kỳ
  `EXPO_PUBLIC_*` nào. Nếu cặp thông tin trống, web và native đều không hiện
  nút Google. Kiểm tra `GET /api/auth/providers` để thấy tín hiệu khả dụng,
  không có thông tin bí mật.
- Web dùng callback quay về chính origin ứng dụng có trong `WEB_ORIGINS`.
  Native yêu cầu development build có scheme `finora://`; plugin Expo mở
  trình duyệt hệ thống và chuyển phiên về SecureStore. Không dùng WebView.
  Dùng `EXPO_PUBLIC_API_URL` phù hợp trên iOS Simulator, Android Emulator và
  thiết bị thật; xem bảng mạng ở README. Không tắt kiểm tra OAuth state, PKCE,
  callback hoặc trusted origins.
- Google chọn từ màn hình đăng nhập có thể tạo tài khoản mới bằng địa chỉ
  Google đã xác minh. Finora **không tự nối** tài khoản chỉ vì email khớp.
  Với người dùng đã có tài khoản, đăng nhập bằng phương thức cũ, xác minh
  email nếu cần, rồi chủ động liên kết Google trong **Hồ sơ → Bảo mật**. Cả
  tài khoản Finora và email do Google cung cấp phải được xác minh và trùng
  nhau; mỗi ID tài khoản OAuth chỉ gắn với một người dùng. OAuth token hỗ trợ
  mã hóa bởi Better Auth. Không có Google credentials trong môi trường kiểm
  thử. Kiểm tra cục bộ với cấu hình giả lập xác nhận tạo URL, PKCE và callback
  hủy; không đổi token hoặc đăng nhập Google thật trên web/native.

## Apple Sign In (chuẩn bị phía server, không hiện nút chưa hoàn chỉnh)

- Better Auth đã có chỗ cấu hình Apple, chỉ kích hoạt khi đủ
  `APPLE_CLIENT_ID` (Service ID), `APPLE_CLIENT_SECRET` (JWT do tổ chức
  ký từ Key/Team ID) và `APPLE_APP_BUNDLE_IDENTIFIER` trong API, với
  `BETTER_AUTH_URL` HTTPS. Không lưu khóa Apple hoặc JWT vào repo.
- Bản phát hành sẽ cần App ID và capability **Sign In with Apple**, Service
  ID liên kết App ID, đăng ký domain và return URL HTTPS
  `<BETTER_AUTH_URL>/api/auth/callback/apple`. Đối với nút native, bổ sung
  entitlement và development build với cấu hình [Expo AppleAuthentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/);
  xác minh nonce theo luồng Better Auth, thiết kế theo [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple),
  và kiểm thử trên thiết bị. Không cần Apple Developer để chạy local OTP.
- Apple private relay được coi là địa chỉ riêng, không ghép ngầm với địa chỉ
  cá nhân. Nếu muốn hỗ trợ liên kết khác email ở giai đoạn sau, cần một quy
  trình xác minh và rà soát quyền sở hữu riêng; hiện Finora từ chối liên kết
  khác email. Trước phát hành, kiểm tra email sender đã đăng ký Apple Private
  Relay, tài khoản thực, các trường hợp hủy và hướng dẫn App Store hiện hành.

## Kiểm tra

Sau khi chạy build/API và Mailpit trên **cơ sở dữ liệu cục bộ dành riêng cho
kiểm thử**:

```sh
FINORA_AUTH_TEST_DB=disposable pnpm --filter @finora/api test:auth:local
```

Tuỳ chọn `FINORA_MAILPIT_URL` nếu giao diện Mailpit dùng cổng khác. Kịch bản
kiểm tra SMTP thật, hai phần của thư, TTL, mã sai/hết hạn/dùng lại, cooldown,
giới hạn số lần thử, phiên, đăng xuất, quyền dữ liệu, tài khoản hiện có và
Google không cấu hình. Nó chỉ tạo tài khoản tổng hợp `@example.test`, không
reset database, và chỉ chỉnh thời điểm hết hạn của mã do chính lượt kiểm tra
tạo. Các kiểm thử helper không cần Mailpit; thử thành công OAuth với nhà cung
cấp thật và xác minh native vẫn là công việc riêng khi có credentials/thiết bị.

Tham khảo phiên bản tương thích: [Email OTP](https://better-auth.com/docs/plugins/email-otp),
[Expo](https://better-auth.com/docs/integrations/expo),
[Google](https://better-auth.com/docs/authentication/google),
[Apple](https://better-auth.com/docs/authentication/apple),
[liên kết tài khoản](https://better-auth.com/docs/concepts/users-accounts).

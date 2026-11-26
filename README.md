# Finora

**Vay thông minh, trả chủ động.** Finora là sổ tay vay cá nhân dành cho người dùng Việt Nam. Bạn có thể nhập thu nhập và chi phí, thử một khoản vay minh họa, xem từng kỳ trả nợ, lưu kết quả và hỏi trợ lý về chính bản tính đó.

Ứng dụng dùng chung mã Expo cho iOS, Android và web. NestJS, Better Auth, bộ tính Decimal.js và PostgreSQL đều chạy trên máy phát triển. Trợ lý mặc định là mô phỏng cục bộ có nhãn rõ ràng. Bốn sản phẩm được seed là dữ liệu tổng hợp.

## Chạy trên máy

Cần Node.js 22.20 trở lên thuộc dòng 22.x, pnpm 10.32.1 (khai báo trong `packageManager`), Docker Desktop hoặc Docker Engine có Compose v2 hỗ trợ `up --wait`. Với Node có Corepack, có thể gọi `corepack pnpm` thay cho `pnpm`. Docker phải đang chạy. Ở lần đầu, trình quản lý gói và Docker cần Internet để tải dependency và image.

```sh
git clone https://github.com/teehihi/finora.git
cd finora
pnpm install --frozen-lockfile
pnpm run setup
pnpm dev
```

**Dùng đúng `pnpm run setup`.** Cú pháp `pnpm setup` là lệnh tích hợp để cấu hình shell của pnpm. Script của Finora tạo các file môi trường còn thiếu, sinh secret ngẫu nhiên, chờ PostgreSQL healthy, khởi động Mailpit, sinh Prisma Client, áp dụng migration và upsert bốn sản phẩm. Chạy lại giữ dữ liệu và cấu hình hiện có. Nếu tự sao chép file mẫu, đặt `BETTER_AUTH_SECRET` thành secret ngẫu nhiên ít nhất 32 ký tự trước khi chạy API.

Mở [Expo Web](http://localhost:8081), [tình trạng API](http://localhost:3000/health) hoặc [Swagger](http://localhost:3000/docs). Nhập email thử nghiệm (ví dụ `finora-demo@example.test`) rồi mở [Mailpit](http://127.0.0.1:8025) để lấy mã đăng nhập. Mailpit chỉ nhận thư cục bộ. Người dùng đã có mật khẩu vẫn có thể dùng phương thức cũ. [Hướng dẫn OTP, Google và liên kết tài khoản](docs/architecture/AUTHENTICATION.md).

1. Mở **Hồ sơ**, nhập thu nhập, chi phí và tiền trả nợ hằng tháng bằng VND.
2. Trong **Khám phá**, chọn một sản phẩm mẫu và mở **Mô phỏng trả nợ**.
3. Điều chỉnh số tiền, kỳ hạn, lãi suất và ngày đầu tiên. Nhấn **Tính lịch trả nợ** để xem chi tiết.
4. Chọn **Lưu bản mô phỏng**. Bạn có thể đăng nhập lại và mở bản đã lưu trong **Khoản vay**.
5. Chọn **Giải thích cùng Finora AI** để nhận lời giải thích cục bộ từ dữ liệu bản tính.

### Cấu hình mạng

| Thiết bị                           | Máy chủ API                   | Cách chạy                                            |
| ---------------------------------- | ----------------------------- | ---------------------------------------------------- |
| Web trên máy phát triển            | Hostname của trang, cổng 3000 | Mở localhost:8081                                    |
| iOS Simulator                      | http://localhost:3000         | Expo Go SDK 58, mở project trong Metro               |
| Android Emulator                   | http://10.0.2.2:3000          | Expo Go SDK 58, dùng Metro qua 10.0.2.2:8081         |
| Điện thoại thật (Expo Go hoặc web) | http://IP_LAN_CỦA_MÁY:3000    | Cùng Wi-Fi, mở QR của Metro và chuẩn bị LAN bên dưới |

Cấu hình API trong `apps/api/.env`, PostgreSQL trong `.env`, địa chỉ công khai cho Expo trong `apps/app/.env`. Khi đổi cổng hoặc thông tin PostgreSQL, đồng bộ `DATABASE_URL` với Compose. Đổi biến khi volume đã có dữ liệu cũng cần cập nhật role trong database hiện có.

Với điện thoại trong mạng Wi-Fi tin cậy, để API bind `HOST=0.0.0.0`, đặt `BETTER_AUTH_URL=http://IP_LAN_CỦA_MÁY:3000` và thêm chính xác `http://IP_LAN_CỦA_MÁY:8081` vào `WEB_ORIGINS` (phân tách bằng dấu phẩy). Development build tự lấy địa chỉ API từ host Metro; chỉ cần đặt `EXPO_PUBLIC_API_URL` nếu dùng API ở máy chủ khác. Khởi động lại `pnpm dev`, mở development build trên iPhone hoặc Expo Go SDK 58 trên Android và quét QR Metro. `localhost` trên điện thoại trỏ về chính điện thoại. Trên web, dùng cùng hostname cho web và API để trình duyệt gửi cookie same-site. Chỉ mở cổng 3000 và 8081 trên mạng tin cậy. Cổng cơ sở dữ liệu luôn bind vào loopback.

Để cấu hình tự động cho điện thoại thật, kết nối máy tính và điện thoại cùng Wi-Fi rồi chạy `pnpm expo:lan`. Lệnh dò IPv4 LAN của máy tính, cập nhật `EXPO_PUBLIC_API_URL`, `BETTER_AUTH_URL` và thêm origin Expo vào `WEB_ORIGINS`. Khởi động lại `pnpm dev`; nếu đang dùng app native đã build, build và cài lại để cập nhật URL API được nhúng trong app.

Native dùng Expo SecureStore và plugin Expo của Better Auth, web dùng cookie HTTP-only. Thanh điều hướng dùng Liquid Glass của Callstack trên iOS 26 trở lên, Expo Blur trên iOS cũ và Android, bề mặt thường trên web. Android dùng `BlurTargetView`; thiết bị dưới API 31 nhận nền bán trong suốt thay cho blur nặng.

`@callstack/liquid-glass` là native module nên app iOS không chạy được trong Expo Go, kể cả khi iOS cũ dùng Expo Blur. Để build và cài trực tiếp lên iPhone, bật Developer Mode, kết nối iPhone với Mac đã cài Xcode 26 trở lên, rồi chạy `pnpm --filter @finora/app exec expo run:ios --device`. Xcode sẽ yêu cầu chọn iPhone và signing team nếu cần. Sau khi cài app Finora development build, chạy `pnpm dev` và mở server dev từ app đó. Phiên bản iOS dưới 26 vẫn dùng Expo Blur. Bản native standalone sử dụng scheme `finora://`. Trong một development build, iOS có thể yêu cầu quyền mạng cục bộ và Android có thể yêu cầu cấu hình HTTP debug cho host phát triển cụ thể. Bản phân phối dùng HTTPS. [Liquid Glass của Callstack](https://github.com/callstack/liquid-glass) · [Expo development build](https://docs.expo.dev/develop/development-builds/introduction/)

### Lệnh thường dùng

| Lệnh                                                  | Tác dụng                                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm env:init`                                       | Tạo riêng các file môi trường còn thiếu                                                        |
| `pnpm infra:up` / `infra:status` / `infra:logs`       | Chạy, kiểm tra, theo dõi PostgreSQL và Mailpit                                                 |
| `pnpm infra:down`                                     | Dừng container và giữ named volume                                                             |
| `pnpm db:generate` / `db:migrate` / `db:seed`         | Sinh client, áp dụng migration đã commit, upsert dữ liệu mẫu                                   |
| `pnpm db:studio`                                      | Mở Prisma Studio trên máy                                                                      |
| `pnpm db:reset:local`                                 | Xóa dữ liệu của database phát triển trên loopback. Cần terminal tương tác và gõ `RESET FINORA` |
| `pnpm dev:app` / `pnpm dev:api`                       | Chạy từng ứng dụng qua Turbo                                                                   |
| `pnpm format` / `format:check` / `lint` / `typecheck` | Định dạng, kiểm tra mã và kiểu                                                                 |
| `pnpm test`                                           | Chạy Vitest, Jest và React Native Testing Library                                              |
| `pnpm build`                                          | Xuất Expo Web vào `apps/app/dist`, biên dịch API và package dùng chung                         |
| `pnpm test:e2e`                                       | Kiểm thử Playwright với PostgreSQL thật và các tài khoản tổng hợp mới                          |

Để chạy E2E từ bản build, hoàn thành setup và build, chạy `pnpm exec playwright install chromium`, rồi `pnpm test:e2e`. Có thể dùng Chrome sẵn có bằng `FINORA_BROWSER_CHANNEL=chrome pnpm test:e2e`. Khi hai cổng trống, cấu hình Playwright tự khởi động API và máy chủ web tĩnh có hỗ trợ deep link. Khi đang phát triển, bộ test có thể dùng các tiến trình đã chạy trên cùng cổng. E2E ghi tài khoản và fixture tổng hợp vào **database phát triển**. CI dùng volume mới trên runner.

### Mã nguồn và tài liệu

- `apps/app` chứa Expo Router, ứng dụng di động và React Native Web. Mở `/showcase` trong Metro để xem hệ thống thiết kế.
- `apps/api` chứa NestJS, Better Auth, kiểm tra quyền, lưu trữ private và trợ lý SSE.
- `packages` chứa hợp đồng Zod, bộ tính, Prisma, API client, bản dịch, design token và thành phần giao diện.
- [Kiến trúc](docs/architecture/ARCHITECTURE.md) · [Cơ sở dữ liệu](docs/architecture/DATABASE.md) · [Trợ lý AI](docs/architecture/AI_ARCHITECTURE.md) · [Công thức](docs/architecture/CALCULATIONS.md).
- [Phạm vi MVP](docs/product/MVP_SCOPE.md) · [Thương hiệu](docs/design-system/BRAND_GUIDELINES.md) · [Kết quả kiểm tra](docs/VERIFICATION.md).

GitHub Actions thực hiện kiểm tra và build. Việc chuyển sang hạ tầng production được ghi trong ADR.

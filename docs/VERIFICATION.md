# Kiểm tra nền tảng

Kiểm tra trên macOS với Node 22.20.0, pnpm 10.32.1 và Docker Compose 2.40.3. Các lệnh chi tiết để tái lập có trong README.

| Phạm vi           | Bằng chứng                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hạ tầng           | Compose báo healthy cho PostgreSQL 17. Sau restart, truy vấn vẫn trả về đủ bốn sản phẩm. Setup chạy lại và giữ cấu hình hiện tại.                                                                     |
| Persistence       | Prisma Client được sinh thành công. Hai migration SQL áp dụng được. Seed dùng lại ID cũ.                                                                                                              |
| Backend và web    | NestJS chạy trên host. Expo Metro phục vụ web. Bản web xuất tĩnh và API biên dịch bằng TypeScript.                                                                                                    |
| Tài chính         | Vitest kiểm tra lãi phẳng, gốc đều, annuity, 0%, phí chưa biết, giới hạn, lịch cuối tháng, chênh lệch kịch bản và đối soát các khoản làm tròn.                                                        |
| Auth và ownership | Playwright dùng PostgreSQL thật, đăng ký, đăng xuất, đăng nhập lại và khôi phục mô phỏng. Tài khoản thứ hai bị chặn đọc simulation, context AI và fixture riêng.                                      |
| Trợ lý AI         | SSE trả lời từ bản tính đã lưu, lưu được lịch sử, giữ nhãn mock. Không gọi mô hình bên ngoài.                                                                                                         |
| Giao diện         | Kiểm tra chiều rộng 360, 390, 430, 768, 1024, 1440, 1920 px, nhãn trợ năng và số liệu trên lịch. Các hình chụp Playwright nằm trong test-results sau khi chạy.                                        |
| iOS               | Sau khi nâng cấp, JavaScript bundle được export bằng Expo SDK 58. Kiểm tra runtime Expo Go trước đây dùng SDK 54 trên iPhone 17 Pro Simulator chạy iOS 26.4; chưa lặp lại luồng simulator với SDK 58. |
| Android           | Sau khi nâng cấp, JavaScript bundle được export bằng Expo SDK 58. Kiểm tra runtime Expo Go trước đây dùng SDK 54 trên Android Emulator API 36.1; chưa lặp lại luồng emulator với SDK 58.              |

Các kiểm tra trên simulator/emulator dùng Expo Go. Chưa chạy thiết bị vật lý, build ký phân phối iOS/Android hoặc kiểm tra bằng VoiceOver/TalkBack với người dùng. Các dịch vụ cloud, tài khoản ngân hàng thực, email delivery và inference Bedrock/Gemini/OpenAI nằm ngoài đợt kiểm tra local.

Sau khi thêm Liquid Glass của Callstack, JS bundle web/iOS/Android export và workspace build qua được. TypeScript, Expo dependency check, format check và diff check cũng qua được. Native iOS dev build đã bắt đầu trên simulator iOS 26 nhưng bị dừng trước khi hoàn tất biên dịch theo yêu cầu; native iOS/Android chưa có kết quả build xác nhận. Expo Go không chứa module Liquid Glass; iOS cần development build với Xcode 26 trở lên.

## Product Experience 2.0 · local verification

- Baseline `4525f41` verified from a separate working tree. See the [visual audit](design-system/VISUAL_AUDIT.md) for actual before/after browser captures, seven release viewports and dedicated visual iteration notes.
- Node 22.22.0, pnpm 10.32.1, Chromium 158, isolated PostgreSQL 17.12 and Mailpit 1.34.0. Docker was not available in this executor, so the same real local services ran as local binaries on disposable databases; the Compose definitions were not exercised here. No user database was reset.
- Frozen install, workspace lint and type checks, NestJS build and Expo web export passed. Current unit suite: 17 financial engine tests, 6 API tests, 5 app tests.
- Actual OTP mails arrived in Mailpit as branded HTML and plain text. Verified incorrect/expired/reused codes, attempt/resend limits, protected and cross-account access, same user ID on OTP, legacy password preservation through authenticated email verification, session restore and sign-out.
- Google is configuration-gated and authorization URL/cancellation were tested with dummy local configuration. No external Google token exchange, Apple login, simulator/device session test, signed iOS/Android build or live AI inference was performed. The existing mock AI remains explicitly labeled. Known provider terms are synthetic in this phase; unsupported actual repayment tracking remains an honest empty state.
- Playwright: 8/8 passed against the production-style local web export. The full browser flows exercise password and Mailpit OTP, UI comparison/filtering, protected links and settings, deterministic simulation and save, AI SSE/attachment/history, and account isolation.
- Expo SDK 58 generated iOS and Android JavaScript/Hermes bundles. This confirms bundle generation only, not a signed build or native runtime verification.

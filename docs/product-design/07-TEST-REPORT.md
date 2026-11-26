# 07 · Báo cáo kiểm thử local

App và test của bản review: commit `2449e0f`; các commit sau nó chỉ hoàn thiện
bàn giao. Không dùng production, tài khoản thật, AI bên ngoài hoặc khóa OAuth.

## Ma trận

| Hạng mục                  | Cách xác minh                                                                                                                                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format / lint / typecheck | `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, Node 22.20.0 và pnpm 10.32.1                                                                                                                                                                                                                                      |
| Unit / API                | `pnpm test`: 31 ca engine, 52 ca API, 38 ca app, 5 ca network/auth.                                                                                                                                                                                                                                                   |
| Build web                 | `pnpm build`, chạy export qua preview server với API local                                                                                                                                                                                                                                                            |
| App thực tế               | Chromium E2E: OTP qua Mailpit, provider outage và session retry, profile/preferences, các điều kiện quảng cáo/mô phỏng và phí thiếu, AI local, tài liệu và quyền sở hữu, dock, lưu/ghi nhận trả; PostgreSQL rỗng mới và Mailpit tách riêng.                                                                           |
| E2E mới                   | Kiểm tra Home thứ tự kỳ trả/công cụ tại 390 px; bấm CTA sổ trả nợ mở xác nhận, đọc lưu ý không chuyển tiền, đóng rồi assert ledger không đổi; giữ ca xác nhận trả/hoàn tác và quyền truy cập. Bổ sung mở Mô phỏng từ Finora AI với đúng giả định, phí chưa biết để trống, không tự lưu và không giữ phiếu sau reload. |
| Prototype khép kín        | Chromium: 14 wireframe ở 390 px, năm hành trình bấm qua, kiểm tra 25 tổ hợp màn/kích thước bổ sung; studio 9 concept, sáu màn chính ở 6 width × 2 mode, 24 state renders và hai luồng xác nhận/hủy.                                                                                                                   |
| Native                    | Expo export iOS và Android Hermes là kiểm tra bundle, không phải kiểm thử native. Môi trường chỉ có cloud Linux; chưa chạy Simulator/Emulator hoặc thiết bị.                                                                                                                                                          |

Lần E2E đầu có 26 pass và 1 fail: test mới giả định role dialog có accessible
name trực tiếp; dialog thật đã mở, tiêu đề nằm trong heading con. Selector được
sửa để nhận đúng heading trong dialog, không bỏ bất kỳ assert về ghi dữ liệu.
Visual QA cũng phát hiện phiên signed-out luôn sáng dù OS dark; đã sửa cho
phiên này tôn trọng giao diện thiết bị và thêm assert màu chữ input tối trước
khi chụp. Tùy chọn đã lưu của người đăng nhập giữ nguyên.

Kết quả rerun cuối: **27/27 Chromium E2E pass, 0 skip**; format, lint, typecheck, unit/API và build web pass..

Chạy bổ sung: kiểm tra nhãn tiền kỳ đầu/cuối và phạm vi phí trong biểu đồ Simulator, chụp app thật ở 390 và 1440 px.

## Giới hạn và defect còn mở

- RN Web cung cấp role dialog và heading hiển thị nhưng không tự gắn tên
  dialog trong trường hợp này. Cần review xử lý ở component chung và với
  VoiceOver/TalkBack; chưa kết luận app đạt chuẩn accessibility.
- Không đo startup, battery, crash dài hạn hoặc accessibility native.
- Lỗi auth/đang tải Home trong ảnh tái hiện có chủ đích bằng chặn response local,
  không phải sự cố của service thật. Dữ liệu được test với AI provider local/mock.
- Owner UAT **chưa nghiệm thu**; xem [checklist](07-OWNER-UAT.md).

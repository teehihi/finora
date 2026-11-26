# Đóng góp cho FINORA

Đọc [README](README.md) để chạy dự án và [AGENTS.md](AGENTS.md) để biết quy ước kỹ thuật áp dụng cho cả người viết code lẫn trợ lý lập trình. Repo chưa công bố giấy phép mã nguồn; xem [tình trạng giấy phép và tài sản](docs/maintainers/LICENSING.md). Không gửi mã, ảnh, font hoặc dữ liệu mà bạn không có quyền đưa vào repo.

## Từ nhánh đến pull request

1. Bắt đầu từ `main` mới nhất của **`teehihi/finora`**. Dùng nhánh riêng, ví dụ `feat/repayment-calendar`, `fix/otp-resend` hoặc `docs/local-setup`. Không push trực tiếp hoặc force-push lên `main`.
2. Mỗi PR giải quyết một việc. Đặt tiêu đề nói rõ thay đổi, ví dụ `fix(auth): giữ email khi gửi lại OTP`. Nếu PR đóng issue, dùng `Closes #123` trong phần mô tả.
3. Mở PR vào `main`, hoặc mở **Draft** nếu còn mốc chưa hoàn tất. Mô tả cách kiểm thử, phần chưa kiểm và rủi ro để người review biết chỗ cần xem.
4. Chờ CI xanh và một người khác rà thay đổi trước khi merge. Người có quyền merge của dự án quyết định merge; ưu tiên squash cho PR có nhiều commit nháp. Đây là quy ước nhóm, không phải mô tả ruleset đang bật trên GitHub.

## Bằng chứng trước khi mở PR

| Thay đổi                                               | Bằng chứng cần gửi                                                                                                                                                                                                                |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chỉ tài liệu                                           | `pnpm format:check` hoặc kiểm Prettier trên các file đã đổi; thử các bước hoặc đường dẫn vừa sửa.                                                                                                                                 |
| Mã nguồn                                               | `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build`. Nếu không chạy được lệnh nào, ghi rõ lý do.                                                                                                                           |
| Luồng UI, đăng nhập, lưu hoặc đọc dữ liệu              | Thêm/chạy E2E phù hợp. Với UI, đính kèm ảnh hoặc clip dùng dữ liệu mẫu và ghi thiết bị/trình duyệt; không gọi ảnh web là kiểm thử native. Với thay đổi thanh điều hướng, kiểm cả safe area, đổi tab và fallback của Liquid Glass. |
| Tính toán, xác thực, dữ liệu, tài liệu tải lên hoặc AI | Kiểm các ca biên có liên quan. Nêu tác động lên dữ liệu cũ, quyền truy cập, consent, bí mật môi trường, schema và cách khôi phục nếu đổi migration.                                                                               |

Dùng môi trường dev và fixture tổng hợp; không chạy test lên database production. Không đưa secret, OTP, tài liệu vay thật hay thông tin người dùng vào commit, ảnh, issue hoặc log đính kèm. Báo vấn đề bảo mật qua [kênh riêng](SECURITY.md).

# 07 · Owner UAT: chưa nghiệm thu

**Chỉ owner xác nhận.** Đánh dấu Pass/Fail/Not run sau khi tự thao tác. Ghi
thiết bị, kích thước, theme, bước và kỳ vọng. Dùng email mẫu và file mẫu,
không dùng tài khoản ngân hàng, hợp đồng thật hoặc API key.

## Mở bản review

1. Mở `review.html` trong gói bàn giao, chọn wireframe hoặc B → màn và trạng thái.
   Bản HTML chỉ minh họa. Dùng ứng dụng thật (bước tiếp theo) để nghiệm thu.
2. Import Git bundle vào clone FINORA có commit `4527518`:
   `git fetch /duong-dan/finora-design-first.bundle refs/heads/feat/finora-design-first:refs/heads/feat/finora-design-first`.
   Kiểm tra không có thay đổi chưa lưu trước khi chuyển nhánh, hoặc tạo worktree
   riêng: `git worktree add ../finora-design-review feat/finora-design-first`.
3. Trong checkout review, theo [README](../../README.md): dùng Node/pnpm quy định,
   `pnpm run setup`, rồi `pnpm dev`. Mở web và Mailpit theo URL console.
   Nếu đã có database local, giữ nguyên dữ liệu; thử bằng email tổng hợp.
   `pnpm build` và `node apps/api/scripts/preview.mjs` dùng để xem bản export
   sau khi API và local services đã chạy theo hướng dẫn. Không cần cloud.
4. Với Mac có Xcode/iOS thích hợp, dùng development build của app trên iOS
   Simulator, không dùng Expo Go để kết luận Liquid Glass. Android cần emulator
   hoặc thiết bị; giữ tùy chọn dock/fallback hiện tại.

| A–E          | Bạn cần làm                                                                                          | Kết quả cần thấy                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| A · Lần đầu  | Xem ví dụ không account; nhập email dev, thử OTP sai rồi OTP Mailpit; bỏ qua hồ sơ, quay lại bổ sung | Form và đường khôi phục rõ; Home nêu chưa đủ dữ liệu trước khi có hồ sơ; con số không phải hạn mức duyệt |
| B · AI       | Hỏi vay 20 triệu và so hai kỳ hạn; xem giả định và thử dùng kết quả                                  | Giải thích giúp quyết định, phí thiếu vẫn là thiếu; không tự lưu hay gửi dữ liệu bên ngoài               |
| C · So sánh  | Mở hai sản phẩm; xem nguồn; đổi sang mô phỏng cá nhân; thay kỳ hạn và xem lịch                       | Phân biệt số quảng cáo và điều kiện tự nhập; so cùng cơ sở, biểu đồ có số đầu/cuối                       |
| D · Tài liệu | Chọn fixture hợp đồng, rà soát từng trường; hủy và thử nhập thủ công                                 | Không suy đoán phí; xác nhận điều khoản không tạo khoản đang theo dõi                                    |
| E · Quay lại | Lưu dự tính; xác nhận theo dõi nếu phù hợp; mở sổ, hủy ghi nhận kỳ; lặp lại và xác nhận              | Kế hoạch và nợ tách biệt; kỳ cần trả nổi bật; hủy không thay trạng thái; xác nhận chỉ ghi sổ             |
| Native       | Tăng font, mở bàn phím, thoát ra, thử dark và drag/tap dock; bật VoiceOver/TalkBack                  | Thông tin không mất, focus hợp lý; dock ẩn/hiện đúng; không ngụ ý web đã chứng minh điều này             |

**Trạng thái:** Pending owner review. Phát hành production, app store và kết nối
bên ngoài chưa được phê duyệt hoặc thực hiện.

# 06 · Từ thiết kế sang app

Nguồn: [B · Financial Intelligence](high-fidelity/index.html?direction=b) và
[bản V5](../VISUAL_EXCELLENCE_REPORT.md). Không tái tạo app theo HTML: HTML sử
dụng fixture, app dùng API và token thật. Đối chiếu ưu tiên thông tin, nội dung
và hành động, không yêu cầu pixel giống nhau giữa HTML / Expo Web / native.

| Lát cắt                        | Quyết định và trạng thái                                                                                                                                                                                                                  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens, type, icon, dock       | Tái sử dụng Signature, Geist, primitives, palette và dock đã verify; không thêm hệ design song song hoặc asset đối thủ.                                                                                                                   |
| Home                           | Khi có nghĩa vụ mở, đặt kỳ trả trước các công cụ trên mobile. Nếu chưa có nghĩa vụ, vẫn ưu tiên công cụ. Ở 360 px và chữ lớn, shortcut được xuống hàng; thông tin ngày/trạng thái được đưa vào nhãn accessibility.                        |
| Finora AI                      | Biên lai AI nêu rõ phí chưa biết và có CTA mở Mô phỏng với đúng giả định. Phiếu chuyển chỉ ở bộ nhớ, giới hạn cùng tài khoản và không tự lưu hoặc tính lại.                                                                               |
| Simulator                      | Chú thích tiền kỳ đầu/cuối dựa trên lịch thật; bỏ chiều cao tối thiểu làm sai tỷ lệ, và nêu không gồm phí một lần cả khi không gộp nhóm. Giữ công thức và kết quả không đổi.                                                              |
| Explore & comparison           | Ưu tiên tìm kiếm, lọc, chọn và so sánh; giữ lối nhập điều khoản cá nhân như hành động phụ. Với nguồn công bố, lưu ý báo giá và nguồn cạnh danh sách kết quả.                                                                              |
| Auth and onboarding            | Mobile thấy form trước hình minh họa, giữ header thương hiệu và link xem ví dụ; desktop giữ split canvas, thiết bị điều khiển theme của guest, OTP/khôi phục/provider nguyên vẹn. Hồ sơ onboarding được nghiệm lại, không dựng route mới. |
| Loan detail, docs              | Giữ chi tiết nguồn, review tài liệu và trạng thái không đọc được, không đổi privacy.                                                                                                                                                      |
| Repayment                      | Kỳ quá hạn cần xử lý hoặc kỳ chưa trả gần nhất là tiêu điểm (ngày, số tiền, kỳ và khoản); tổng gốc/lãi là dòng phụ. Hành động vẫn mở dialog trước khi ghi nhận; hủy không ghi dữ liệu.                                                    |
| Profile, settings, public tour | Giữ layout/routes và nội dung V5; verify chức năng vẫn chạy. Không triển khai landing mới hoặc tạo đường dẫn public.                                                                                                                      |

Mô phỏng vẫn yêu cầu kiểm tra điều khoản trước khi tính. Khi mở từ Finora AI,
URL chỉ chứa mã tạm, không có số tiền, lãi, phí hoặc ngày. Tải lại không giữ
phiếu chuyển. Người dùng vẫn phải xác nhận nếu muốn lưu; không đổi contract.

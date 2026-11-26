# 04 · Kiến trúc thông tin

**Mục tiêu:** người đọc hiểu bước tiếp theo mà không cần biết FINORA sắp xếp API hay lưu trữ thế nào.

| Cấp       | Người dùng muốn                                | Nơi bắt đầu                                | Không mở thêm tab                                   |
| --------- | ---------------------------------------------- | ------------------------------------------ | --------------------------------------------------- |
| Public    | Hiểu FINORA trước khi đăng nhập                | Auth → xem ví dụ công khai                 | Showcase; không yêu cầu hồ sơ                       |
| Trang chủ | Biết mình có thể dành bao nhiêu và nên làm gì  | Home: hồ sơ → khả năng trả → một hành động | Kỳ trả sắp đến, kế hoạch đã lưu                     |
| Khám phá  | Xem và so sánh lựa chọn                        | Explore: danh sách → điều kiện → so sánh   | Chi tiết và mô phỏng là luồng theo ngữ cảnh         |
| Finora AI | Đặt câu hỏi và biến câu trả lời thành việc làm | Assistant; hỏi tối đa thông tin còn thiếu  | Tài liệu là lối tắt theo tác vụ, không là tab riêng |
| Khoản vay | Phân biệt dự tính với nghĩa vụ theo dõi        | Loans: đã lưu / đang theo dõi              | Chi tiết khoản vay, lịch trả, đánh dấu đã trả       |
| Hồ sơ     | Quản lý dữ kiện, quyền riêng tư và thiết lập   | Profile                                    | Ngôn ngữ, giao diện, tùy chọn AI                    |

Mobile: giữ dock năm điểm đến với tap/drag; không chồng CTA đáy lên dock. Tablet:
tăng diện tích nội dung, không tăng số mục. Desktop: dùng rail hiện tại và đổi
từ đọc dọc sang hai vùng khi cần so sánh. Auth, lỗi và khôi phục không thêm
điểm đến chính. V5 đang dùng chính cấu trúc năm điểm đến này.

**Biên ngữ nghĩa:** dữ kiện cá nhân ≠ điều kiện quảng cáo ≠ giả định mô phỏng
≠ điều khoản hợp đồng đã xác nhận. Gắn ngữ cảnh cạnh số liệu. Công cụ đọc tài
liệu không tự tạo khoản vay thực. Ghi nhận tự nhập không ngụ ý giao dịch ngân hàng.

**Giới hạn:** đây là mô hình đề xuất dựa trên repo và walkthrough nội bộ, chưa
có bằng chứng người dùng mới hiểu được nhãn chỉ qua lần sử dụng đầu tiên.

# 04 · Kiểm tra UX nội bộ

**Bằng chứng:** mở prototype không kết nối API; Chromium thực sự chạy 14 màn
ở 390 px, kiểm tra năm màn chính ở 360/430/768/1024/1440 px và thử A–E.
Không phải thử nghiệm với người thật, không suy ra mức hài lòng.

| Luồng               | Quan sát khi thao tác                                                                                                  | Sửa trong thiết kế / giới hạn                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A · Vào lần đầu     | Email sai báo lỗi; OTP sai có đường sửa và giữ email. Hồ sơ có đường bỏ qua.                                           | Đưa lý do cần hồ sơ sát CTA, không biến thiếu số thành số 0. Nội dung ví dụ vẫn là fixture.                                |
| B · Hỏi AI          | Câu hỏi vẫn còn khi hiển thị phản hồi mẫu; có đường sang mô phỏng.                                                     | Ưu tiên hành động trên kết quả, để nguồn và giả định nằm trong vùng đọc chính. Chưa đo tính hữu ích của AI với người thật. |
| C · So sánh         | Sau mở chi tiết A, có thể vào so A/B và quay lại nguồn.                                                                | Hiện cơ sở so chung trước kết quả; không chọn người thắng nếu phí chưa biết.                                               |
| D · Tài liệu        | Mô phỏng lỗi đọc vẫn đưa ra lối nhập tay.                                                                              | Hiện trạng thái chưa đọc được phí và phân biệt xác nhận điều khoản với theo dõi khoản vay.                                 |
| E · Quay lại trả nợ | Hủy xác nhận không tạo khoản vay; sau xác nhận mới xuất hiện trạng thái chưa trả; đánh dấu trả yêu cầu xác nhận riêng. | Đặt kỳ tới trước tổng còn lại; thông báo ghi nhận thủ công nằm ngay cạnh hành động.                                        |

Vòng đầu cho thấy không nên ép người dùng sang hồ sơ từ màn public, và cần tách
ba xác nhận bằng ngôn ngữ khác nhau. Bản prototype vì vậy có đường xem ví dụ và
màn xác nhận/hủy độc lập. Prototype không mô phỏng tất cả trạng thái hệ thống,
các lối tắt để duyệt thiết kế không đại diện cho quyền truy cập thật.

**Gate nội bộ:** đi tiếp khi cấu trúc và lỗi quan trọng có thể duyệt; kiểm chứng
lại trên app thật. Owner UAT chưa chạy.

# Bản đồ dòng tiền 90 ngày

**Tác vụ:** xem số dư thấp nhất và ngày hụt tiền, biết khoản nào kéo số dư xuống,
thử một số dư mở đầu cao hơn rồi quay về kế hoạch gốc. Đi từ Tổng quan hoặc
Khoản vay; không có tab mới trên dock.

## Wireframe

```text
‹ Quay lại · KẾ HOẠCH TÀI CHÍNH
Bản đồ dòng tiền 90 ngày
[Nhập kế hoạch] [Thử dữ liệu mẫu]
┌ Kết quả: cần thêm … trước … ┐
│ dự báo số dư ━━━╲___╱━━━   │   ┌ Giả định dòng tiền ┐
│ [Xem nếu để dành trước …]   │   │ tiền đang có      │
└────────────────────────────┘   │ thu nhập + ngày  │
  Nguyên nhân & ngày hồi phục    │ chi phí + ngày   │
  Mốc gần nhất / danh sách       │ [Tính dự báo]    │
                                 └──────────────────┘
```

Trên điện thoại: nhập trước khi có dự báo; sau khi tính, tóm tắt và thử kịch bản
đứng đầu, kế tiếp là thẻ giả định có nút sửa thay vì để biểu mẫu mở liên tục. Số dư âm dùng chữ/số và chú thích, không chỉ dùng màu.
Biểu mẫu sai không hiển thị kết quả cũ như thể đã cập nhật; sửa được ngay.
Dữ liệu mẫu tách hẳn khỏi sổ thật; quay lại hoặc đổi tài khoản sẽ mất bản nháp.
Tác vụ mẫu: mở → thử dữ liệu mẫu → đọc nguyên nhân → thử đệm → quay về gốc.
Tác vụ thật: nhập số dư đầu kỳ và lịch thu/chi → cộng các kỳ chưa ghi nhận trong
sổ → tính; nếu sổ lỗi, chỉ dùng mẫu hoặc tải lại, không giả vờ là không có nợ.

## Quy tắc tính

Ngày chốt lấy từ sổ khi có; dự báo đúng 90 ngày tính cả ngày bắt đầu.
Số dư là cuối ngày (không dự báo thứ tự trong một ngày). Ngày cố định trong
tháng ngắn được dời đến ngày cuối tháng. Kỳ quá hạn chưa ghi nhận gom vào ngày
đầu, với giả định xử lý ngay và không tự thêm phí phạt. Bản nháp chỉ trong màn
hình, không gửi server/AI, không ghi lịch hay kích hoạt giao dịch. Phần giải
thích lấy trực tiếp từ phép tính, không bịa lời khuyên hoặc điều khoản. Đây là
ước tính, không phải số dư ngân hàng hay tư vấn tín dụng. Kịch bản đệm giả định
tiền đã có từ đầu kỳ, không tạo thu nhập và không đổi lịch trả.

[Khung hình thiết kế 390 × 844](mobile.svg) là bản thiết kế, không phải ảnh app.
Dùng màu và đường nét thương hiệu hiện có. Hai chế độ ngồi trong cùng một hàng
trên màn hẹp; nguyên nhân, tên khoản trả và dòng tiền vẫn đọc được bằng
văn bản độc lập với đồ thị.

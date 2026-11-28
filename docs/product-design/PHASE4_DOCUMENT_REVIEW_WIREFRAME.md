# Phase 4 · Rà soát hợp đồng vay

## Tác vụ và nguồn sự thật

Người dùng mở tài liệu riêng tư, đối chiếu từng điều khoản với trang gốc,
sửa các giá trị cần thiết, xác nhận rõ ràng rồi mới tính hoặc lưu mô phỏng.
Tệp và trích xuất thuộc riêng user ID từ Better Auth. Công thức và lịch trả nợ
thuộc `packages/financial-engine`; trường trích xuất chưa xác nhận không được
đưa vào engine. Không gửi văn bản tài liệu sang AI bên ngoài.

## Luồng và bố cục

```text
Tài liệu của tôi → Rà soát
                    ├─ Bản gốc (PDF/ảnh, số trang, chế độ đọc)
                    ├─ Điểm cần kiểm tra (mâu thuẫn, phí, điều khoản thiếu)
                    ├─ Từng trường: giá trị / chưa biết / trạng thái
                    │              ↳ trang + đoạn dẫn chứng (+ vùng ảnh nếu có)
                    ├─ Biểu mẫu chỉnh sửa thông số cho phép tính
                    ├─ Xác nhận và tính lại → Lịch trả nợ
                    └─ Xác nhận lưu → Mô phỏng riêng tư
```

Trên desktop, giữ cấu trúc hai cột hiện có: bản gốc, nguồn và cảnh báo bên
trái; thông số và mô phỏng bên phải. Trên điện thoại xếp một cột theo thứ tự
trên, giữ nút hành động gần biểu mẫu. Khi OCR/PDF reader lỗi, hiện lý do và cho
phép nhập thủ công; không hiện giá trị không có dẫn chứng. Quay lại không lưu
thông số; xóa tài liệu có xác nhận riêng.

## Nguyên tắc nội dung

- Màu cảnh báo chỉ tô điểm cần xem, kèm chữ và dẫn chứng.
- “Độ tin cậy cao” nghĩa là đọc trực tiếp từ dòng văn bản khớp mẫu; “cần rà
  soát” nghĩa là OCR. Đây không phải xác suất hiệu chuẩn.
- Không gộp phí rời thành tổng phí. Phí thiếu giữ “chưa biết”.
- Bản xem PDF theo trang chỉ được trả qua route kiểm tra chủ sở hữu.
- Màn hình mở rộng component và token Finora hiện có, không đổi điều hướng.

## Kiểm tra trước UAT

Ảnh web 390/1440 px, light/dark, câu tiếng Việt dài, focus và vùng bấm 44 px;
luồng nguồn → sửa → xác nhận → tính → lưu; tệp lỗi và hết phiên. iOS/Android
đánh dấu chưa thử nếu không có runtime.

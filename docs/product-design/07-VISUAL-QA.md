# 07 · Visual QA

Ảnh trong gói review chia `baseline-v5` (app thật trước), `high-fidelity` (studio
B với dữ liệu minh họa), `actual` (app thật trên môi trường kiểm thử cục bộ).
Không so khớp chỉ số giữa hai fixture khác nhau. Đối chiếu cùng thứ tự, mật độ,
trạng thái và độ rõ của hành động. Xem `FINORA-Design-First-So-sanh.jpg` trong
evidence; ảnh nguyên vẹn dùng để zoom.

| Màn           | So sánh và quan sát                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home          | V5 có con số chính tốt nhưng kỳ tới nằm sau cụm công cụ. B đặt kỳ trả vào vùng cần làm. App mới giữ phần ngân sách, kéo kỳ trả lên, vẫn đặt công cụ trước khi chưa có lịch cần xử lý.            |
| Repayment     | V5 làm nổi tổng còn lại. B và app mới làm nổi kỳ cần xử lý (ngày, số tiền, tên khoản) và CTA review. Tổng còn lại vẫn dễ tìm nhưng nhỏ hơn. Thanh điều hướng không đổi.                          |
| Simulator     | Giữ phiếu chi phí đáng tin ở V5; B có nhịp các kỳ và tên rõ. App thêm số kỳ đầu/cuối vào biểu đồ để không cần diễn giải chỉ từ cột; vẫn đọc được bảng chi tiết, chưa nêu tổng khi phí chưa biết. |
| Auth          | V5 đặt dải hình trước tiêu đề đăng nhập. B và app mới cho nhập email trước, hình Fin cạnh phần xem ví dụ hoặc dưới form trên mobile. Desktop vẫn giữ hai vùng.                                   |
| AI và Explore | So bằng app V5/app mới và studio. Màn AI thật đưa nút Mô phỏng và lưu ý phí vào từng phương án; Khám phá đặt tìm/lọc trước lối mô phỏng cá nhân, giải thích nguồn sát danh sách.                 |

Đo responsive tại **360 / 390 / 430 / 768 / 1024 / 1440 CSS px**. Đối chiếu
các màn chính ở portrait và rail; ảnh cùng chiều rộng không chứng minh layout
native. Xem các ví dụ light/dark cho chữ có dấu, số VND, menu/dock, form và sơ
đồ. Auth dark dùng system preference của guest; workspace dark từ tùy chọn
account đã lưu. Ảnh loading, OTP, review tài liệu, khoản chưa theo dõi và lỗi
kết nối là evidence riêng, không phải cả ma trận mọi trạng thái production.

Đã kiểm tra bằng ảnh thật: 125 ảnh sau regression và 2 ảnh bổ sung của biểu đồ; 70 ảnh V5 đối chiếu. Ở 360 px, cụm công cụ Home xuống hàng và tên khoản dài trong ledger wrap; ở desktop, rail và cột tóm tắt giữ cách tổ chức khác mobile. Dark dùng riêng ảnh thật có chữ và màu nền đã đổi; ảnh AI dark có lịch sử mẫu nên không phải so sánh thuận nghịch với empty light.

Kiểm tra còn cần làm: Dynamic Type lớn trên thiết bị, keyboard mở/đóng,
screen reader, native Liquid Glass và Android fallback. Không coi ảnh tự chụp
là UAT, không gán điểm số thẩm mỹ.

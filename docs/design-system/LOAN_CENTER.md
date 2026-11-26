# FINORA: màn Khoản vay

Màn theo dõi sau khi vay. Khoản đã theo dõi và bản mô phỏng vẫn tách nhau. FINORA giúp người đi vay đối chiếu lịch và chuẩn bị dòng tiền, không thanh toán thay người dùng.

## Đối chiếu giao diện

- [MoMo Ví Trả Sau](https://www.momo.vn/blog/huong-dan-cach-thanh-toan-du-no-vi-tra-sau-tren-momo-c116dt1961): số cần trả và hành động chính đi liền; ngày và trạng thái thuộc về từng mục.
- [VCB Digibank Tiêu chuẩn](https://www.vietcombank.com.vn/-/media/Project/VCB-Sites/VCB/KHCN/San-pham-Dich-vu/Ngan-hang-so/PDF_3Doigiaodien.pdf?ts=20240614022414): nhận diện tập trung ở đầu màn, không làm rối dữ liệu.
- [Techcombank Mobile](https://techcombank.com/thong-tin/thong-bao/techcombank-ra-mat-giao-dien-hoan-toan-moi-nang-tam-trai-nghiem-tai-chinh-so): đầu trang đậm màu, danh sách sáng với số tiền canh phải.

## Bố cục

- Khối đầu hiển thị số cần trả, hạn và tên khoản, gộp các kỳ chưa xác nhận cùng ngày. Nếu quá hạn, ưu tiên ngày cũ nhất và dẫn thẳng tới Sổ trả nợ. Gốc/lãi và tiến độ ở từng dòng mở rộng; sổ giữ đầy đủ các mốc và thao tác xác nhận.
- Danh sách chia đang trả và hoàn thành dựa trên số kỳ người dùng đã xác nhận, không ngụ ý ngân hàng đã tất toán. Bản mô phỏng không tính vào khoản theo dõi. Tổng tháng ở danh sách tính các kỳ chưa xác nhận trong tháng của hạn sắp tới gần nhất (hoặc tháng hiện tại khi không còn hạn sắp tới), không gồm phí/phạt ngoài lịch.
- Dock Liquid Glass và nút Fin giữ nguyên.

## Kế hoạch trả

- Chỉ hiện mô phỏng khi kỳ gần nhất chưa quá hạn. Bảng mở từ nút chính, không chiếm chỗ trên trang Khoản vay.
- Kết quả chỉ có sau khi nhập tiền đã dành, thu nhập và chi phí còn phải chi đến hạn. Kịch bản giảm thu nhập 20% không đổi chi phí. Hiển thị ước tính dư, vừa đủ hoặc thiếu so với số cần trả; không kết luận khả năng chi trả của cả khoản vay.
- Tính ngay trên máy bằng financial-engine; không lưu số người dùng nhập, không gửi lên API hay AI và không đổi lịch trả nợ.

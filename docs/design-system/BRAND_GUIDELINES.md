# Nhận diện Finora

Hai PNG gốc được đối chiếu nguyên byte với bộ Resource đã duyệt: `apps/app/assets/brand/original.png` và `original-transparent.png`. Lockup nhúng trong app cắt khoảng trong suốt thừa và không đổi tỷ lệ hoặc màu. `apps/app/public/favicon.ico` giữ nguyên favicon trong bộ Resource. `assets/brand/icon.png` dùng nguyên artwork từ `appIcon.png`, đặt trên nền ivory và thu tỉ lệ đồng nhất về 1024 px để có canvas đục cho icon native. Logo áp dụng nền sáng ở dark mode, không nhuộm màu. Bộ hướng dẫn Fin là tài liệu tham khảo; không cắt nhân vật từ contact sheet làm artwork sản xuất.

Ảnh thuyền giấy và đồng xu được tạo cho màn hình chào và xác thực. Ảnh là tài sản local đóng gói cùng ứng dụng. Giao diện sản phẩm dùng nền ivory, xanh rừng và các đường phân cách nhẹ. Màu nhấn giúp nhận ra hành động và dữ liệu trong bản tính.

Instrument Serif dùng cho tiêu đề tiếng Anh. Kiểm tra cmap của tệp phát hành cho thấy font thiếu nhiều ký tự tiếng Việt, gồm ắ, ệ và ữ. Source Serif 4 dùng cho toàn bộ tiêu đề tiếng Việt. Geist dùng cho nội dung, trường nhập và số liệu. Cả ba font được phân phối theo SIL Open Font License 1.1. Bản license nằm trong thư mục assets/fonts/licenses.

# Nhịp thao tác: Tổng quan → kỳ trả → dòng tiền

Tee duyệt hướng prototype tham chiếu nhịp thao tác của Trung Tâm Tài Chính /
Ví Trả Sau, không dùng nhận diện hay dịch vụ của MoMo. Trong FINORA, tác vụ
hàng đầu khi có lịch là kỳ chưa ghi nhận gần nhất, ưu tiên quá hạn. Tổng quan
còn bốn lối tắt và chuyển phần khả năng trả theo hồ sơ xuống dưới. Không có sổ
thì hiển thị hướng bắt đầu, không hiển thị 0 đồng hay khoản vay giả.

Màn kỳ trả mở cùng kỳ đang được ưu tiên, hiển thị gốc/lãi từ sổ hiện có. Liên
kết Dòng tiền 90 ngày không tự đánh dấu kỳ trả hoặc giả định số dư, lương và
chi tiêu. Dự báo dùng cùng công thức, phạm vi ngày, quy tắc quá hạn và ranh giới
dữ liệu như trước; chỉ thay cách trình bày. Màu hổ phách dành cho vùng âm,
trạng thái cảnh báo hoặc nội dung cần chú ý. Kịch bản đệm giữ riêng, có thể
quay lại kế hoạch gốc.

Skeleton gắn với truy vấn thật. Không chèn trễ. Tải lại với cache giữ số tiền
và vị trí; lỗi có nút Thử lại và nhãn dữ liệu lần gần nhất. Giảm chuyển động
qua media query trên web và AccessibilityInfo trên native làm skeleton tĩnh.
Điều hướng, màu thương hiệu, logo và quy trình xác nhận hiện có được giữ lại.
Các màn Khám phá, Hồ sơ và AI trong prototype chỉ minh họa điểm đến; không
thay logic ở các màn đó.

## Đối chiếu khi tích hợp

Trên màn hình điện thoại, Kỳ trả và Dòng tiền dùng một thanh tiêu đề có nút
quay lại thay cho việc xếp logo, một hàng quay lại, tiêu đề lớn và đoạn giải
thích. Số tiền, hạn, biểu đồ và hành động lên trước; giới hạn dữ liệu và
chi tiết được chuyển xuống chứ không bỏ. Giữ dock, safe area, thứ tự lấy dữ
liệu thật và chế độ riêng tư. So ảnh web ở 390 × 844 với cùng số tiền và các
mốc của fixture; đường dẫn test cũng kiểm tra nút chính không bị dock che.

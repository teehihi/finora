# FINORA · Nhịp điều hướng và tải dữ liệu

## Điều hướng

Trước thay đổi, gần như mọi route trong workspace dùng fade. Kiểu chuyển giống
nhau không cho thấy đâu là chuyển tab ngang cấp và đâu là đi vào chi tiết.

| Ngữ cảnh                                              | Quy tắc                                                                                                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chọn một tab ngang cấp bằng dock                      | Fade ngắn. Không dựng trang ở một hướng trái/phải cố định.                                                                                         |
| Danh sách → khoản vay/tài liệu, drill-down → chi tiết | Dùng push/pop của stack native, giữ hướng Back và cử chỉ mặc định của hệ điều hành.                                                                |
| Tác vụ tạm thời, ví dụ bộ lọc hoặc xác nhận kế hoạch  | Sheet đi từ dưới lên. Hộp thoại nhẹ không cần push sang trang khác.                                                                                |
| Web hoặc Giảm chuyển động                             | Không cần mô phỏng hệ thống chuyển cảnh native. Giữ luồng và phản hồi, giảm hoặc bỏ hiệu ứng.                                                      |
| Shared element                                        | Chưa thêm: các màn chính không có một hình/đối tượng giống hệt xuất hiện ở hai đầu mà cần nối bằng hình ảnh. Không dùng hiệu ứng chỉ để trang trí. |

## Startup và mạng

- Splash native và bề mặt khởi động dùng cùng màu và dấu hiệu FINORA. Chỉ
  chạy trong lúc có việc xảy ra, không giữ màn thêm để kéo dài hiệu ứng.
  Họa tiết đường nét là bản vẽ mới, lấy ý tưởng nền bản đồ nhẹ từ
  [Findora](https://github.com/teehihi/findora-new), không chép ảnh hay nhãn hiệu.
- Sau khi vào workspace, network chậm không nên che toàn bộ ứng dụng.
  Từng vùng hiện skeleton theo cấu trúc thật; tác vụ độc lập có thể dùng
  màn chờ có tiêu đề và nút Back. Không dùng phần trăm giả.
- Refetch giữ dữ liệu hợp lệ gần nhất ở chỗ cũ, để người dùng vẫn đọc được.
  Khi tải lại lỗi, đánh dấu dữ liệu cũ và cho thử lại tại chỗ. Không nhầm
  lỗi tải với trạng thái trống hay tự suy diễn số tiền.
- API client giới hạn GET JSON và đọc tài liệu trong 15 giây, kể cả bước
  đọc body. Hết hạn đi vào trạng thái lỗi có thể thử lại; không tự phát
  lại request vì đã hết hạn. Các lệnh ghi và SSE giữ cơ chế riêng, không
  gửi lại tự động để tránh kết quả trùng hoặc không rõ có ghi hay chưa.
  Riêng tải tài liệu có mốc chờ 90 giây: nếu mất phản hồi, kiểm tra danh
  sách tài liệu gần đây trước khi gửi lại.
- Home ưu tiên tìm chức năng và kỳ trả tiếp theo. Giữ số liệu thuộc đúng
  chủ tài khoản và công cụ thật, không thêm số dư hoặc thông báo minh họa.

## Nghiệm thu trước khi phát hành

Thử trên iPhone thật và một máy Android: cold start và warm start, Wi-Fi yếu,
offline và retry, nền sáng/tối, phông lớn, Reduce Motion, Back bằng cử chỉ,
bàn phím, dock thu/mở khi cuộn, và chuyển qua tab lúc dữ liệu còn tải. Test
Chromium ở kích thước điện thoại kiểm tra bố cục và các trạng thái mạng,
không thay thế kiểm tra chuyển động UIKit/Android. Khi app chạy staging,
phân biệt thời gian chờ backend với dropped frames; không thêm animation
dài để che lỗi, và không log OTP, tài liệu hay số liệu tài chính để đo thời gian.

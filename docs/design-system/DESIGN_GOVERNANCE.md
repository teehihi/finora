# FINORA · Design governance

**Design first, build second, validate continuously.** Thay đổi nhỏ như sửa
chính tả hoặc contrast có thể dùng evidence nhanh; thay đổi hướng/luồng lớn
phải qua từng gate dưới đây. Không đánh dấu gate khi chưa có evidence.

| Vai trò     | Gate và evidence                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product, BA | Người dùng/tác vụ/đầu ra, scope và điều kiện nghiệm thu; ghi rõ đâu là giả định.                                                                          |
| Kỹ thuật    | Chỉ rõ source of truth, privacy, ranh giới tài chính, route/stack đang dùng và phần không được đổi.                                                       |
| UX          | Sitemap, wireframe trung tính, prototype; thử đường đi chính, back/cancel/lỗi trước khi chọn màu.                                                         |
| UI          | Render thiết kế ở kích thước có thật, review hướng nghệ thuật/giao diện tối/chữ tiếng Việt. Giữ approved assets và dock.                                  |
| Dev         | Dùng token/primitives hiện có; mỗi lát cắt có dữ kiện thật hoặc trạng thái có thật, không hardcode số giả ở production. Render app và đối chiếu thiết kế. |
| QA          | Chạy regression thực, kiểm tra ảnh thật và tương tác; tài liệu hóa lỗi và phần chưa chạy. Không thay owner UAT bằng test tự động.                         |
| Owner       | Tự duyệt và nghiệm thu. Không tự đổi sang approved; release là quyết định riêng.                                                                          |

## Invariants khi review

1. Nêu rõ dữ liệu quảng cáo, giả định mô phỏng, điều khoản người dùng xác nhận
   và nghĩa vụ tự theo dõi. Thiếu phí không phải miễn phí; lập lịch không chuyển tiền.
2. Tổ chức bố cục theo một hành động/một tiêu điểm, tránh thẻ đồng dạng cho
   nội dung khác cấp và tránh dùng màu làm tín hiệu duy nhất.
3. Xem phone nhỏ, tablet, desktop, light/dark; thử focus, phóng chữ, cuộn, tap,
   back và keyboard. Kiểm tra screen reader/iOS/Android khi có runtime.
4. Không lưu dữ liệu cá nhân/credentials vào ảnh, prototype, log. Bản xem
   thiết kế độc lập không kết nối server hoặc đồng bộ dữ liệu.
5. Biên nhận thay đổi: ảnh trước/thiết kế/app, route và fixture, issue mở,
   kết quả test, giới hạn, người phê duyệt thực (nếu có).

Mẫu áp dụng: [báo cáo Design First](../product-design/FINORA-DESIGN-PROCESS-REPORT.md).

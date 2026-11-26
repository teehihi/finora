# 05 · Quyết định hướng sáng tạo

**Chọn nội bộ:** B · Financial Intelligence, với Fin trợ giúp ở ngữ cảnh AI,
không làm linh vật dẫn dắt toàn bộ ứng dụng. Giữ logo, biểu tượng, favicon và
Fin từ repo. Đây không phải xác nhận của product owner.

[Moodboards](moodboards/index.html) · [Ma trận 9 concept](concepts/README.md) ·
[Studio 6 màn, light/dark và trạng thái](high-fidelity/index.html).

| Tiêu chí                | A · Consumer Fintech                                          | B · Financial Intelligence                                               | C · AI Companion                                                    |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Nhận diện và thân thiện | Mạnh: lưới việc cần làm và khối màu rõ                        | Nhận diện từ forest, con số, đường lá; Fin giữ cảm giác gần gũi đúng chỗ | Mạnh trong chat; yếu hơn khi ý định là quản lý khoản đã vay         |
| Thứ tự trên mobile      | Truy cập công cụ nhanh, nhưng phải qua lưới mới thấy nghĩa vụ | Con số có nhãn → kỳ sắp tới → công cụ/phương án                          | Gợi ý và hội thoại trước; có nguy cơ chôn điều khoản/kỳ trả         |
| Hiểu chi phí            | Phải ghép thông tin từ nhiều khối                             | Cùng ngữ cảnh, kỳ hạn; phí chưa biết không biến mất                      | Có lời giải thích, nhưng thông tin tài chính dễ chìm trong đoạn văn |
| Tương phản và thu phóng | Phụ thuộc màu phân nhóm nếu không có nhãn                     | Có nhãn, ranh giới hình dạng, số tabular; ít diện tích trang trí         | Chú ý độ tương phản và dị biệt khi nội dung hội thoại dài           |
| Khả thi web/native      | Lưới mobile mới nhiều biến thể                                | Tái dùng hệ thống, chỉ đổi ưu tiên và nền có lý do                       | Cần nhiều mẫu hội thoại minh họa và kiểm tra cách xếp nội dung      |
| Nhất quán và tính riêng | Lưới phổ biến ở ví, dễ thành bản sao                          | Tách giả định/ước tính/nghĩa vụ là đặc trưng của FINORA                  | Có cá tính nhưng mẫu chatbot phổ biến, khó đồng nhất ledger         |

B không lấy asset đối thủ. Từ C giữ câu gợi ý Fin và biên lai tài chính có
thể thực thi. Từ A giữ icon nhận biết nhanh, không đưa lưới hành động lên trước
nghĩa vụ. Màu đặt vai trò, không dùng làm thông tin duy nhất.

**Chữ:** ưu tiên Geist Regular/Medium/Bold đang ship; system rounded và
humanist chỉ là đối chiếu moodboard, không thêm dependency. Kiểm tra mẫu
“Chưa xác nhận trả”, “Khả năng trả thêm mỗi tháng”, “1.870.000 ₫” cùng chiều
rộng 360 px và dark. Khoảng tiền dùng số tabular; không dùng serif cho tác vụ.

**Điểm cần chuyển thành code:** Home cho thấy kỳ trả gần hơn, không ép một dòng
năm biểu tượng ở điện thoại nhỏ; Ledger ưu tiên kỳ đến hạn và xác nhận thủ công,
tổng theo lịch xuống tầng hai; các mẫu xử lý chưa biết phí/điều kiện công bố đã
có trong V5 là điều kiện giữ nguyên, không thay dịch vụ phía sau.

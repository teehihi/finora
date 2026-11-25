# Quy ước tính toán

Tất cả số tiền là số nguyên VND. Gốc dương, tối đa 1.000 tỷ đồng. Kỳ hạn từ 1 tới 360 tháng. Lãi suất danh nghĩa năm từ 0% đến 100%, tối đa 4 chữ số thập phân. Các điều kiện danh mục có thể hẹp hơn. Lãi suất tháng r = lãi suất năm / 1200. Không mô hình hóa lãi phạt, bảo hiểm chưa khai báo, biến động lãi suất hoặc số ngày thực tế.

| Phương pháp | Gốc và lãi từng tháng                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Lãi phẳng   | Gốc dự kiến P/n, lãi P × r                                                                     |
| Gốc đều     | Gốc dự kiến P/n, lãi số dư đầu kỳ × r                                                          |
| Trả góp đều | Khoản trả A = P × r / (1 − (1 + r)^−n). Gốc bằng A trừ lãi trên số dư đầu kỳ. Lãi 0% dùng P/n. |

Decimal.js giữ 48 chữ số trong phép tính trung gian. Làm tròn half-up đến đồng cho tiền lãi và khoản gốc hoặc khoản trả dự kiến. Gốc mỗi kỳ giới hạn bởi số dư. Kỳ cuối trả hết gốc còn lại. Tổng gốc phải khớp P, số dư cuối bằng 0 và tổng lịch bằng tổng gốc và lãi.

Ngày trả đầu tiên do người dùng chọn. Các kỳ sau lấy ngày tương ứng trong tháng, rút về cuối tháng khi cần, rồi tiếp tục dùng ngày neo ban đầu. Tính bằng ngày lịch UTC để giữ chính xác date-only. UI dùng múi giờ Asia/Ho_Chi_Minh.

Phí là một lần, tách khỏi lịch trả hằng tháng. Phí công bố bằng 0 và phí chưa biết (`null`) là hai trường hợp khác nhau. Tổng có phí và chênh lệch giữa hai tổng chỉ xác định khi biết đầy đủ phí.

DTI = trả nợ hiện tại / thu nhập × 100%. Ngân sách trả thêm = max(0, min(35% thu nhập − trả nợ hiện tại, thu nhập − chi phí sinh hoạt − trả nợ hiện tại)). 35% là giả định có ghi rõ của kịch bản minh họa. Kết quả không xác định khả năng được phê duyệt vay.

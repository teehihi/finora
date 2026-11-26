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

## Mô phỏng điều khoản của người dùng

Từ màn Khám phá hoặc chi tiết điều kiện công bố, người dùng có thể mở mô phỏng riêng. Màn nhập không sao chép lãi suất, hạn mức hay điều kiện từ danh mục công bố. Người dùng nhập số tiền, kỳ hạn, lãi suất danh nghĩa **mỗi năm**, ngày trả đầu, phương pháp và phí một lần nếu biết. Phí để trống được giữ là `null`; chỉ nhập `0` nếu đã xác nhận tổng phí bằng không. Mô hình không suy ra phí bảo hiểm, phí phạt, tất toán sớm hay lãi suất thả nổi. Nếu đã xác nhận phí bảo hiểm một lần, có thể tính chung vào tổng phí đã nhập, không nhập lần nữa vào tiền vay.

Thông tin nhập riêng chỉ được dùng để tính trên thiết bị đến khi người dùng xác nhận lưu. Endpoint xác thực `POST /api/simulations/custom` kiểm tra điều khoản và tính lại ở máy chủ bằng cùng engine, lưu riêng theo chủ tài khoản và khóa yêu cầu. Bản lưu mang nguồn giả định của người dùng, không liên kết sản phẩm công bố hoặc sản phẩm mẫu, và không tự theo dõi như khoản vay thật. Các snapshot đã lưu trước đó không đổi.

So sánh hai sản phẩm **mẫu** dùng khoảng giao của số tiền và kỳ hạn, cùng ngày trả đầu, lấy lãi suất thấp nhất có trong _từng mẫu_ và giữ đúng phương pháp/phí của mẫu đó. Không tính nếu khoảng giao không tồn tại. Khi ít nhất một bên chưa biết phí, không xếp hạng tổng tiền gồm phí. Điều kiện công bố của tổ chức cho vay vẫn được đối chiếu riêng, không dùng lãi suất quảng cáo để mô phỏng hoặc xếp hạng.

Các kiểm thử bổ sung bao gồm đối chiếu tổng gốc–lãi–phí tại lãi suất 0%, giới hạn kỳ hạn và số tiền, mốc ngày qua năm/tháng Hai, vùng làm tròn khi kỳ cuối lớn hơn, và ngân sách ước tính không vượt dòng tiền còn lại. Màn lịch làm rõ nếu kỳ cuối theo mô hình lớn hơn kỳ đầu đáng kể; phép tính cơ sở vẫn giữ nguyên.

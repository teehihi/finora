# 04 · Luồng và đường khôi phục

```mermaid
flowchart TD
  W["Entry: welcome hoặc quay lại"] --> G{"Đã đăng nhập?"}
  G -- Chưa --> A["Email / provider sẵn sàng"]
  A --> O["OTP"]
  O -- Sai hoặc hết hạn --> R["Giữ email, thử lại / gửi mã mới"]
  R --> O
  A -- Chưa muốn đăng nhập --> T["Ví dụ công khai"]
  T --> A
  O -- Xác nhận --> H["Trang chủ"]
  G -- Có phiên --> H
  H -- Thiếu dữ kiện --> P["Hồ sơ tài chính"]
  P -- Hủy --> H
  P -- Lưu hợp lệ --> H
  H --> F["Finora AI"]
  F -- Thiếu thông tin --> Q["Hỏi từng giả định còn thiếu"]
  Q --> F
  F -- Lỗi --> E["Giữ nội dung, gửi lại hoặc mô phỏng tay"]
  E --> F
  H --> X["Khám phá"]
  X --> D["Chi tiết: điều kiện và nguồn"]
  D --> C["So sánh A/B cùng số tiền và kỳ hạn"]
  C -- Thiếu số liệu --> D
  C --> S["Mô phỏng theo điều khoản tự nhập"]
  H --> S
  F --> S
  S -- Thiếu phí --> I["Hiển thị chưa biết, không đặt 0"]
  I --> S
  S --> K{"Xác nhận lưu bản dự tính?"}
  K -- Hủy --> S
  K -- Lưu --> L["Đã lưu, chưa phải khoản vay"]
  F --> U["Thêm tài liệu"]
  U -- Không hỗ trợ --> M["Nhập tay hoặc thử tài liệu khác"]
  M --> V["Rà soát điều khoản"]
  U --> V
  V -- Hủy --> F
  V -- Xác nhận điều khoản --> S
  L --> B{"Xác nhận khoản vay thực?"}
  B -- Không --> L
  B -- Có --> N["Đang theo dõi"]
  N --> J["Kỳ sắp đến / ngày trả"]
  H --> J
  J --> Y{"Xác nhận đã trả?"}
  Y -- Hủy --> J
  Y -- Có --> Z["Đã ghi nhận thủ công"]
```

| Tác vụ                        | Điểm ra thành công                              | Quay lại / lỗi                                          |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| OTP và onboarding             | Vào Home, có đường bỏ qua khi chưa sẵn sàng     | Sửa email, thử lại, giữ dữ kiện đã nhập                 |
| Home → hồ sơ                  | Tính được khả năng trả từ hồ sơ đã lưu          | Hồ sơ chưa đủ không hiển thị số 0 như kết quả           |
| AI                            | Có câu trả lời có giả định và hành động         | Giữ bản nháp khi lỗi; không tự lưu hay tạo nghĩa vụ     |
| Khám phá → so sánh → mô phỏng | So trên cùng cơ sở, nhập điều kiện thật khi cần | Thiếu phí hiện chưa biết; nguồn không đổi thành đề nghị |
| Tài liệu                      | Người dùng rà soát và xác nhận điều khoản       | Không hỗ trợ → nhập tay; không tự suy đoán              |
| Lưu → theo dõi → trả          | Ba trạng thái khác nhau được gọi rõ tên         | Hủy không ghi dữ liệu; lỗi ghi không báo thành công     |
| Quay lại                      | Hiểu kỳ tiếp theo hoặc lý do chưa có            | Không có nghĩa vụ → mở bản đã lưu, không tạo nợ giả     |

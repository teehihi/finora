# 05 · Design system: mở rộng hệ thống hiện có

Nguồn thật: [tokens](../../packages/design-tokens/src/index.ts),
[UI primitives](../../packages/ui/src/), [Signature](../../apps/app/src/components/signature.tsx).
Bảng dưới là quy tắc áp dụng, không phải hệ token thứ hai. Màu của HTML
concept là mô tả thẩm mỹ, không phải mã màu tài sản production.

| Vai trò                       | Cách dùng production                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Canvas, surface, border, text | `background`, `surface`, `border`, `foreground`/`muted`; phân lớp bằng bố cục trước khi dùng viền                                         |
| Forest, điểm nhấn, ngữ nghĩa  | `forest`, `onForest`, `onForestMuted`, Signature lime cho điểm cần nhấn; `warning`/`error` phải kèm nhãn                                  |
| Type scale                    | Geist 400/500/700; hệ Heading/Text. Hero 34–46 cho số chính; 20–26 cho h2; 12–16 cho nhãn, body. Tránh giữ một dòng ở font lớn            |
| Khoảng cách, grid             | Nhịp 4/8/12/16/24, gutter 16–20 ở mobile; rail và split bằng breakpoint đang có. Chiều rộng tối đa theo Page                              |
| Góc và độ nổi                 | Chip/icon < panel < hero. Viền nhẹ ở nội dung cần ranh giới; tránh đổ bóng cửa sổ chồng nhau                                              |
| Đồ họa                        | Lucide cùng độ nét, plates Signature; đường lá không chứa dữ liệu, Fin đúng tỷ lệ ở auth/AI hoặc hướng dẫn                                |
| Motion và platform            | Dùng thời lượng token cho điều hướng; giữ lựa chọn reduced motion, safe area và bàn phím của dock; dùng focus trên web                    |
| Dữ liệu                       | Nhãn và số ở cùng nhóm; cùng đơn vị/cơ sở, zero-baseline cho cột so độ lớn; bảng/text làm cách đọc khác, không ngụ ý đầy đủ khi thiếu phí |

| Thành phần                  | Đường dẫn / lựa chọn                                         | Biến thể cần kiểm                                          |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Header/navigation           | Page/Header/Back và DockChrome; không thay dock              | mặc định, active, focus, safe area, rail thu gọn, keyboard |
| Hành động, shortcut         | Action/Button và SignatureIcon                               | pressed/focus/disabled/loading; cùng nhãn nhìn và đọc      |
| Tóm tắt, product entry      | HomeCapacity, MarketPanel, LoanProductCard                   | chưa có dữ liệu, đang tải, lỗi, nguồn/đơn vị               |
| Input/slider/search/filters | Input và SearchInput, AmountField, SegmentedControl, Choices | focus, keyboard, lỗi và selected; số format theo locale    |
| Dialog/bottom sheet         | Dialog/BottomSheet và Feedback                               | xác nhận/hủy/đang lưu, lỗi không có success giả            |
| AI và biểu đồ               | intelligence blocks, chart Simulator                         | giữ ngữ cảnh, trường đã biết/chưa biết, trạng thái loading |
| Ledger, trạng thái chung    | DuePanel, Data, EmptyState, Progress                         | upcoming/past due/confirmed; không dùng màu duy nhất       |

Checklist: phone 360/390/430; tablet 768; web 1024/1440. Nút chính hướng đến
48 logical units nếu layout cho phép. Phân biệt xuất bundle và chạy native.

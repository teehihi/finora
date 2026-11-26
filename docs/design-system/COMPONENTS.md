# Thành phần giao diện

`@finora/ui` dùng React Native cho cả app native và web. Chọn thành phần theo vai trò:

- **Trang và nhóm nội dung:** `Page` hỗ trợ nhãn mục nhỏ tùy chọn và giới hạn chiều rộng; `SectionHeader`, `Heading` và `Eyebrow` phân bậc chữ. Dùng đường phân cách/rhythm trước khi bọc toàn bộ nội dung vào card.
- **Bề mặt:** `Surface` có ba vai trò: paper, grouped, forest. `Card` dành cho khối có biên giới và chức năng rõ, không dùng như wrapper mặc định. Empty state có hành động gợi ý; lỗi có thông báo và nút thử lại.
- **Điều khiển:** Action, Button (text / outline / soft / primary / onForest), IconButton, Field, CurrencyInput, SearchInput, Select, Checkbox, Choices và Switch giữ focus, hit area, label và trạng thái selected / pressed / disabled / loading.
- **Dữ liệu tài chính:** `FinancialAmount`, `FinancialMetric`, `SourceAttribution` và `RiskIndicator` giữ nguồn, ngữ cảnh và nhãn giá trị. Biểu đồ của phần trả nợ có bản số liệu văn bản tương đương.
- **Trợ giúp:** Dialog, BottomSheet, Progress, Skeleton, LoadingState, EmptyState, ErrorState và Toast hỗ trợ trạng thái có thật, không thay bằng số hoặc nội dung mẫu giả người dùng.

Trang phát triển `/showcase` hiển thị bảng màu, phân cấp typography, input tiền, lựa chọn, trạng thái nút và dialog. Trang không dành cho người dùng production.

## Điều hướng và chất liệu

Mobile dock là **bề mặt kính duy nhất**. iOS hỗ trợ dùng `@callstack/liquid-glass`; iOS cũ dùng Expo Blur; Android dùng Expo Blur lấy nền từ nội dung bên dưới. Web dùng nền tĩnh, dấu chọn rõ. Tab đang chọn vẫn có thể kéo ngang để đổi mục; nhấn từng mục là cách tương đương. Tôn trọng Reduce Motion và chừa chỗ cho composer khi bàn phím mở. Callstack Liquid Glass yêu cầu development build native, không chạy qua Expo Go.

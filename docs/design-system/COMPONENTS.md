# Thành phần

`@finora/ui` cung cấp Text, Heading, Action, Button, IconButton, trường văn bản, số và tiền, Select, Checkbox, RadioGroup, Switch, Badge, Card, Divider, Avatar, Progress, Skeleton, các trạng thái tải/rỗng/lỗi, Toast, Dialog, BottomSheet, Tabs, SegmentedControl, SearchInput, FinancialAmount, FinancialMetric, ChatMessage, ChatComposer, RiskIndicator và SourceAttribution.

LoanProductCard ở feature catalog kết hợp primitive, thông tin nguồn và route mô phỏng. Breakdown kết hợp principal/interest chart bằng react-native-svg với số liệu văn bản đầy đủ. Rendering dùng các primitive chung của React Native và React Native Web. Nhãn điều khiển, trạng thái chọn, focus bàn phím, pressed, hover, disabled và loading được quản lý ở primitive.

Màn hình phát triển `/showcase` có bảng màu, font, input lựa chọn, trạng thái nút, dialog và ví dụ số tiền. Các màn hình thật cho thấy cách áp dụng source, lỗi tải và breakdown.

Thanh điều hướng mobile là bề mặt kính duy nhất trong app shell để giữ glass nhẹ và có công năng. iOS 26+ dùng `@callstack/liquid-glass`; iOS cũ dùng Expo Blur; Android dùng Expo Blur và target riêng để làm mờ nội dung cuộn bên dưới. Web và rail/sidebar giữ nền đặc để ưu tiên độ tương phản. Callstack Liquid Glass cần development build native, không hoạt động trong Expo Go.

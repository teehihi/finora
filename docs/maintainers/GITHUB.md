# Duy trì repository GitHub

## Phần About

- **Description:** `FINORA is a Vietnamese loan assistant for comparing borrowing costs, simulating repayment, reviewing loan documents, and tracking installments.`
- **Topics:** `fintech`, `personal-finance`, `loan-comparison`, `loan-management`, `react-native`, `expo`, `nestjs`, `postgresql`, `prisma`, `typescript`.
- **Website:** Chỉ điền URL demo HTTPS sau khi xác nhận mở được ở cửa sổ ẩn danh. Không dùng localhost, link preview có hạn hoặc link cần quyền riêng. Có thể dùng `/showcase` trên host của demo nếu route đó đã được triển khai và mở được.
- **License:** Hiện chưa công bố giấy phép cấp repo. [Tình trạng giấy phép và tài sản](LICENSING.md).

## Trước khi bật ruleset

Đây là cấu hình đề xuất, không phải cấu hình đã áp dụng:

1. Chỉ áp dụng cho `main`: yêu cầu PR, CI `local-foundation` xanh và xử lý hết trao đổi review. Chặn force-push và xóa nhánh.
2. Xác nhận check `local-foundation` đã xuất hiện ở PR thử trước khi chọn làm check bắt buộc. Nếu nhóm có reviewer độc lập, yêu cầu ít nhất một phê duyệt. Người viết PR không tự phê duyệt PR của mình.
3. Khi có đầu mối xử lý, cân nhắc bật báo cáo lỗ hổng riêng trong tab Security. Không bật nếu chưa có người chịu trách nhiệm tiếp nhận.

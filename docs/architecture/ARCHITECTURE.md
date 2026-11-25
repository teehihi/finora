# Kiến trúc chạy cục bộ

Expo Router quản lý stack, deep link và màn hình công khai. Nhóm route `(workspace)` kiểm tra phiên trước khi hiển thị dữ liệu. TanStack Query quản lý dữ liệu API và dùng ID người dùng cho các khóa truy vấn riêng tư. Zustand giữ ngôn ngữ và giao diện hiện tại. Better Auth quản lý đăng nhập và phiên. React Hook Form và Zod kiểm tra giá trị nhập.

NestJS chạy trên host. Express gắn handler Better Auth trước body parser. `SessionGuard` tra phiên từ request cho mọi endpoint nghiệp vụ. `PlanningService` kiểm tra điều kiện sản phẩm, gọi bộ tính và lưu dữ liệu qua Prisma. App dùng JSON REST cho nghiệp vụ và POST SSE cho trợ lý. Mỗi request có ID để tra log. Log chỉ ghi metadata, method, trạng thái và thời gian. Zod kiểm tra cấu hình khi khởi động, kiểm tra payload tại các endpoint. CORS nhận danh sách origin cụ thể.

Bộ tính chỉ phụ thuộc Decimal.js và contract TypeScript/Zod. UI dùng token, font và bộ dịch dùng chung. Không có đường import từ client sang Prisma, file upload hoặc secret. Mock provider chỉ nhận ngữ cảnh đã tối giản.

API chính là `/health`, `/api/auth/*`, `/api/account`, `/api/profile`, `/api/preferences`, `/api/catalog`, `/api/simulations/preview`, `/api/simulations`, `/api/assistant/history`, `/api/assistant/stream` và `/api/documents`. Các chi tiết của một mô phỏng có đường dẫn `/api/simulations/:id`. Swagger nằm ở `/docs`.

Storage dùng interface `StorageProvider`. Endpoint upload chỉ nhận fixture UTF-8 `text/plain` tối đa 64 KiB với header `X-Finora-Synthetic: 1`. File dùng tên UUID do server cấp trong thư mục riêng. GET kiểm tra ownership ở database trước khi đọc. API không nhận tên file hoặc đường dẫn từ client. Trong giai đoạn này chỉ đưa nội dung tổng hợp vào hệ thống.

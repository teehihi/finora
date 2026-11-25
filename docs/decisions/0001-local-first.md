# ADR 001 · Local-first, cloud-ready

**Đã chọn** một modular monolith và một ứng dụng Expo dùng chung. PostgreSQL 17 chạy trong Compose để setup giống nhau giữa máy phát triển và CI. Expo và NestJS chạy trên host để dùng hot reload, simulator và trình gỡ lỗi.

Expo SDK 58 khóa React 19.3.0, React Native 0.88.1 và bộ phiên bản native do Expo công bố, tương thích Expo Go SDK 58 trên iPhone. Node 22.20 hiện có đáp ứng toolchain này. Workspace dùng hoisted linker. Prisma 6.19 dùng luồng schema/client/migrations ổn định trên PostgreSQL chuẩn. Better Auth và plugin Expo khóa cùng phiên bản. [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/) · [Expo monorepos](https://docs.expo.dev/guides/monorepos/) · [Better Auth Expo](https://better-auth.com/docs/integrations/expo) · [SVG trên Expo](https://docs.expo.dev/versions/latest/sdk/svg/)

**Đánh đổi.** Shared domain packages biên dịch ra JS và declarations trước khi chạy app. Turbo đảm bảo thứ tự. Sau khi sửa package domain trong một dev session, build lại package và phụ thuộc tương ứng. React Native UI dùng mã nguồn trực tiếp để Metro cập nhật khi sửa.

**Mốc production tương lai.** Di chuyển PostgreSQL sang Neon với URL pooled cho API và kết nối trực tiếp cho migration. Chạy migration cùng lịch sử đã commit trên môi trường tách biệt. Đưa NestJS lên Render, xuất Expo Web lên Vercel với SPA fallback, chuẩn bị bản native qua EAS. Thay LocalStorageProvider bằng private S3-compatible storage với URL ký ngắn hạn sau kiểm tra quyền. Thay mock bằng adapter Bedrock và quản lý secret phía server. Trước khi mở production, bổ sung kiểm tra HTTPS và origins thật, email xác minh/khôi phục, khả năng thu hồi session, backup/restore, giới hạn nhiều instance và quan sát vận hành. Local env schema hiện chặn NODE_ENV=production.

# PostgreSQL và Prisma

Compose dùng image chính thức `postgres:17-alpine`, health check và named volume `postgres_data`. Database chỉ lắng nghe trên loopback của host. API dùng một Prisma Client cho mỗi tiến trình. URL nằm ở API, dùng cùng schema và lịch sử migration cho một PostgreSQL khác.

User, Session, Account và Verification do Better Auth sử dụng. Session token và email có ràng buộc unique. FinancialProfile là một bản ghi cho mỗi user, lưu VND bằng DECIMAL(15,0). LoanProduct chứa tổ chức hư cấu, điều kiện và dấu nguồn mẫu. LoanSimulation liên kết owner và sản phẩm, lưu input, kết quả và snapshot sản phẩm bằng JSONB. ID yêu cầu có unique theo owner để chống lưu trùng khi thử lại. Các chỉ mục theo owner và thời gian phục vụ danh sách cá nhân. ChatTurn giữ câu hỏi, lời giải thích, tham chiếu và số liệu tối giản. UploadedDocument lưu quyền sở hữu fixture.

`pnpm db:migrate` áp dụng SQL đã commit. Khi chủ ý thay schema trong quá trình phát triển, dùng từ root `pnpm --filter @finora/database exec node scripts/db.mjs migrate dev --name ten_thay_doi`. Review SQL trong thư mục prisma/migrations trước khi commit. Chạy `pnpm db:generate` sau đó. Seed dùng transaction và upsert theo ID ổn định. Reset chỉ dùng cho database thử nghiệm với xác nhận tên đích.

Khôi phục bản đã lưu trả về dữ liệu snapshot. Thay đổi danh mục hoặc công thức sau này không làm tính lại kết quả lịch sử.

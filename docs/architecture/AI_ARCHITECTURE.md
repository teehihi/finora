# Trợ lý tài chính cục bộ

`AIProvider.stream` trả về AsyncIterable, nhận câu hỏi, facts đã giới hạn và AbortSignal. `AI_PROVIDER` là injection token. Implementation hiện tại là `MockProvider`. Cấu hình hiện tại chấp nhận `AI_PROVIDER=mock`; một tên chưa hỗ trợ sẽ gây lỗi startup. Không cần credential hoặc kết nối đến mô hình.

Backend chọn công cụ, kiểm tra schema và kiểm tra ownership trước khi lấy facts. `financialTools` cung cấp mô phỏng, so sánh phương án, ước tính ngân sách và giải thích snapshot. Client không thể gửi tên công cụ tùy ý để thực thi. Trợ lý lấy số liệu từ lịch đã tính, không tái tính lịch sử bằng mô hình. Prompt tự do và tệp upload không có quyền thay đổi context hay gọi database.

POST SSE gửi các event JSON `meta`, `delta`, `done` hoặc `error`. Timeout 20 giây và ngắt kết nối hủy stream. Lịch sử chỉ ghi khi hoàn tất. ID yêu cầu ngăn lưu lặp một lượt chat. UI hỗ trợ dừng, thử lại, chọn mô phỏng và xem nguồn. Mock không tiêu thụ token của nhà cung cấp. Chưa có inference bên ngoài hoặc fallback ngầm.

Khi có phê duyệt hạ tầng, có thể gắn Bedrock ConverseStream phía server, sau đó cân nhắc Gemini/OpenAI qua cùng interface. Khi tích hợp, bổ sung model ID, usage thực, chính sách redaction và fallback có nhãn. Giữ toàn bộ phép tính trong bộ máy tài chính.

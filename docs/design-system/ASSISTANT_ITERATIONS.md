# Finora AI visual iterations

All images below are rendered browser states against the local Expo build and PostgreSQL/NestJS sandbox, not edited mockups. The visible assistant runs the repository's **local mock** provider. The example uses a synthetic ₫12 million, twelve-month simulation whose fee is not known.

## 1. Establish the conversation and the evidence

[390px, empty](screenshots/iterations/assistant/1-mobile-empty.webp) · [390px, picker](screenshots/iterations/assistant/1-mobile-context.webp) · [390px, response](screenshots/iterations/assistant/1-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/1-desktop-answer.webp)

The restrained prompt list, visible mock label, bottom composer and in-thread receipt made the core path legible. The small viewport showed the bottom of an intro heading as auto-follow started. The web textarea was taller than necessary, and the right-hand rail repeated the same computed figures already in the answered message.

## 2. Reduce repeats and stabilize the reading edge

[390px, response](screenshots/iterations/assistant/2-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/2-desktop-answer.webp)

Once a conversation exists, the narrow layout keeps a compact, intact heading above the scroll area. The visible input measured 44px high rather than 64px. The desktop rail now shows the selected plan inputs instead of a second copy of the response. The reload check identified another weakness: the answer survived, but a manually selected reference did not.

## 3. Keep context while moving around

[390px, response](screenshots/iterations/assistant/3-mobile-answer.webp) · [1440px, response](screenshots/iterations/assistant/3-desktop-answer.webp) · [360px, dark mode](screenshots/iterations/assistant/3-mobile-dark-360.webp)

The page retains the selected simulation through the existing route's opaque ID, and the server still resolves it only within the signed-in account. The picker distinguishes plans by amount, term and date. The receipt names its source before the values and leaves unreported fees unknown. At 360px in dark mode the heading and mock marker wrap without horizontal overflow; the composer remains separate from mobile navigation. At 390px the visible composer measured 44px high.

## 4. Nền Hồ Gươm cho Finora AI

Trên `/assistant` và `/intelligence`, người dùng có thể nhập câu hỏi hoặc chọn một trong ba gợi ý, sửa nội dung rồi gửi. Bản thử dùng ảnh PNG 1086 × 1448 do người dùng cung cấp. Tiêu đề dùng Source Serif 4, nội dung và điều khiển dùng Geist. Khi có hội thoại, nền nhạt đi để người dùng đọc số tiền, giả định và kỳ hạn.

Đối chiếu wireframe và bản dựng ở 390 × 844 cho thấy ô nhập che chân tháp. Bản trong app nâng ảnh theo chiều cao dock, làm dịu tán lá sau tiêu đề và canh vùng ảnh theo tỷ lệ gốc khi xoay hoặc đổi kích thước. [Bản thiết kế trước triển khai](screenshots/iterations/assistant-lake/prototype.webp) · [Web 390 px](screenshots/iterations/assistant-lake/web-phone.webp) · [Web tối](screenshots/iterations/assistant-lake/web-dark.webp) · [Web desktop](screenshots/iterations/assistant-lake/web-desktop.webp).

Chrome đã chạy với fixture tổng hợp trên API local ở 360, 390, 768 và 1440 px. Đã thử chọn gợi ý, sửa câu hỏi, giữ focus, gửi, khôi phục sau lỗi mạng và lưu mô phỏng qua E2E. Chờ owner duyệt bố cục.

Trên iPhone 17 Pro Simulator (iOS 26.4), đã kiểm tra safe area, dấu tiếng Việt, chọn gợi ý, gửi, mở lại hội thoại và mở/đóng bảng công cụ. Sau khi bỏ bóng đổ lúc focus, ô nhập giữ con trỏ và nhận văn bản. Chưa xác nhận bố cục với bàn phím mềm đang mở, Android native và thiết bị vật lý. [Màn bắt đầu trên iOS](screenshots/iterations/assistant-lake/ios-phone.webp) · [Câu trả lời cục bộ trên iOS](screenshots/iterations/assistant-lake/ios-answer.webp).

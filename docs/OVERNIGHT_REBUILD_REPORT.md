# FINORA · Bàn giao bản native fintech

- **Nền:** GitHub `main` `efbc2275d0dee05c6c66f31a528fccdb6eb7b412`, bản merge PR #16. GitHub compare không có diff từ head PR #16 đến merge; checkout local sạch `5bd6ea6b5a5ab136a02d89b702315cb3d7b7e831` có đúng tree `8bbeb4d98b5ecdd62fa4c02c4eee5cc26ccce15a` đã publish cho PR #16.
- **Nhánh:** `feat/finora-native-fintech-rebuild`. Nguồn ứng dụng kiểm thử ghi ở phần QA. Commit bàn giao cuối xem ngay trên nhánh/PR.
- Không deploy, không merge vào `main`, không reset dữ liệu người dùng. Không nâng Expo hay thay auth, engine, Prisma hoặc dock.

## Bản app đã thay đổi gì?

| Luồng           | Thay đổi chạy trong ứng dụng thật                                                                                                                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home            | Đưa ngân sách ước tính, kỳ trả kế tiếp và Fin lên trước hành động phụ. Tách tìm khoản vay/mô phỏng với bộ công cụ phụ. Sheet biến động chạy trên hồ sơ hiện tại, cho thử giảm thu nhập 20%, tăng chi phí 20% hoặc cả hai mà không ghi dữ liệu.                                                           |
| Finora AI       | Bắt đầu từ ví dụ có thể sửa, không gửi tự động. Giữ cả hai cú sốc thu nhập/chi phí giữa lượt hỏi tiếp theo; làm rõ áp lực kỳ cao nhất và tổng giá. Điều khoản mâu thuẫn bị chặn thay vì lấy điều khoản cũ ra tính. Giữ nguồn, consent và chế độ local.                                                   |
| Mô phỏng và lưu | Nhập VND được phân nhóm khi chưa sửa; focus/dán số không làm nối số cũ với số mới. Kỳ đầu và tổng gốc+lãi cập nhật trên mobile và nhắc chưa tính phí một lần. Lãi, phí và ngày trả có phân cấp; vẫn cần lưu rõ ràng. So sánh tách áp lực mỗi kỳ khỏi tổng chi phí và chỉ xếp theo tổng khi đủ điều kiện. |
| Explore         | Phân biệt điều kiện công bố, ví dụ mẫu và điều khoản cá nhân. Chọn 2 mục được giữ khi lọc; có thứ tự và nút bỏ chọn từng mục. Giải thích thông tin phí/đơn vị lãi còn thiếu hoặc khó so, kèm nguồn và ngày rà soát.                                                                                      |
| Tài liệu        | Bản ghi riêng phân biệt trích xuất với nhập tay; hồ sơ hình không đọc được vẫn sửa thủ công. Chuyển điều khoản đã rà soát thành bản nháp có thể sửa trên Simulator. Bản nháp đúng chủ, tạm thời, không đưa giá trị/hợp đồng vào URL và không tự lưu/theo dõi.                                            |
| Sổ trả nợ       | Kỳ tới và tiến độ đi trước danh sách. Phân biệt đến hạn, quá hạn và đã ghi nhận; bộ lọc thao tác trên đúng lịch lưu. Xác nhận, thử lại nếu lỗi, hoàn tác. Đây là đánh dấu thủ công, không phải giao dịch ngân hàng.                                                                                      |
| Đăng nhập       | Biểu mẫu phân biệt nhập email, xác minh OTP, khôi phục và trả về đích ban đầu. Chỉ bảo toàn các tab được phép của Khám phá/Khoản vay; không mang prompt hay điều khoản vào URL hồi đáp. Password cũ còn dùng; không bật OAuth giả.                                                                       |

**Lưu kết quả biến động:** Finora tạo một bản riêng chỉ sau xác nhận. Bản cũ và hồ sơ gốc không bị sửa, lịch vẫn do engine tính. Dữ liệu thêm nằm trong JSON đã lưu (trường tùy chọn), không migration. Owner guard hiện có vẫn áp dụng.

**Tính toán:** Công thức lãi, ngày, tiền trả và fee-null của engine giữ nguyên. Mô phỏng Home chỉ là tiền còn lại trước khoản vay mới, không phải hạn mức hay khuyến nghị. So sánh hiển thị cùng cơ sở và không thay phí chưa biết bằng 0; số đọc được từ hợp đồng không tự biến thành khoản vay.

## Những mẫu đã dùng, không sao chép

- [MoMo Trung tâm Tài chính](https://www.momo.vn/tai-chinh) và [Techcombank Mobile](https://techcombank.com/thong-tin/thong-bao/techcombank-ra-mat-giao-dien-hoan-toan-moi-nang-tam-trai-nghiem-tai-chinh-so): gom khoản tới hạn, sắp hành động theo tần suất và đảm bảo thao tác một tay.
- [Cake](https://cake.vn/tin-tuc/tai-chinh/cac-phuong-thuc-thanh-toan-khoan-vay-tai-ngan-hang-so-Cake) và [Nubank](https://nubank.com.br/nu/emprestimos/pessoal): tách lúc xem điều khoản, ước tính và xác nhận. FINORA không bắt chước giao dịch ngân hàng.
- [Revolut](https://help.revolut.com/help/accounts/budget-and-analytics/how-can-i-see-my-spending-and-income-analytics/): đưa số tổng cạnh bối cảnh, rồi mới sang phân tích sâu.
- Giữ dock, chữ tiếng Việt và vùng an toàn theo [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets), [Entering data](https://developer.apple.com/design/human-interface-guidelines/entering-data) và [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility). Không nhập logo, icon hoặc thiết kế đối thủ.

## QA và bằng chứng

- Source thực thi: `05f13f56f75a87bdabc740f0e8be6fe6cd543a59`. Node 22.20.0, pnpm 10.32.1. Kiểm tra baseline ownership và dock: 2/2; chụp baseline thành công.
- Prettier, ESLint, TypeScript, PR rule test, unit/API và Expo web build đều đạt. Bộ unit: 31 engine, 64 API, 66 app, 5 kiểm tra network/auth.
- **Chromium E2E lần cuối: 33/33 đạt, không skip.** Chromium 158 chạy Expo Web + NestJS với PostgreSQL 17.8 cô lập và Mailpit 1.34.0. Không dùng cơ sở dữ liệu tài khoản người dùng.
- Một vòng tích hợp phát hiện modal so sánh còn mở sau chuyển màn, và focus đổi format trong lúc dán VND khiến số cũ nối vào. Đã sửa và thêm assert. Ca lưu riêng còn được cập nhật để xác minh đúng thông điệp xác nhận biến động và số liệu xuất hiện ở bản đã lưu. Cả ba ca qua khi chạy lại toàn bộ.
- Export Hermes iOS/Android đạt trên mã đã kiểm. Chưa chạy trên runtime native.
- Kiểm tra ảnh thật qua hai vòng tinh chỉnh Home, Finora AI và Simulator; xem rõ spotlight Fin, biểu mẫu, cảnh báo phí, nút bấm và sổ hoạt động; lưu cả dark/light và nhiều chiều rộng.

Ảnh trong gói review: `before/` và `after/` là Chromium + Expo Web với cùng fixture tổng hợp. Mở `review.html` để đối chiếu nhanh. Tên ảnh ghi màn, theme, chiều rộng px: thử 390/430/768/1440 (và 360/1024). Kết luận về bố cục web không thay kết luận native.

## Chưa xác minh / ưu tiên tiếp theo

- Chưa chạy iOS Simulator, Android Emulator, thiết bị thật, assistive tech hoặc haptics; giữ nguyên dock và fallback. Ưu tiên kiểm trên thiết bị: safe area, keyboard, large text, drag/tap và VoiceOver/TalkBack.
- Browser E2E dùng Finora địa phương và Mailpit, không phải OpenAI thật hay nhà cung cấp OAuth thật. Không xác minh OCR tiếng Việt với hợp đồng thật; đã dùng fixture PDF và đường phục hồi hình tổng hợp.
- Tiến hành owner UAT 4 luồng: hỏi Fin rồi so sánh/sửa điều khoản; stress và lưu riêng; tài liệu → sửa → mô phỏng; đánh dấu trả/hoàn tác.
- Không có phát hành production, giao dịch tài chính hay chấm điểm tín dụng.

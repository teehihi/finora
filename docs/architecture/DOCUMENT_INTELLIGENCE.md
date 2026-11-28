# Đọc đề nghị vay riêng tư

Mở **Đọc đề nghị vay** từ Finora AI, chọn PDF/JPEG/PNG hoặc dùng đề nghị mẫu tổng hợp. Kiểm tra các dòng trích dẫn, bổ sung điều khoản chưa đọc được hoặc sửa tiền gốc/kỳ hạn/lãi suất/cách tính/ngày đầu, rồi **Xác nhận và tính lại**. Lỗi hiển thị tại thông số liên quan; ngày kỳ đầu hỗ trợ định dạng YYYY-MM-DD và DD/MM/YYYY. Bản tính xuất hiện riêng khỏi biểu mẫu đã xác nhận, có thể sửa để tính lại. Có thể lưu kết quả vào **Khoản vay** để mở lịch trả nợ sau. Không đưa hợp đồng thật vào luồng demo.

## Trích xuất cục bộ

- PDF có văn bản: cài Poppler (`pdftotext`, `pdftoppm`) trên máy chạy API, ví dụ `brew install poppler` trên macOS hoặc `sudo apt install poppler-utils` trên Debian. Finora ưu tiên văn bản native trong 20 trang đầu. Trang không có đủ văn bản được render bằng `pdftoppm` rồi đọc OCR nếu đã bật. API trả ảnh xem từng trang qua route có kiểm tra chủ sở hữu.
- JPEG/PNG và PDF quét: cài Tesseract cùng dữ liệu ngôn ngữ Việt/Anh, đặt `DOCUMENT_OCR_LANGS=vie+eng` (hỗ trợ `eng`, `vie`, `eng+vie`). `PATH` của tiến trình API phải có ba lệnh trên. Nếu dùng `TESSDATA_PREFIX` tùy chỉnh, thư mục này cần có `vie.traineddata`, `eng.traineddata` và `configs/tsv`. Không cần API key. Tài liệu không được tải lên dịch vụ OCR bên ngoài.
- Thiếu bộ đọc, OCR tắt, file mã hóa hoặc không đọc được: form nhập thủ công vẫn hoạt động và nêu rõ nguyên nhân, không điền số liệu giả.
- Bộ trích xuất nhận nhãn rõ ràng Việt/Anh cho 20 trường, giữ giá trị gốc, đơn vị, trang, dòng trích dẫn và hộp vị trí OCR. Trạng thái gồm tìm thấy, thiếu, mâu thuẫn và không hỗ trợ. “Cao” chỉ nghĩa là dòng văn bản native khớp mẫu; “cần rà soát” nghĩa là OCR. Đây không phải xác suất được hiệu chuẩn. Điều khoản mâu thuẫn, lãi suất không rõ kỳ tính, dư nợ giảm dần không nói cách trả, phí hoặc loại tiền không xác định đều để trống hoặc đưa ra để rà soát. Phí 0 khác phí chưa biết; không cộng các khoản phí riêng thành tổng phí nếu tài liệu chưa xác nhận tổng. Hợp đồng trình bày bằng bảng phức tạp có thể cần nhập lại.
- Bộ cảnh báo dùng quy tắc cục bộ và chỉ nêu phí/điều khoản có trích dẫn thực, cùng điều khoản thiếu hoặc mâu thuẫn. Không kết luận pháp lý. Người dùng có thể chọn sản phẩm công bố để so sánh giới hạn tiền vay, kỳ hạn, phương thức và các khoản phí biết rõ. Mức lãi “từ” không được xem là lãi suất cố định hoặc bằng lãi hợp đồng. Nguồn công bố và ngày xác minh được giữ trong danh mục.
- Trang nguồn và cột kết quả là hai việc khác nhau. Engine giữ nguyên công thức; giá trị phải do người dùng rà soát và xác nhận. Không dùng trích xuất làm đề nghị đăng ký vay, kết luận đủ điều kiện, lời khuyên tài chính hay thay đổi hợp đồng.
- Ngoài thông số dùng để mô phỏng, người dùng có thể sửa và xác nhận từng điều khoản khác. API chuẩn hóa đơn vị, lưu riêng `confirmedTerms` trong bản ghi thuộc chủ sở hữu và không gắn trích dẫn OCR giả vào giá trị người dùng nhập. Phần trích xuất gốc vẫn còn để đối chiếu. Các điều khoản bổ sung đã xác nhận không tự được cộng vào lịch trả nợ; chỉ bộ thông số tính toán người dùng bấm **Xác nhận và tính lại** mới đi vào engine.

## Bảo mật dữ liệu

- Tối đa 5 MiB mỗi tệp, 10 tệp mỗi tài khoản. Huỷ hộp chọn tệp trên web không tạo yêu cầu tải lên. Bộ nhớ đệm truy vấn không chứa byte tệp gốc; dữ liệu xem lại luôn đi qua phiên chủ sở hữu. MIME phải khớp header/tính toàn vẹn cấu trúc cơ bản; ảnh có giới hạn kích thước pixel. Không dùng tên tệp từ người dùng làm đường dẫn hay tên tải xuống.
- PDF/Tesseract chạy trong tiến trình cục bộ có giới hạn thời gian, đầu ra, kích thước ảnh và số tác vụ đồng thời. Render PDF dùng thư mục tạm tên cố định nội bộ, xóa sau mỗi yêu cầu; không dùng tên tệp do người dùng cấp làm đường dẫn. Giữ Poppler/Tesseract cập nhật bảo mật. Văn bản tài liệu chỉ đi qua bộ nhận dạng nhãn, không đưa vào prompt, không gửi sang AI hoặc dịch vụ ngoài. Không có action/URL được thực thi từ nội dung đã trích.
- PostgreSQL lưu dữ liệu nguyên bản và phần trích xuất dưới quyền sở hữu tài khoản. Mọi thao tác liệt kê/đọc/tải/xem trang/xóa/tính/lưu đều cần phiên và kiểm tra ID chủ sở hữu. Tệp nguyên bản chỉ gửi dạng attachment được bảo vệ, không có URL công khai. Ảnh PDF xem trước cũng đi qua route riêng của chủ sở hữu với `no-store`. Log không ghi byte tệp, nội dung trích hoặc thông số xác nhận. Cấu hình phát triển không hứa hẹn mã hóa ổ đĩa; tệp trong bản sao lưu phải tuân theo chính sách lưu giữ riêng.
- Xóa tài liệu loại bỏ byte và các trích dẫn khỏi lưu trữ hoạt động. Các bản mô phỏng đã lưu chỉ giữ thông số đã xác nhận và tham chiếu nội bộ, không giữ bản PDF/ảnh hoặc nội dung trích dẫn. Tài liệu không xuất hiện trong danh mục sản phẩm chung.

Tài liệu tham khảo: [Poppler pdftotext](https://manpages.debian.org/trixie/poppler-utils/pdftotext.1.en.html), [Tesseract CLI](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html), [Expo DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/), [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Bằng chứng kiểm thử cục bộ

Tệp thử tổng hợp và tập nhãn nằm trong `apps/api/test/fixtures`. Hai bộ đánh giá chạy riêng: trích xuất trên văn bản/biên bản OCR, và end-to-end qua Tesseract + Poppler thật với `vie+eng`. Bộ ảnh gồm PNG tiếng Việt, JPEG có nhiễu, PDF quét hai trang, bản thiếu điều khoản và bản mâu thuẫn; script tạo lại ảnh được commit. Các số liệu và giới hạn của mẫu nhỏ được ghi trong báo cáo Phase 4. Bộ kiểm thử tích hợp web dùng PostgreSQL local, fixture tổng hợp và tài khoản thử; không dùng tài liệu thật.

Ảnh thật từ Chromium:

- [Chọn tài liệu · desktop 1440 px](../design-system/screenshots/intelligence/document-intake-desktop.webp)
- [Chọn tài liệu · mobile web 390 px](../design-system/screenshots/intelligence/document-intake-mobile.webp)
- [Rà soát tài liệu · mobile web 390 px](../design-system/screenshots/intelligence/document-review-mobile.webp)
- [Ước tính sau xác nhận, phí chưa rõ · desktop 1440 px](../design-system/screenshots/intelligence/document-confirmed-desktop.webp)

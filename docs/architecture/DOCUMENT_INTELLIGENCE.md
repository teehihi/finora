# Đọc đề nghị vay riêng tư

Mở **Đọc đề nghị vay** từ Finora AI, chọn PDF/JPEG/PNG hoặc dùng đề nghị mẫu tổng hợp. Kiểm tra các dòng trích dẫn, bổ sung điều khoản chưa đọc được hoặc sửa tiền gốc/kỳ hạn/lãi suất/cách tính/ngày đầu, rồi **Xác nhận và tính lại**. Lỗi hiển thị tại thông số liên quan; ngày kỳ đầu hỗ trợ định dạng YYYY-MM-DD và DD/MM/YYYY. Bản tính xuất hiện riêng khỏi biểu mẫu đã xác nhận, có thể sửa để tính lại. Có thể lưu kết quả vào **Khoản vay** để mở lịch trả nợ sau. Không đưa hợp đồng thật vào luồng demo.

## Trích xuất cục bộ

- PDF có văn bản: cài Poppler trên máy chạy API, ví dụ `brew install poppler` trên macOS hoặc `sudo apt install poppler-utils` trên Debian. Finora đọc tối đa 20 trang đầu qua stdin, không render PDF trong trình duyệt và không thực thi nội dung bên trong.
- Ảnh JPEG/PNG: nếu muốn OCR, cài Tesseract và dữ liệu ngôn ngữ tiếng Việt/Anh, rồi đặt `DOCUMENT_OCR_LANGS=vie+eng` (cũng hỗ trợ `eng`, `vie`, `eng+vie`). Không thiết lập OAuth, API key hoặc nhà cung cấp AI. OCR ảnh hiện chạy cục bộ; PDF scan chưa được OCR tự động.
- Thiếu bộ đọc, OCR tắt, file mã hóa hoặc không đọc được: form nhập thủ công vẫn hoạt động và nêu rõ nguyên nhân, không điền số liệu giả.
- Bộ trích xuất nhận các nhãn rõ ràng Việt/Anh và giữ trang/trích dẫn ngắn. Điều khoản mâu thuẫn, lãi suất không rõ kỳ tính, dư nợ giảm dần không nói cách trả, phí hoặc loại tiền không xác định đều để trống hoặc đưa ra để rà soát. Phí 0 khác phí chưa biết; không cộng các khoản phí riêng thành tổng phí nếu tài liệu chưa xác nhận tổng. Hợp đồng trình bày bằng bảng phức tạp có thể cần nhập lại.
- Trang nguồn và cột kết quả là hai việc khác nhau. Engine giữ nguyên công thức; giá trị phải do người dùng rà soát và xác nhận. Không dùng trích xuất làm đề nghị đăng ký vay, kết luận đủ điều kiện, lời khuyên tài chính hay thay đổi hợp đồng.

## Bảo mật dữ liệu

- Tối đa 5 MiB mỗi tệp, 10 tệp mỗi tài khoản. Huỷ hộp chọn tệp trên web không tạo yêu cầu tải lên. Bộ nhớ đệm truy vấn không chứa byte tệp gốc; dữ liệu xem lại luôn đi qua phiên chủ sở hữu. MIME phải khớp header/tính toàn vẹn cấu trúc cơ bản; ảnh có giới hạn kích thước pixel. Không dùng tên tệp từ người dùng làm đường dẫn hay tên tải xuống.
- PDF/Tesseract chạy trong tiến trình cục bộ có giới hạn thời gian, đầu ra và số tác vụ đồng thời. Giữ Poppler/Tesseract cập nhật bảo mật. Văn bản tài liệu chỉ đi qua bộ nhận dạng nhãn, không đưa vào prompt, không gửi sang AI hoặc dịch vụ ngoài. Không có action/URL được thực thi từ nội dung đã trích.
- PostgreSQL lưu dữ liệu nguyên bản và phần trích xuất dưới quyền sở hữu tài khoản. Mọi thao tác liệt kê/đọc/tải/xóa/tính/lưu đều cần phiên và kiểm tra ID chủ sở hữu. Tệp nguyên bản chỉ gửi dạng attachment được bảo vệ, không có URL công khai. Trình duyệt có thể tải bản PDF nguyên gốc; ứng dụng không render PDF inline. Ảnh xem trước chỉ được nạp theo yêu cầu qua tuyến bảo vệ. Log không ghi byte tệp, nội dung trích hoặc thông số xác nhận. Cấu hình phát triển không hứa hẹn mã hóa ổ đĩa; tệp trong bản sao lưu phải tuân theo chính sách lưu giữ riêng.
- Xóa tài liệu loại bỏ byte và các trích dẫn khỏi lưu trữ hoạt động. Các bản mô phỏng đã lưu chỉ giữ thông số đã xác nhận và tham chiếu nội bộ, không giữ bản PDF/ảnh hoặc nội dung trích dẫn. Tài liệu không xuất hiện trong danh mục sản phẩm chung.

Tài liệu tham khảo: [Poppler pdftotext](https://manpages.debian.org/trixie/poppler-utils/pdftotext.1.en.html), [Tesseract CLI](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html), [Expo DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/), [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).

## Bằng chứng kiểm thử cục bộ

Playwright chạy ứng dụng Web với PostgreSQL 17 và Poppler thật: chọn PDF tổng hợp qua trình chọn tệp, xem trích dẫn theo trang, sửa tiền gốc, để trống phí chưa biết, tính lại rồi lưu lịch. Tài khoản thứ hai bị từ chối xem/tải/tính/xóa. Chủ sở hữu xóa được tệp và trích dẫn, lịch đã lưu vẫn mở được. Tesseract cục bộ đã đọc thử cùng dữ liệu tổng hợp ở PNG và JPEG với ngôn ngữ `eng`; chưa xác minh bộ ngôn ngữ Việt hoặc thiết bị iOS/Android thật trong phiên kiểm thử này.

Ảnh thật từ Chromium:

- [Chọn tài liệu · desktop 1440 px](../design-system/screenshots/intelligence/document-intake-desktop.webp)
- [Chọn tài liệu · mobile web 390 px](../design-system/screenshots/intelligence/document-intake-mobile.webp)
- [Rà soát tài liệu · mobile web 390 px](../design-system/screenshots/intelligence/document-review-mobile.webp)
- [Ước tính sau xác nhận, phí chưa rõ · desktop 1440 px](../design-system/screenshots/intelligence/document-confirmed-desktop.webp)

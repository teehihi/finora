# FINORA · Tài khoản và hồ sơ cá nhân

- Tab **Hồ sơ** mở trang tài khoản gọn: ảnh bìa FINORA nền giấy sáng với hai nét lá mảnh chạy sát mép (giảm độ sáng trong chế độ tối), giữ neo theo vùng đầu trang khi cuộn như nền Home; thẻ tên và avatar nhỏ nổi phía trên, sau đó là danh sách trắng theo nhóm trên nền xám trung tính. Bỏ lưới lối tắt và biểu mẫu dài khỏi màn này.
- Nút **Hồ sơ** trên thẻ mở trang **Hồ sơ cá nhân**. Thanh đầu trang phẳng với nút quay lại, ảnh lớn ở giữa; thông tin cá nhân và bảo mật là các khối trắng tách bằng đường nền xám. Luồng xác minh email và liên kết Google hiện có nằm trong **Bảo mật**.
- **Hồ sơ tài chính**, **Tùy chọn sử dụng** và **Quyền riêng tư** có màn riêng. Biểu mẫu, quy trình xác nhận xóa lịch sử, ngôn ngữ và chế độ sáng/tối giữ nguyên. Các nút chỉnh hồ sơ tài chính trên Home vẫn mở thẳng đúng tác vụ.
- Không thêm chỉnh tên, số điện thoại hay hạng hội viên. Không dùng ảnh hoặc thông tin cá nhân từ ảnh tham chiếu trong mã hay dữ liệu kiểm thử.
- Mỗi màn con hỗ trợ đi lùi và truy cập bằng đường dẫn nội bộ được cho phép; không đặt email hoặc dữ liệu cá nhân trong URL.

## Các mục bên dưới thẻ tài khoản

- **Mục chính:** Sức khỏe tài chính hiển thị tổng quan từ hồ sơ đã lưu, không chấm điểm tín dụng. Tài liệu của tôi và Lịch sử mô phỏng mở trực tiếp các luồng sẵn có.
- **Cài đặt:** các mục Cá nhân hóa Finora AI và Thông báo và nhắc nợ hiển thị `Chưa hỗ trợ`, không nhận dữ liệu hay bật cài đặt giả.
- **Hỗ trợ:** Trung tâm hỗ trợ dẫn đến các tính năng liên quan; Về Finora và chân trang hiển thị phiên bản từ cấu hình app. Gửi phản hồi chưa có kênh cấu hình. Khoản vay đã lưu chưa có hệ thống lưu sản phẩm riêng, nên không dùng danh sách mô phỏng thay thế.
- Không thay ảnh bìa, thẻ tài khoản, bố cục Hồ sơ cá nhân, giao diện đổi avatar hay thanh điều hướng. Không thêm endpoint hoặc migration ở thay đổi danh mục này.

## Đồng bộ ảnh đại diện

Trong **Hồ sơ cá nhân**, bấm biểu tượng máy ảnh để mở thư viện hệ thống ngay, xem lại trong bảng mở từ dưới rồi bấm **Lưu ảnh**. Chọn hoặc hủy không tự tải ảnh lên. Ảnh gắn với tài khoản đang đăng nhập, không gửi đến trợ lý AI hay dùng cho quyết định tín dụng. API kiểm tra JPEG/PNG tối đa 5 MB, cắt ảnh vuông 512 px, mã hóa lại JPEG và bỏ metadata gốc, kể cả GPS. PostgreSQL chỉ lưu mã đối tượng; API đọc và ghi theo phiên, không tạo URL công khai cho ảnh.

### Cấu hình lưu trữ

- Khi chạy local, `AVATAR_STORAGE_PROVIDER=local` lưu riêng theo tài khoản trong thư mục lưu trữ của backend. Không đưa thư mục này vào Git.
- Khi dùng R2, chuẩn bị một bucket riêng tư, không bật public access, và tạo R2 API token **Object Read & Write** giới hạn ở bucket đó. Đặt `AVATAR_STORAGE_PROVIDER=r2`, `R2_ACCOUNT_ID`, `R2_AVATAR_BUCKET`, `R2_ACCESS_KEY_ID` và `R2_SECRET_ACCESS_KEY` trong môi trường **API**. Không đặt khóa vào Expo, README hoặc repo. Xem [hướng dẫn R2 API tokens](https://developers.cloudflare.com/r2/api/tokens/).
- Khi dùng AWS S3, tạo bucket riêng tư, giữ Block Public Access, và cấp ứng dụng quyền `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` chỉ trên prefix `avatars/*`. Đặt `AVATAR_STORAGE_PROVIDER=s3`, `S3_REGION`, `S3_AVATAR_BUCKET` trong môi trường **API**. AWS SDK lấy thông tin đăng nhập từ AWS profile/SSO khi phát triển local hoặc IAM role khi triển khai; không đặt access key trong Expo hay repo.
- Chạy migration đã commit trước khi khởi động backend mới. Không chuyển provider trên cơ sở dữ liệu có avatar mà chưa chuyển đối tượng cũ. Khi thay ảnh, backend giữ ảnh cũ đến khi con trỏ mới lưu thành công rồi mới dọn ảnh cũ; lỗi dọn được ghi nhận không kèm ảnh hoặc khóa đối tượng.
- iOS/Android cần build lại development app một lần vì thêm thư viện chọn ảnh native. Bản web không cần build native.

Thư viện thêm cho luồng này: `expo-image-picker` (MIT), `sharp` (Apache-2.0), `aws4fetch` (MIT) và `@aws-sdk/client-s3` (Apache-2.0). Xem giấy phép kèm theo các thư viện khi phân phối.

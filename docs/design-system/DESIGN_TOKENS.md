# Token giao diện 2.0

`@finora/design-tokens` là nơi định nghĩa token ngữ nghĩa cho toàn bộ app. Hướng sáng giữ ivory `#F7F5EF`, forest `#173D32`, graphite `#222824`, mint `#DCE6D7` và sage `#86A88D`. Dark mode không đảo màu bừa bãi: nền `#14231E`, giấy `#1D3029`, chữ sáng `#F5F3E9`. Khối nhấn forest sử dụng cặp `onForest`/`onForestMuted` ở cả hai chế độ.

| Vai trò        | Token và cách dùng                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Nền đọc        | `background` cho canvas; `surface` cho form, dialog hoặc paper có mục đích                             |
| Phân nhóm      | `elevated` cho sidebar và nhóm ngắn, `border` chỉ là đường phân cách                                   |
| Điều khiển     | `borderStrong` nhận diện viền input/nút outline; `focus` cho focus                                     |
| Nhấn tài chính | `forest` và `forestShade`, không lặp lại trên mọi section                                              |
| Thông tin tiền | `chartPrincipal`, `chartInterest`, `chartFee`; luôn kèm nhãn/số chứ không chỉ có màu                   |
| Trạng thái     | `success`, `warning`, `error`, `disabled`; màu không thay cho mô tả trạng thái                         |
| Kiểu chữ       | Geist cho giao diện, số tabular cho tiền, Source Serif 4 (VI) / Instrument Serif (EN) cho tiêu đề ngắn |
| Mật độ         | Lưới 4 px; gutter 20 / 34 / 52 px; văn bản dài tối đa khoảng 620 px                                    |
| Bo góc         | 6 px tiện ích; 10 px điều khiển; 14 px surface; 22 px focal surface                                    |
| Chuyển động    | Dock 180 ms; không animation khi thiết bị yêu cầu giảm chuyển động; native route chỉ fade nhẹ          |
| Vùng chạm      | 44 px trở lên cho action; 48 px cho nút và input chính                                                 |

Dưới 768 px là dock có nhãn, từ 768 px rail gọn với nhãn hỗ trợ và từ 1024 px là rail đầy đủ. Phần nội dung không giãn vô hạn trên màn hình rộng. `Page` tự chừa chỗ cho dock; màn chat dùng `useWorkspaceDockInset()` để composer vẫn nhìn thấy được. Trên native, dock ẩn khi bàn phím hiện.

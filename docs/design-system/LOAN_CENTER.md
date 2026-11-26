# FINORA: màn Khoản vay

Trong bảng ý tưởng MoMo, FINORA đứng về phía người đi vay xuyên suốt: so sánh theo tổng chi phí và dòng tiền trước khi vay, sau đó chủ động chuẩn bị cho từng kỳ. Màn này là phần theo dõi sau khi vay, không thay thế luồng so sánh hoặc đọc hợp đồng.

## Đối chiếu giao diện

- [MoMo: quản lý khoản vay và nhắc lịch](https://www.momo.vn/tin-tuc/thong-bao/khong-lo-tre-han-thanh-toan-de-dang-theo-doi-9091). Hình hướng dẫn cho thấy bước xem khoản phải trả rồi mới thanh toán. FINORA không chuyển tiền hoặc đồng bộ ngân hàng; thao tác chính là mở sổ để đối chiếu.
- [Monzo: thiết kế màn khoản vay](https://community.monzo.com/t/an-update-on-loans/82106). Màn quản lý đưa kỳ tiếp theo lên trên và tách các thao tác quản lý. FINORA giữ ngày và số tiền gần nhau, nhưng thêm trục ngày chọn được và bóc gốc/lãi ngay tại ngày đã chọn.
- [Revolut: lịch trả nợ](https://help.revolut.com/en-AU/help/credit-products/loans/managing-loan-repayments/). Lịch còn lại có màn riêng; FINORA cho xem nhanh các mốc gần, giữ sổ đầy đủ ở luồng chi tiết.

## Quy tắc hiển thị

- Mở mặc định ở Lịch trả nợ. Chọn một ngày để xem tổng theo lịch, gốc và lãi, và từng khoản tới hạn cùng ngày. Nếu có kỳ cũ chưa xác nhận, ưu tiên mốc quá hạn cũ nhất; nếu không có kỳ trong 30 ngày, vẫn hiện ngày gần nhất trong lịch. Sổ trả nợ hiển thị đầy đủ.
- Bản mô phỏng có tab riêng và không được tính vào khoản đang theo dõi. Trạng thái đã trả do người dùng xác nhận; tổng không gồm phí/phạt ngoài lịch.
- Không thay dock Liquid Glass, xác thực, công thức, API hay dữ liệu.

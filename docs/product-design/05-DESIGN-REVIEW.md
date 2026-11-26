# 05 · Gate thiết kế trước code

**Internal review, không phải nghiệm thu.** Mở studio HTML bằng trình duyệt;
nội dung là dữ liệu ví dụ và các đường đi biểu diễn, không phải React Native,
API hay thiết bị thật.

- So 9 concept mobile cho A/B/C. Vòng đầu: A và B trông quá giống nhau trên
  Home, biểu mẫu auth B bị đẩy xuống bên dưới minh họa, và công cụ Home bị
  đặt sau danh sách lưu. Vòng hai: A chuyển thành lưới tác vụ dẫn dắt; C dùng
  lời hỏi theo ngữ cảnh trước; B đặt đăng nhập trước hình minh họa, kỳ trả
  trước công cụ, bản lưu sau. Đó là các thay đổi bố cục, không chỉ màu sắc.
- B gồm Home, AI, Simulator, Explore, auth và ledger; có các chế độ
  empty/loading/error/success để review trong studio. Các chế độ này không
  chứng minh trạng thái production và không thay kiểm thử riêng.
- Thứ tự ưu tiên production: con số từ hồ sơ, kỳ trả, công cụ; ở ledger là
  kỳ tới kèm ngày và nút xác nhận riêng, tổng còn lại là dòng phụ. Phí chưa
  biết, thuật ngữ đang theo dõi, và ghi nhận thủ công đều phải đọc được.
- Tiêu chí đi tiếp: không vỡ chiều rộng, không hỏng hình, mẫu có tiếng Việt
  và VND, thao tác chủ đích có đường lùi. Các hệ sinh thái được tham chiếu ở
  [research](05-COMPETITIVE-RESEARCH.md); không dùng ảnh họ trong prototype.
- Giới hạn: chưa có nghiên cứu với người thật; chưa đo đọc bằng VoiceOver
  hoặc TalkBack, chưa chứng minh thiết kế trên thiết bị. B chỉ là quyết định
  nội bộ để phát triển và trình owner review.

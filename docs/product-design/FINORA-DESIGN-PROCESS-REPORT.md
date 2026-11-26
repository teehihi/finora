# FINORA · Bàn giao Design First

**Nhánh local:** `feat/finora-design-first`. **Nền:** bản Visual Excellence
`fe71a710cbd7b95a7fccf5d5fcf2b44802666610`; tree đã xác minh khớp nội dung PR
[#15](https://github.com/teehihi/finora/pull/15), PR đó đã merge và CI đã qua.
Giữ lịch sử local; không lấy tên nhánh `main` làm bằng chứng nội dung.
**Mã và test đã kiểm:** `2449e0f`. Bản review local trước đây có Git bundle riêng. Bản này dành cho PR; không tự merge hoặc deploy.

## Tám giai đoạn

| Giai đoạn     | Kết quả và gate                                                                                                                                                                                                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 · Discovery | [Brief](01-PRODUCT-BRIEF.md): chốt việc cần giải quyết là ra quyết định vay và biết mình trả được, không làm ví/ngân hàng. Gate nội bộ, chưa có phỏng vấn thật.                                                                                                                                             |
| 2 · Scope     | [Inventory](02-FEATURE-INVENTORY.md), [stories](02-USER-STORIES.md), [MVP](02-MVP-SCOPE.md): năm hành trình và lỗi/khôi phục; không đưa mọi tính năng lên dock.                                                                                                                                             |
| 3 · Kỹ thuật  | [Plan](03-IMPLEMENTATION-PLAN.md): stack và quyền sở hữu xác minh từ source; giữ API, engine, auth, local infra, privacy, dock và schema.                                                                                                                                                                   |
| 4 · UX        | [IA](04-INFORMATION-ARCHITECTURE.md), [flows](04-USER-FLOWS.md), [wireframe](wireframes/README.md), [prototype](prototypes/index.html), [walkthrough](04-UX-REVIEW.md). Nội bộ đã thử đường chính và các bước hủy/lỗi.                                                                                      |
| 5 · UI        | [Ảnh tham chiếu](05-COMPETITIVE-RESEARCH.md), [ba hướng](05-CREATIVE-DIRECTION.md), [moodboards](moodboards/index.html), [concepts](concepts/README.md), [studio](high-fidelity/index.html), [design system](05-DESIGN-SYSTEM.md), [review](05-DESIGN-REVIEW.md). Chọn B nội bộ trước khi chỉnh production. |
| 6 · Dev       | [Design-to-code](06-DESIGN-TO-CODE.md): tích hợp sáu màn chính, dùng lại logic và các luồng phụ từ V5. Không tuyên bố mọi concept đã được triển khai giống 100%.                                                                                                                                            |
| 7 · QA/UAT    | [Functional evidence](07-TEST-REPORT.md), [visual QA](07-VISUAL-QA.md), [owner UAT](07-OWNER-UAT.md). Web được chạy và xem; thiết bị, accessibility native và owner acceptance còn chờ.                                                                                                                     |
| 8 · Release   | [Readiness](08-RELEASE-READINESS.md), [backlog](08-PRODUCT-BACKLOG.md). Đã chuẩn bị kế hoạch; phát hành thật hoãn, không tạo hạ tầng.                                                                                                                                                                       |

Quy trình tham khảo vòng đời từ [HomeNest](https://homenest.com.vn/quy-trinh-thiet-ke-app-tu-a-z);
bài hiện có 10 bước, brief này gom thành tám giai đoạn phù hợp với app đang có.
[Xem design governance](../design-system/DESIGN_GOVERNANCE.md) và AGENTS
để áp dụng lại khi chỉnh UI.

## Quyết định quan trọng

- Chọn **Financial Intelligence**: một con số có nguồn/điều kiện, một bước
  tiếp theo. A bị loại vì lưới công cụ chiếm vị trí nghĩa vụ; C dành đúng chỗ
  cho AI nhưng nếu áp lên mọi nơi sẽ đẩy số liệu vào hội thoại.
- Mobile Home hiển thị kỳ cần làm trước công cụ khi có; Sổ trả nợ chuyển
  điểm nhấn từ tổng số sang kỳ cụ thể và tách xác nhận. Không đổi engine và
  không có hành động trả tiền. Auth giảm khoảng đi đến form; dark theo thiết
  bị cho signed-out. Simulator ghi rõ đơn vị, tiền kỳ đầu/cuối và phạm vi phí.
- Phân biệt rõ ba trạng thái: điều kiện công bố, bản ước tính và khoản đã
  xác nhận theo dõi. Không tự chuyển từ trạng thái này sang trạng thái khác.

## Mở bản review và bước tiếp theo

Giải nén gói và mở `review.html`; ảnh trước/thiết kế/đã làm nằm trong
`evidence/`. Nhập source bundle theo `BAT-DAU.txt`, chạy app local, tự thử
theo checklist. Sau UAT, xử lý thứ tự trong [backlog](08-PRODUCT-BACKLOG.md):
kiểm native/assistive trước, rồi phản hồi về khả năng đọc và hiểu số của người
mới. Chưa xác minh với người thật rằng nhãn, CTA và phí chưa biết đủ rõ, chưa
đánh giá cách Fin hỗ trợ quyết định với dữ liệu/provider thực.

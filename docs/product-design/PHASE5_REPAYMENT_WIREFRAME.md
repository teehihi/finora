# Phase 5 · Repayment preparation and reminders

Task: a person who has explicitly confirmed a loan wants to know what remains due, whether their reported cash will cover the next payment, and which reminder needs attention. A saved simulation remains a separate planning artifact.

Information architecture: existing **Khoản vay → Sổ trả nợ** remains the entry. The first panel shows the next due obligation, followed by recorded and remaining amounts. The payment dialog accepts a cumulative manually recorded amount and explains that this is not bank evidence. A preparation action opens a focused form for available funds, monthly income/expense dates, planned one-off expenses and reserve. The result reports a daily/weekly gap and the first projected shortfall. A notification action opens an inbox with quiet-hour and channel preferences.

Phone wireframe:

```text
┌─────────────────────────────┐
│ ← Sổ trả nợ                 │
│ [Thông báo · unread]        │
│ Kỳ gần nhất / còn phải trả  │
│ [Chuẩn bị cho kỳ này]       │
│ Kỳ hạn / quá hạn            │
│ Khoản vay đang theo dõi     │
│  trạng thái · timeline      │
│  [Ghi nhận một phần]        │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ← Chuẩn bị kỳ trả           │
│ Tiền có sẵn / thu nhập      │
│ Ngày nhận / chi phí         │
│ Quỹ dự phòng / chi dự kiến  │
│ [Tính và lưu giả định]      │
│ Khoảng thiếu / mục tiêu ngày│
│ Dòng tiền theo ngày         │
└─────────────────────────────┘

┌─────────────────────────────┐
│ ← Thông báo                 │
│ [Tùy chọn]                  │
│ Chưa đọc / đã xem           │
│ Nhắc hạn không hiện số tiền │
└─────────────────────────────┘
```

Recovery: incomplete financial fields produce a named missing-field list; invalid amounts remain in form; a failed save keeps values editable. Turning optional reminders off cancels queued entries, while historical in-app entries remain visible. No UI action automatically makes a lender payment or adds a new borrowing obligation.

Visual direction: extend existing Finora surfaces, spacing, colors, button, field, progress and dialog components. Desktop keeps the existing ledger layout; phone stays one column. Review web at 390 px and desktop, Vietnamese and English, light/dark, keyboard focus and error paths. Native device and owner UAT remain separate gates.

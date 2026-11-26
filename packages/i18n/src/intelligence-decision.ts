const decision = {
  'vi-VN': {
    whatIf: 'Nếu điều kiện thay đổi?',
    whatIfHint: 'Chọn giả định để điền vào ô chat. Bạn có thể sửa trước khi gửi.',
    incomeAction: 'Thử thu nhập giảm 20%',
    incomePrompt: 'Nếu thu nhập giảm 20% thì sao?',
    expenseAction: 'Thử chi phí tăng 1 triệu',
    expensePrompt: 'Nếu chi phí sinh hoạt tăng 1 triệu thì sao?',
    resetAction: 'Bỏ giả định biến động',
    resetPrompt: 'Bỏ giả định biến động và xem lại phương án ban đầu.',
    mismatched: 'Điều kiện khác nhau. Xem từng phương án, không xếp hạng theo chi phí.',
    sameBasis: 'Cùng số tiền vay, lãi suất và cách tính',
    peakLower: 'Kỳ trả cao nhất thấp hơn',
    principalInterestLower: 'Tổng gốc và lãi thấp hơn',
    allInLower: 'Tổng tiền gồm phí thấp hơn',
    noLower: 'Kỳ trả cao nhất và tổng chi phí đã biết bằng nhau.',
    planningTitle: 'Mốc lập kế hoạch',
    planningRule:
      'Mốc tham khảo theo 35% thu nhập và dòng tiền hiện có, không phải tiêu chí duyệt vay.',
    planningUnknown: 'Chưa đủ thu nhập, chi phí và nợ hiện tại để đánh giá áp lực trả nợ.',
    pressure: {
      baseline: 'Không còn dư dòng tiền ngay ở giả định cơ sở.',
      stress: 'Khi điều kiện thay đổi, dòng tiền không còn dư.',
      above: 'Kỳ cao nhất vượt mốc trả thêm tham khảo. Thử giảm số tiền vay hoặc đổi kỳ hạn.',
      within: 'Kỳ cao nhất nằm trong mốc tham khảo; vẫn cần kiểm tra phí và chừa khoản dự phòng.',
    },
    stressTitle: 'Giả định biến động',
    incomeLoss: 'Thu nhập giảm mỗi tháng',
    expenseIncrease: 'Chi phí tăng mỗi tháng',
    baseCash: 'Còn lại sau kỳ cao nhất',
    stressedCash: 'Còn lại khi điều kiện thay đổi',
    stressSave: 'Lưu bản sao có biến động',
    stressSaveHint:
      'Lưu riêng lịch trả và kết quả biến động. Không sửa hồ sơ tài chính hay bản đã lưu trước đó.',
  },
  'en-US': {
    whatIf: 'What if things change?',
    whatIfHint: 'Choose an assumption to draft a message. Edit it before sending.',
    incomeAction: 'Try 20% lower income',
    incomePrompt: 'What if my income drops by 20%?',
    expenseAction: 'Try 1 million VND higher expenses',
    expensePrompt: 'What if monthly expenses increase by 1 million VND?',
    resetAction: 'Remove stress assumptions',
    resetPrompt: 'Remove stress and show my original plan.',
    mismatched: 'The assumptions differ. Review each plan separately without ranking costs.',
    sameBasis: 'Same loan amount, rate and method',
    peakLower: 'Lower highest installment',
    principalInterestLower: 'Lower principal and interest',
    allInLower: 'Lower total including fees',
    noLower: 'The highest payments and known costs are equal.',
    planningTitle: 'Planning benchmark',
    planningRule:
      'Uses 35% of income and available cash flow as a planning guide, not an approval rule.',
    planningUnknown: 'Income, expenses, and existing payments are needed to assess pressure.',
    pressure: {
      baseline: 'No cash buffer remains under the baseline assumptions.',
      stress: 'No cash buffer remains under the stress assumptions.',
      above:
        'The highest payment goes over the planning benchmark. Try borrowing less or changing the term.',
      within:
        'The highest payment is within the planning benchmark. Still check fees and leave a buffer.',
    },
    stressTitle: 'Stress assumptions',
    incomeLoss: 'Monthly income loss',
    expenseIncrease: 'Monthly expense increase',
    baseCash: 'Cash after the highest installment',
    stressedCash: 'Cash after the highest installment under stress',
    stressSave: 'Save a copy with stress results',
    stressSaveHint:
      'Save this schedule and stress result separately. Your financial profile and original saved plan stay unchanged.',
  },
} as const;

export function intelligenceDecision(locale?: string) {
  return decision[locale === 'en-US' ? 'en-US' : 'vi-VN'];
}

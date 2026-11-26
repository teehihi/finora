export const showcaseStrings = {
  'vi-VN': {
    tagline: 'Trợ thủ vay tiêu dùng',
    title: 'Vay thông minh.\nTrả chủ động.',
    intro:
      'Tìm hiểu khoản vay, tính trước số tiền phải trả và đọc kỹ hợp đồng. Finora ở bên bạn từ lúc cân nhắc đến kỳ trả cuối.',
    start: 'Bắt đầu cùng Finora',
    benefits: 'Bạn có thể làm gì với Finora?',
    preview: 'Tổng quan tài chính',
    sample: 'Dữ liệu minh họa',
    capacity: 'Khả năng trả thêm mỗi tháng',
    basis: 'Dựa trên thông tin bạn nhập, không phải hạn mức tín dụng.',
    actions: ['Tìm khoản vay', 'Mô phỏng', 'Đọc hợp đồng', 'Lịch trả nợ'],
    banner: 'Chưa biết bắt đầu từ đâu?',
    assistant: 'Hỏi Finora AI về kế hoạch vay của bạn.',
    explain: [
      ['Tính trước, quyết định sau', 'So sánh số tiền trả từng kỳ, tiền lãi và phí đã biết.'],
      ['Hiểu điều mình sắp ký', 'Xem điều khoản Finora đọc được và đối chiếu lại với tài liệu.'],
      ['Chủ động mỗi kỳ trả', 'Lưu phương án và chỉ đánh dấu đã trả khi bạn xác nhận.'],
    ],
    privacy: 'Finora là công cụ lập kế hoạch, không cho vay hay thực hiện thanh toán.',
  },
  'en-US': {
    tagline: 'Your borrowing companion',
    title: 'Borrow smarter.\nRepay with a plan.',
    intro:
      'Explore loans, estimate your repayments and review your contract. Finora helps from your first comparison to your final instalment.',
    start: 'Get started with Finora',
    benefits: 'What can you do with Finora?',
    preview: 'Your finances',
    sample: 'Example data',
    capacity: 'Estimated room to repay each month',
    basis: 'Based on the information you enter. Not a credit limit.',
    actions: ['Find a loan', 'Simulate', 'Read a contract', 'Repayments'],
    banner: 'Not sure where to start?',
    assistant: 'Ask Finora AI about your borrowing plan.',
    explain: [
      ['Know your costs first', 'Compare each instalment, interest and any known fees.'],
      ['Understand what you sign', 'Review the terms Finora extracted against your document.'],
      [
        'Stay ahead of repayments',
        'Save a plan and mark an instalment paid only when you confirm.',
      ],
    ],
    privacy: 'Finora is a planning tool. It does not issue loans or make payments.',
  },
};

export const accessStrings = {
  'vi-VN': {
    preview: 'Khám phá Finora',
    welcome: 'Vay thông minh. Trả chủ động.',
    intro: 'Biết chi phí và lịch trả trước khi quyết định.',
    cost: 'Ước tính chi phí khoản vay',
    terms: 'Đọc điều khoản hợp đồng',
    schedule: 'Theo dõi các kỳ trả',
    verification: 'Đăng nhập và xác minh',
    completeProfile: 'Hoàn tất hồ sơ để xem khả năng trả thêm ước tính.',
  },
  'en-US': {
    preview: 'Explore Finora',
    welcome: 'Borrow smarter. Repay with a plan.',
    intro: 'See the cost and repayment schedule before you decide.',
    cost: 'Estimate borrowing costs',
    terms: 'Understand contract terms',
    schedule: 'Keep track of instalments',
    verification: 'Sign-in and verification',
    completeProfile: 'Complete your profile to see your estimated repayment capacity.',
  },
} as const;

export function getAccessStrings(locale?: string) {
  return accessStrings[locale === 'en-US' ? 'en-US' : 'vi-VN'];
}

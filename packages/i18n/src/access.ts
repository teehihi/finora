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

const accessJourneyStrings = {
  'vi-VN': {
    offlineTitle: 'Không thể kết nối với máy chủ',
    offlineBody: 'Kiểm tra kết nối rồi thử lại. Email và mã bạn đang nhập được giữ nguyên.',
    offlineRetry: 'Thử kết nối lại',
    restoreTitle: 'Hoàn tất đăng nhập',
    restoreBody: 'Thông tin đăng nhập đã được chấp nhận. Kiểm tra lại phiên trước khi nhập mã mới.',
    restoreRetry: 'Kiểm tra lại phiên',
    useDifferentLogin: 'Quay về đăng nhập',
    sample: 'PHƯƠNG ÁN MINH HỌA',
    sampleTitle: 'Khoản vay giả định',
    term: 'Kỳ hạn',
    months: '{count} tháng',
    firstPayment: 'Kỳ trả đầu tiên',
    interest: 'Lãi',
    total: 'Tổng gốc + lãi',
    sampleNotes:
      'Giả định lãi suất 12%/năm trên dư nợ giảm dần, trả góp đều. Chưa tính phí và bảo hiểm; không phải đề nghị cho vay.',
    privateSample: 'Đổi kỳ hạn để thấy số tiền thay đổi. Không cần đăng nhập.',
    previewHeading: 'Biết rõ trước khi vay.',
    previewHeadingWide: 'Biết rõ chi phí\ntrước khi vay.',
    longerTerm: 'So với 12 tháng, kỳ đầu thấp hơn nhưng tổng lãi cao hơn.',
    previewBody:
      'Tính chi phí trước khi quyết định, đọc lại điều khoản hợp đồng và chuẩn bị cho từng kỳ trả.',
    toolsHeading: 'Từ lúc cân nhắc đến kỳ trả cuối',
    tools: [
      [
        'So sánh phương án vay',
        'Đặt hai kỳ hạn cạnh nhau và xem khoản trả, lãi cùng những phí đã biết.',
      ],
      [
        'Đọc lại hợp đồng',
        'Đối chiếu số tiền và điều khoản ứng dụng trích được với tài liệu gốc của bạn.',
      ],
      [
        'Chuẩn bị cho từng kỳ',
        'Giữ lịch trả trong một chỗ. Chỉ đánh dấu đã trả khi chính bạn xác nhận.',
      ],
    ],
    privacy: 'Finora giúp lập kế hoạch, không cấp khoản vay hay chuyển tiền.',
  },
  'en-US': {
    offlineTitle: 'Connection unavailable',
    offlineBody: 'Check your connection and try again. Your email and code stay as entered.',
    offlineRetry: 'Retry connection',
    restoreTitle: 'Finish signing in',
    restoreBody:
      'Your credentials were accepted. Check the session again before asking for a new code.',
    restoreRetry: 'Check session again',
    useDifferentLogin: 'Back to sign in',
    sample: 'ILLUSTRATIVE SCENARIO',
    sampleTitle: 'Example borrowing plan',
    term: 'Loan term',
    months: '{count} months',
    firstPayment: 'First instalment',
    interest: 'Interest',
    total: 'Principal + interest',
    sampleNotes:
      'Assumes 12% p.a. on the reducing balance and equal instalments. Excludes fees and insurance; not a loan offer.',
    privateSample: 'Change the term to see what it costs. No sign-in required.',
    previewHeading: 'Know before you borrow.',
    previewHeadingWide: 'Know the cost\nbefore you borrow.',
    longerTerm:
      'Compared with 12 months, the first instalment is lower but the total interest is higher.',
    previewBody:
      'Estimate the cost before deciding, review the contract terms and get ready for each repayment.',
    toolsHeading: 'From first consideration to final repayment',
    tools: [
      [
        'Compare borrowing plans',
        'Put two terms side by side and review the instalments, interest and any known fees.',
      ],
      [
        'Review the contract',
        'Check the amounts and extracted terms against your original document.',
      ],
      [
        'Prepare for repayments',
        'Keep the schedule in one place. An instalment is marked paid only when you confirm.',
      ],
    ],
    privacy: 'Finora helps you plan. It does not issue loans or transfer money.',
  },
} as const;

export const accessStrings = {
  'vi-VN': {
    ...accessJourneyStrings['vi-VN'],
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
    ...accessJourneyStrings['en-US'],
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

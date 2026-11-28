const copy = {
  title: ['Gợi ý theo tình hình tài chính', 'Matches for your finances'],
  intro: [
    'Điểm dưới đây là quy tắc so sánh ban đầu, không phải điểm tín dụng hay quyết định của bên cho vay.',
    'These scores are initial comparison rules, not credit scores or lender decisions.',
  ],
  noSuitable: [
    'Chưa có khoản vay đủ điều kiện để xác nhận phù hợp',
    'No loan can be confirmed suitable',
  ],
  noSuitableHint: [
    'Điều khoản hoặc thông tin cần thiết còn thiếu. Các ứng viên dưới đây chỉ để bạn kiểm tra tiếp.',
    'Important terms or information are missing. The candidates below are for further review.',
  ],
  suitable: ['Phù hợp theo dữ liệu đã kiểm', 'Suitable on checked data'],
  unsuitable: ['Không phù hợp theo điều kiện đã biết', 'Does not meet known conditions'],
  insufficient: ['Chưa đủ thông tin để kết luận', 'Insufficient information'],
  eligibilityMet: ['Đáp ứng điều kiện đã biết', 'Meets known conditions'],
  eligibilityNotMet: ['Không đáp ứng điều kiện đã biết', 'Does not meet known conditions'],
  eligibilityUnknown: ['Điều kiện chưa đủ thông tin', 'Conditions need more information'],
  provisionalScore: ['Điểm so sánh tạm tính', 'Provisional comparison score'],
  score: ['Điểm phù hợp', 'Suitability score'],
  affordability: ['Khả năng trả hằng tháng', 'Monthly affordability'],
  cost: ['Tổng chi phí vay', 'Total borrowing cost'],
  resilience: ['Sức chịu đựng tài chính', 'Financial resilience'],
  term: ['Kỳ hạn', 'Term suitability'],
  transparency: ['Minh bạch thông tin', 'Information transparency'],
  monthlyPeak: ['Kỳ trả cao nhất', 'Highest monthly payment'],
  monthlyBudget: ['Ngân sách trả nợ theo hồ sơ', 'Profile repayment budget'],
  totalKnown: ['Gốc và lãi đã tính', 'Calculated principal and interest'],
  totalWithFees: ['Tổng gồm phí đã biết', 'Total with known fees'],
  repaymentAssumption: [
    'Lịch dùng mức lãi cố định công bố, chưa phải báo giá hoặc phê duyệt cá nhân.',
    'Schedule uses a fixed published rate, not a personal quote or approval.',
  ],
  baselineResidual: ['Còn lại mỗi tháng', 'Monthly cash remaining'],
  stressedResidual: ['Còn lại khi thu nhập giảm', 'Remaining after income stress'],
  existingDebt: ['Nợ đang trả mỗi tháng', 'Existing monthly debt'],
  unknown: ['Chưa xác định', 'Unknown'],
  source: ['Nguồn công bố', 'Published source'],
  verified: ['Đối chiếu ngày', 'Reviewed on'],
  real: ['Dữ liệu công bố đầy đủ', 'Complete published data'],
  simulated: ['Dữ liệu mô phỏng', 'Simulated data'],
  incomplete: ['Dữ liệu công bố chưa đủ', 'Incomplete published data'],
  missingProfile: [
    'Thêm hồ sơ thu nhập, chi phí và nợ để xét khả năng trả.',
    'Add income, expenses and debt to assess affordability.',
  ],
  setup: [
    'Nhập số tiền và kỳ hạn trong bộ lọc để xem gợi ý cá nhân.',
    'Enter amount and term in filters to see personalized matches.',
  ],
  compare: ['Đối chiếu mức phù hợp', 'Compare suitability'],
  amountOutside: ['Số tiền nằm ngoài khoảng công bố.', 'Amount is outside the published range.'],
  termOutside: ['Kỳ hạn nằm ngoài khoảng công bố.', 'Term is outside the published range.'],
  purposeOutside: [
    'Loại khoản vay khác mục đích đã chọn.',
    'Loan category differs from the selected purpose.',
  ],
  purposeUnknown: [
    'Chọn mục đích vay để kiểm tra đúng nhóm sản phẩm.',
    'Choose a loan purpose to check the right category.',
  ],
  amountUnknown: [
    'Giới hạn số tiền chưa công bố đầy đủ.',
    'Amount limits are not fully published.',
  ],
  termUnknown: ['Giới hạn kỳ hạn chưa công bố đầy đủ.', 'Term limits are not fully published.'],
  eligibilityUnverified: [
    'Điều kiện giấy tờ hoặc người vay cần xác minh với bên cho vay.',
    'Borrower or document requirements need lender confirmation.',
  ],
  rateUnknown: [
    'Chưa có lãi suất cố định đủ điều kiện để tính lịch.',
    'No fixed applicable rate is available for a schedule.',
  ],
  methodUnknown: ['Chưa rõ cách tính trả góp.', 'Repayment method is unknown.'],
  feesUnknown: [
    'Phí bắt buộc chưa rõ; không mặc định bằng không.',
    'Mandatory fees are unknown and are not treated as zero.',
  ],
  insuranceUnknown: ['Chi phí bảo hiểm chưa rõ.', 'Insurance cost is unknown.'],
  reserveUnknown: [
    'Chưa biết số tiền tiết kiệm để kiểm tra mức dự phòng bạn yêu cầu.',
    'Savings are needed to check your requested reserve.',
  ],
  budgetExceeded: [
    'Kỳ trả vượt ngân sách cứng theo hồ sơ.',
    'Payment exceeds the hard profile budget.',
  ],
  reserveShortfall: [
    'Tiết kiệm thấp hơn mức dự phòng bạn yêu cầu.',
    'Savings fall below your requested reserve.',
  ],
  stressPressure: [
    'Dòng tiền âm trong kịch bản thu nhập giảm.',
    'Cash flow turns negative under income stress.',
  ],
  costHigher: [
    'Tổng chi phí đã biết cao hơn ứng viên khác.',
    'Known total cost is higher than another candidate.',
  ],
  transparencyLower: [
    'Thông tin công bố ít đầy đủ hơn ứng viên khác.',
    'Disclosures are less complete than another candidate.',
  ],
  matchingTerms: [
    'Số tiền và kỳ hạn khớp điều kiện đã biết.',
    'Amount and term match known conditions.',
  ],
  conditionAmount: ['Số tiền', 'Amount'],
  conditionTerm: ['Kỳ hạn', 'Term'],
  months: ['tháng', 'months'],
  conditionPurpose: ['Mục đích', 'Purpose'],
  conditionEligibility: ['Điều kiện công bố', 'Published conditions'],
  conditionMet: ['Đạt điều kiện đã biết', 'Known condition met'],
  conditionNotMet: ['Không đạt', 'Does not meet'],
  conditionUnknown: ['Chưa rõ', 'Unknown'],
  alternativeLower: ['Thử số tiền thấp hơn', 'Try a lower amount'],
  alternativeLonger: ['Thử kỳ hạn dài hơn', 'Try a longer term'],
  alternativeHint: [
    'Chỉ là mô phỏng từ điều khoản cố định đã công bố; cần xác nhận báo giá cá nhân.',
    'Illustration from fixed published terms only; confirm your personal quote.',
  ],
} as const;

export type MatchingCopyKey = keyof typeof copy;
export function matchingText(key: MatchingCopyKey, locale: 'vi-VN' | 'en-US') {
  return copy[key][locale === 'vi-VN' ? 0 : 1];
}

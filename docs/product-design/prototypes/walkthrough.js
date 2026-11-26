(() => {
  const initial = () => ({
    email: '',
    profile: false,
    saved: false,
    tracked: false,
    paid: false,
    notice: '',
  });
  let state = initial();
  let current = 'welcome';
  const history = [];
  const button = (label, action, primary = false) =>
    `<button type="button" data-action="${action}" ${primary ? 'class="primary"' : ''}>${label}</button>`;
  const label = (caption, id, attrs) =>
    `<label for="${id}">${caption}</label><input id="${id}" ${attrs} />`;
  const screens = {
    welcome: [
      'Chào mừng',
      'Biết khoản vay có vừa với ngân sách của bạn.',
      () => [
        'Bạn có thể xem ví dụ trước. FINORA không cho vay hoặc xét duyệt.',
        [
          ['Bắt đầu', 'auth'],
          ['Xem ví dụ', 'explore'],
        ],
      ],
    ],
    auth: [
      'Đăng nhập',
      'Dùng email để vào không gian riêng.',
      () => [
        label(
          'Email mẫu',
          'email',
          'type="email" autocomplete="email" placeholder="tee@example.test"',
        ),
        [
          ['Gửi mã', 'send'],
          ['Xem ví dụ', 'explore'],
        ],
      ],
    ],
    otp: [
      'Xác minh email',
      'Dùng mã mẫu 123456. Prototype không gửi email.',
      () => [
        label('Mã 6 số', 'code', 'inputmode="numeric" autocomplete="one-time-code" maxlength="6"'),
        [
          ['Xác nhận mã', 'verify'],
          ['Gửi lại mã mẫu', 'resend'],
          ['Sửa email', 'auth'],
        ],
      ],
    ],
    onboarding: [
      'Hồ sơ tài chính',
      'Dùng thu nhập và chi phí bạn tự nhập, không phải dữ liệu ngân hàng.',
      () => [
        label('Thu nhập tháng (₫)', 'income', 'type="number" min="1" value="18000000"') +
          label('Chi phí thiết yếu (₫)', 'cost', 'type="number" min="0" value="10500000"'),
        [
          ['Lưu hồ sơ mẫu', 'saveProfile'],
          ['Để sau', 'home'],
        ],
      ],
    ],
    home: [
      'Trang chủ',
      'Biết bước tiếp theo trước khi xem danh sách công cụ.',
      () => [
        state.profile
          ? '<strong>Đã có hồ sơ mẫu</strong><p>Ví dụ minh họa: 3.000.000 ₫/tháng cho trả nợ. Không phải hạn mức được duyệt.</p>'
          : '<strong>Chưa thể ước tính khả năng trả</strong><p>Hoàn tất hồ sơ để hiểu con số của bạn.</p>',
        [
          [state.profile ? 'Hỏi Finora AI' : 'Bổ sung hồ sơ', state.profile ? 'ai' : 'onboarding'],
          ['Mô phỏng', 'simulate'],
          ['Xem khoản vay', 'repay'],
          ['Cài đặt', 'settings'],
        ],
      ],
    ],
    explore: [
      'Khám phá',
      'Điều kiện quảng cáo chỉ để tham khảo.',
      () => [
        '<strong>Gói A · ví dụ</strong><p>Lãi suất công bố theo năm. Phí chưa biết.</p><strong>Gói B · ví dụ</strong><p>Chỉ so khi cùng số tiền và kỳ hạn.</p>',
        [
          ['Xem chi tiết', 'detail'],
          ['So sánh A/B', 'compare'],
          ['Về Home', 'home'],
        ],
      ],
    ],
    detail: [
      'Chi tiết khoản vay',
      'Điều kiện quảng cáo không phải báo giá cho cá nhân.',
      () => [
        '<strong>Gói A · nội dung minh họa</strong><p>12%/năm. Phí chưa có thông tin. Kiểm tra nguồn trước khi dùng điều khoản.</p>',
        [
          ['So sánh với B', 'compare'],
          ['Nhập điều kiện của tôi', 'simulate'],
          ['Về Khám phá', 'explore'],
        ],
      ],
    ],
    compare: [
      'So sánh A/B',
      '20.000.000 ₫ · 12 tháng · cùng cơ sở tính.',
      () => [
        '<strong>A · 12%/năm</strong><p>Phí chưa biết, không kết luận rẻ hơn.</p><strong>B · 15%/năm</strong><p>Phí ví dụ 200.000 ₫.</p>',
        [
          ['Mô phỏng điều khoản thật', 'simulate'],
          ['Xem lại nguồn', 'detail'],
        ],
      ],
    ],
    simulate: [
      'Mô phỏng',
      'Số dưới đây là dữ liệu mẫu, không kết nối máy tính tài chính.',
      () => [
        '<strong>20.000.000 ₫ · 12 tháng</strong><p>Tháng đầu: 1.870.000 ₫ · ví dụ.</p><p>Phí chưa biết, tổng chưa thể chốt.</p>',
        [
          ['Xem bước xác nhận lưu', 'confirmSave'],
          ['Đổi lựa chọn', 'compare'],
        ],
      ],
    ],
    ai: [
      'Finora AI',
      'Hỏi về kế hoạch vay, không phải xét duyệt.',
      () => [
        label('Câu hỏi mẫu', 'prompt', 'placeholder="Mỗi tháng tôi trả được bao nhiêu?"') +
          '<p>Fin cần số tiền, thời hạn hoặc hồ sơ trước khi đưa ra mô phỏng cá nhân.</p>',
        [
          ['Xem phản hồi mẫu', 'ask'],
          ['Đọc hợp đồng', 'document'],
          ['Mô phỏng thủ công', 'simulate'],
        ],
      ],
    ],
    document: [
      'Rà soát tài liệu',
      'Kiểm tra điều khoản trước khi dùng. Không tải file thật.',
      () => [
        '<strong>Tài liệu mẫu</strong><p>Đã tìm thấy kỳ hạn 12 tháng. Chưa đọc được phí.</p>',
        [
          ['Dùng điều khoản đã kiểm', 'simulate'],
          ['Không đọc được tài liệu', 'unavailable'],
          ['Hủy, quay về AI', 'ai'],
        ],
      ],
    ],
    saved: [
      'Kế hoạch đã lưu',
      'Bản dự tính, chưa phải khoản vay đang theo dõi.',
      () => [
        state.saved
          ? '<strong>Đã lưu ví dụ 20.000.000 ₫</strong>'
          : '<strong>Chưa có bản dự tính.</strong>',
        [
          [
            state.saved ? 'Tôi đã vay và muốn theo dõi' : 'Tạo mô phỏng',
            state.saved ? 'confirmTrack' : 'simulate',
          ],
          ['Về Home', 'home'],
        ],
      ],
    ],
    repay: [
      'Lịch trả nợ',
      'Chỉ ghi nhận thủ công. Không chuyển tiền.',
      () => [
        state.tracked
          ? `<strong>Kỳ đầu · 1.870.000 ₫</strong><p>${state.paid ? 'Đã ghi nhận trả' : 'Chưa ghi nhận trả'}</p>`
          : '<strong>Chưa có khoản vay đang theo dõi.</strong>',
        [
          [
            state.tracked && !state.paid ? 'Xác nhận đã trả' : 'Xem kế hoạch',
            state.tracked && !state.paid ? 'confirmPaid' : 'saved',
          ],
          ['Về Home', 'home'],
        ],
      ],
    ],
    settings: [
      'Cài đặt',
      'Tùy chọn tài khoản không thay đổi nguồn tài chính.',
      () => [
        '<strong>Giao diện theo hệ thống</strong><p>AI local là mặc định; bên ngoài cần sự đồng ý của bạn.</p>',
        [
          ['Sửa hồ sơ', 'onboarding'],
          ['Về Home', 'home'],
        ],
      ],
    ],
  };
  const confirmations = {
    confirmSave: [
      'Lưu bản dự tính?',
      'Không tạo nghĩa vụ trả nợ.',
      'Lưu bản dự tính',
      'save',
      'simulate',
    ],
    confirmTrack: [
      'Bắt đầu theo dõi khoản vay thực?',
      'Chỉ tiếp tục nếu đã vay và tự xác nhận điều khoản.',
      'Xác nhận khoản vay',
      'track',
      'saved',
    ],
    confirmPaid: [
      'Đánh dấu đã trả kỳ đầu?',
      'Đây là ghi nhận của bạn, không phải giao dịch ngân hàng.',
      'Ghi nhận đã trả',
      'pay',
      'repay',
    ],
  };
  const app = document.querySelector('#app');
  const select = document.querySelector('#screen');
  select.innerHTML = Object.entries(screens)
    .map(([key, [title]]) => `<option value="${key}">${title}</option>`)
    .join('');
  const message = (value) => {
    state.notice = value;
    render();
  };
  function go(to) {
    history.push(current);
    current = to;
    state.notice = '';
    render(true);
  }
  function render(focus = false) {
    if (current in confirmations) {
      const [title, desc, ok, action, cancel] = confirmations[current];
      app.innerHTML = `<h1>${title}</h1><p>${desc}</p><div class="actions">${button(ok, action, true)}${button('Hủy và quay lại', cancel)}</div>`;
    } else {
      const [title, purpose, body] = screens[current];
      select.value = current;
      const [content, actions] = body();
      app.innerHTML = `<nav aria-label="Đường lùi">${history.length ? button('← Quay lại', 'back') : ''}</nav><h1>${title}</h1><p class="sub">${purpose}</p><section class="panel">${content}</section><p class="notice" role="status">${state.notice}</p><div class="actions">${actions.map(([text, action], i) => button(text, action, i === 0)).join('')}</div>`;
      if (current === 'auth') app.querySelector('#email').value = state.email;
    }
    if (focus) app.focus();
  }
  app.addEventListener('click', (event) => {
    const key = event.target.closest('button')?.dataset.action;
    if (!key) return;
    if (key === 'back') {
      current = history.pop();
      state.notice = '';
      render(true);
      return;
    }
    if (key in screens || key in confirmations) {
      go(key);
      return;
    }
    if (key === 'send') {
      const input = document.querySelector('#email');
      state.email = input.value;
      if (!input.value.trim() || !input.checkValidity()) return message('Nhập email mẫu hợp lệ.');
      go('otp');
    } else if (key === 'verify') {
      if (document.querySelector('#code').value !== '123456')
        return message('Mã không khớp. Thử lại hoặc gửi mã mẫu mới.');
      go('onboarding');
    } else if (key === 'resend') message('Mã mẫu vẫn là 123456.');
    else if (key === 'saveProfile') {
      const income = +document.querySelector('#income').value;
      const cost = +document.querySelector('#cost').value;
      if (income <= 0 || cost < 0) return message('Kiểm tra thu nhập và chi phí.');
      state.profile = true;
      go('home');
    } else if (key === 'ask') {
      const input = document.querySelector('#prompt');
      const draft = input.value;
      message(
        draft.trim()
          ? 'Phản hồi mẫu: hãy nhập số tiền và kỳ hạn trong mô phỏng để so với ngân sách.'
          : 'Nhập câu hỏi hoặc mở mô phỏng thủ công.',
      );
      document.querySelector('#prompt').value = draft;
    } else if (key === 'unavailable')
      message('Không đọc được tài liệu này. Bạn có thể nhập điều khoản thủ công trong mô phỏng.');
    else if (key === 'save') {
      state.saved = true;
      go('saved');
    } else if (key === 'track') {
      state.tracked = true;
      go('repay');
    } else if (key === 'pay') {
      state.paid = true;
      go('repay');
    }
  });
  select.addEventListener('change', () => go(select.value));
  document.querySelector('#reset').addEventListener('click', () => {
    state = initial();
    history.length = 0;
    current = 'welcome';
    render(true);
  });
  render();
})();

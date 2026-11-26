(() => {
  const mascot = '../../../apps/app/assets/brand/fin-assistant.png';
  const art = `<img class="fin" src="${mascot}" alt="" />`;
  const paths = {
    home: 'M3 10l9-7 9 7v10H3z M9 20v-7h6v7',
    explore: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M16 8l-2 6-6 2 2-6z',
    ai: 'M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z',
    repay: 'M3 5h18v15H3z M3 9h18 M7 3v4 M17 3v4 M7 13h3 M14 13h3',
    auth: 'M5 11h14v11H5z M8 11V7a4 4 0 0 1 8 0v4',
    sim: 'M5 2h14v20H5z M8 6h8 M8 11h1 M15 11h1 M8 16h1 M15 16h1',
  };
  const icon = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
  const btn = (label, target, quiet = false) =>
    `<button class="cta${quiet ? ' quiet' : ''}" data-target="${target}">${label}</button>`;
  const tools = (items) =>
    `<div class="tools">${items.map(([name, label]) => `<button class="tool" data-target="${name}">${icon(name)} ${label}</button>`).join('')}</div>`;
  const row = (label, metric, context) =>
    `<div class="row"><div><strong>${label}</strong>${context ? `<small>${context}</small>` : ''}</div><strong>${metric}</strong></div>`;
  const panel = (title, body) => `<section class="panel"><h2>${title}</h2>${body}</section>`;
  const hero = (label, amount, context, extra = '') =>
    `<section class="hero"><span class="eyebrow">${label}</span><div class="metric">${amount}</div><p>${context}</p>${extra}</section>`;
  const hint = (body) => `<aside class="hint"><p>${body}</p></aside>`;
  const field = (label, value, type = 'text') =>
    `<label class="field">${label}<input type="${type}" value="${value}" /></label>`;
  const data = {
    home: {
      title: 'Trang chủ',
      headline: 'Biết mình trả nổi bao nhiêu.',
      intro: 'Ước tính từ hồ sơ của bạn, không phải hạn mức được duyệt.',
      context: [
        'Chưa đủ hồ sơ để tính',
        'Đang tải hồ sơ',
        'Chưa tải được ngân sách',
        'Đã cập nhật hồ sơ',
      ],
      main: () =>
        hero(
          'Ngân sách trả nợ mỗi tháng',
          '3.000.000 ₫',
          'Từ thu nhập, chi phí và nghĩa vụ bạn đã nhập.',
          `<div class="split"><div><strong>18 triệu ₫</strong><span>Thu nhập</span></div><div><strong>10,5 triệu ₫</strong><span>Chi thiết yếu</span></div><div><strong>2 triệu ₫</strong><span>Nợ hiện tại</span></div></div>`,
        ),
      side: () =>
        panel(
          'Việc cần làm',
          row('Kỳ thanh toán tiếp theo', '1.870.000 ₫', 'Ngày 18/12 · khoản đang theo dõi') +
            btn('Xem lịch trả nợ', 'repay', true),
        ) +
        tools([
          ['sim', 'Mô phỏng'],
          ['explore', 'Tìm khoản vay'],
          ['ai', 'Hỏi Finora AI'],
        ]) +
        panel(
          'Kế hoạch đã lưu',
          row('Ví dụ: mua xe đi làm', '20.000.000 ₫', 'Bản dự tính · không phải khoản vay'),
        ),
    },
    ai: {
      title: 'Finora AI',
      headline: 'Cùng Fin tính một phương án.',
      intro: 'Gợi ý theo dữ kiện bạn cung cấp; quyết định luôn thuộc về bạn.',
      context: [
        'Bắt đầu bằng một câu hỏi',
        'Đang chuẩn bị phân tích',
        'Chưa nhận được phản hồi',
        'Phân tích mẫu đã sẵn sàng',
      ],
      main: () =>
        panel(
          'Kế hoạch vay 20.000.000 ₫',
          art +
            '<p>So với ngân sách 3.000.000 ₫/tháng, kỳ đầu của phương án minh họa thấp hơn 1.130.000 ₫.</p>' +
            row('Kỳ đầu', '1.870.000 ₫', '12 tháng · lãi theo dư nợ giảm dần') +
            hint('Phí chưa biết. Chưa thể khẳng định tổng chi phí hoặc khả năng được duyệt.') +
            btn('Mở mô phỏng với giả định này', 'sim'),
        ),
      side: () =>
        panel(
          'Hỏi thêm',
          field('Tin nhắn của bạn', '') +
            btn('Gửi câu hỏi mẫu', 'success') +
            hint('Đang dùng trợ lý local. Không gửi hồ sơ sang bên ngoài.'),
        ),
    },
    sim: {
      title: 'Mô phỏng',
      headline: 'Tính theo điều khoản của bạn.',
      intro: 'Kiểm tra tiền phải chuẩn bị cho kỳ đầu và tổng chi phí.',
      context: [
        'Nhập điều khoản để bắt đầu',
        'Đang tính lịch trả',
        'Kiểm tra lại số tiền hoặc kỳ hạn',
        'Đã tạo kết quả mô phỏng',
      ],
      main: () =>
        panel(
          'Điều khoản cá nhân',
          field('Số tiền vay (₫)', '20.000.000') +
            field('Kỳ hạn (tháng)', '12', 'number') +
            field('Lãi suất năm (%)', '12', 'number') +
            hint('Phí một lần: chưa biết, không tính thành 0.') +
            btn('Cập nhật kết quả', 'success'),
        ),
      side: () =>
        hero('Kỳ đầu · ước tính', '1.870.000 ₫', 'Gốc và lãi theo lịch minh họa; chưa gồm phí.') +
        panel(
          'Lịch thanh toán',
          `<div class="plot" role="img" aria-label="Ví dụ tiền trả giảm dần từ tháng 1 đến tháng 12">${Array.from({ length: 12 }, (_, i) => `<span style="height:${98 - i * 3}%"></span>`).join('')}</div>` +
            row('Tổng chi phí', 'Chưa xác định', 'Cần biết phí trước khi kết luận') +
            btn('Xem bước lưu kế hoạch', 'confirmPlan', true),
        ),
    },
    explore: {
      title: 'Khám phá',
      headline: 'So trên cùng một cơ sở.',
      intro: 'Điều kiện công bố không phải báo giá dành riêng cho bạn.',
      context: [
        'Không có lựa chọn khớp',
        'Đang tải danh mục',
        'Chưa lấy được danh mục',
        'Đã áp dụng điều kiện tìm',
      ],
      main: () =>
        panel(
          'Tìm theo nhu cầu',
          field('Mục đích vay', 'Mua xe đi làm') +
            hint('Phương án mẫu: 20.000.000 ₫ · 12 tháng.') +
            btn('Xem lựa chọn', 'success'),
        ),
      side: () =>
        panel(
          'Hai phương án minh họa',
          row('Gói A', '12%/năm', 'Dư nợ giảm dần · chưa biết phí') +
            row('Gói B', '15%/năm', 'Dư nợ giảm dần · phí mẫu 200.000 ₫') +
            hint('Không kết luận gói rẻ hơn khi thiếu phí.') +
            btn('Nhập điều khoản cá nhân', 'sim'),
        ),
    },
    auth: {
      title: 'Đăng nhập',
      headline: 'Vay thông minh, trả chủ động.',
      intro: 'Xem chi phí khoản vay trước khi quyết định.',
      context: [
        'Nhập email để bắt đầu',
        'Đang gửi mã xác minh',
        'Mã chưa gửi được hoặc không hợp lệ',
        'Đã xác minh email mẫu',
      ],
      main: () =>
        hero(
          'Không gian tài chính riêng',
          'FINORA',
          'Xem trước một ví dụ nếu chưa muốn tạo tài khoản.',
          art + btn('Xem ví dụ không cần tài khoản', 'explore', true),
        ),
      side: () =>
        panel(
          'Tiếp tục bằng email',
          field('Địa chỉ email', '', 'email') +
            btn('Nhận mã xác minh mẫu', 'success') +
            '<p>Không có giao dịch ngân hàng hoặc xét duyệt khoản vay.</p>',
        ),
    },
    repay: {
      title: 'Lịch trả nợ',
      headline: 'Việc cần làm tiếp theo.',
      intro: 'Chỉ gồm khoản bạn đã xác nhận theo dõi.',
      context: [
        'Chưa có khoản vay theo dõi',
        'Đang tải lịch trả',
        'Chưa tải được lịch trả',
        'Đã ghi nhận thanh toán thủ công',
      ],
      main: () =>
        hero(
          'Kỳ sắp tới',
          '1.870.000 ₫',
          '18/12 · Kỳ 1/12 · Mua xe đi làm',
          btn('Xem bước xác nhận đã trả', 'confirmPayment'),
        ) + hint('Bạn tự ghi nhận. FINORA không chuyển tiền hoặc xác minh với ngân hàng.'),
      side: () =>
        panel(
          'Tổng còn phải trả',
          row('Theo các lịch đã xác nhận', '21.300.000 ₫', '1 khoản · minh họa') +
            row('Quá hạn', 'Chưa có', 'Theo lịch người dùng tự nhập'),
        ) +
        panel(
          'Hoạt động',
          row(
            'Kỳ 1 · 18/12',
            state.value === 'success' ? 'Đã ghi nhận' : 'Chưa ghi nhận',
            'Khoản đang theo dõi',
          ) + row('Bản mô phỏng khác', 'Không tính vào nợ', 'Kế hoạch đã lưu'),
        ),
    },
  };
  const direction = document.querySelector('#direction'),
    screen = document.querySelector('#screen'),
    state = document.querySelector('#state'),
    dark = document.querySelector('#dark'),
    stage = document.querySelector('#stage');
  const params = new URLSearchParams(location.search);
  screen.innerHTML = Object.entries(data)
    .map(([id, s]) => `<option value="${id}">${s.title}</option>`)
    .join('');
  if (['a', 'b', 'c'].includes(params.get('direction'))) direction.value = params.get('direction');
  if (Object.hasOwn(data, params.get('screen'))) screen.value = params.get('screen');
  if (params.get('dark') === '1') dark.checked = true;
  if (params.get('clean') === '1') document.querySelector('.review').hidden = true;
  if (document.querySelector('.review').hidden)
    document.querySelector('.review').style.display = 'none';
  const nav = [
    ['home', 'Home'],
    ['explore', 'Khám phá'],
    ['ai', 'Finora AI'],
    ['repay', 'Khoản vay'],
    ['auth', 'Hồ sơ'],
  ];
  const modeHint = {
    empty: 'Không hiển thị 0 thay cho dữ liệu chưa có.',
    loading: 'Giữ cấu trúc và chờ dữ liệu; không công bố kết quả giả.',
    error: 'Giữ lại dữ kiện đã nhập và cho phép thử lại.',
    success: 'Trạng thái giả lập cho review, không ghi dữ liệu.',
  };
  function render() {
    const s = data[screen.value],
      d = direction.value;
    const intro = `<div class="screen-intro"><div class="eyebrow">${s.title}</div><h1>${s.headline}</h1><p>${s.intro}</p></div>`;
    const dock =
      screen.value === 'auth'
        ? ''
        : `<nav class="dock" aria-label="Điều hướng minh họa">${nav.map(([id, label]) => `<button data-target="${id}" ${id === screen.value ? 'aria-current="page"' : ''}>${icon(id)}${label}</button>`).join('')}</nav>`;
    const soft = s.main(),
      extra = s.side();
    const outcome =
      state.value === 'ready'
        ? ''
        : panel(
            s.context[['empty', 'loading', 'error', 'success'].indexOf(state.value)],
            `<p role="status">${modeHint[state.value]}</p>` +
              (state.value === 'loading'
                ? '<div class="placeholder" aria-hidden="true"><i></i><i></i><i></i></div>'
                : btn(state.value === 'error' ? 'Thử lại' : 'Về màn mặc định', 'ready', true)),
          );
    const alternative = state.value !== 'ready' && state.value !== 'success';
    const aEntry = `<div class="entry-grid">${[
      ['explore', 'Tìm khoản vay'],
      ['sim', 'Tính thử chi phí'],
      ['ai', 'Hỏi Fin'],
      ['repay', 'Xem lịch trả'],
    ]
      .map(([id, title]) => `<button class="tool" data-target="${id}">${icon(id)}${title}</button>`)
      .join('')}</div>`;
    const cHome = `<aside class="marker">${art}<b>Fin có thể cùng bạn tính bước đầu.</b><p>Bạn đang cân nhắc vay để làm gì?</p>${btn('Bắt đầu trao đổi', 'ai')}</aside>`;
    const order = alternative
      ? [outcome, '']
      : d === 'a' && screen.value === 'home'
        ? [aEntry, soft + extra]
        : d === 'c' && screen.value === 'home'
          ? [cHome, soft + extra]
          : d === 'b' && screen.value === 'auth'
            ? [extra, soft]
            : d === 'a' && ['explore', 'ai'].includes(screen.value)
              ? [extra, soft]
              : d === 'c' && ['home', 'ai', 'sim'].includes(screen.value)
                ? [art + extra, soft]
                : [soft, extra];
    stage.innerHTML = `<article class="app ${d}${dark.checked ? ' dark' : ''}"><header class="brand"><span class="wordmark">FINORA</span><span class="status">${screen.value === 'auth' ? 'RIÊNG TƯ THEO MẶC ĐỊNH' : 'Không gian cá nhân'}</span></header><div class="layout"><section class="group">${intro}${order[0]}${state.value === 'success' ? outcome : ''}</section><section class="side">${order[1]}</section></div>${dock}</article>`;
  }
  const confirmations = {
    confirmPlan: [
      'Lưu bản dự tính?',
      'Bản đã lưu không tạo nghĩa vụ trả nợ.',
      'Lưu bản dự tính mẫu',
    ],
    confirmPayment: [
      'Ghi nhận kỳ này đã trả?',
      'Thao tác chỉ cập nhật sổ cá nhân. Không có chuyển tiền hoặc xác nhận từ ngân hàng.',
      'Xác nhận đã trả mẫu',
    ],
  };
  function showConfirmation(action) {
    const [title, text, confirm] = confirmations[action];
    const overlay = document.createElement('dialog');
    overlay.setAttribute('aria-labelledby', 'confirmation-heading');
    overlay.innerHTML = `<h2 id="confirmation-heading">${title}</h2><p>${text}</p><form method="dialog"><button class="cta quiet" autofocus value="cancel">Hủy</button><button class="cta" value="confirm">${confirm}</button></form>`;
    stage.querySelector('.app').append(overlay);
    overlay.addEventListener(
      'close',
      () => {
        const accepted = overlay.returnValue === 'confirm';
        overlay.remove();
        if (accepted) {
          state.value = 'success';
          render();
          stage.querySelector('[role="status"]')?.scrollIntoView({ block: 'nearest' });
        }
      },
      { once: true },
    );
    overlay.showModal();
  }
  for (const el of [direction, screen, state, dark]) el.addEventListener('change', render);
  stage.addEventListener('click', (event) => {
    const next = event.target.closest('[data-target]')?.dataset.target;
    if (!next) return;
    if (Object.hasOwn(confirmations, next)) {
      showConfirmation(next);
      return;
    }
    if (Object.hasOwn(data, next)) {
      screen.value = next;
      state.value = 'ready';
    } else state.value = next;
    render();
  });
  render();
})();

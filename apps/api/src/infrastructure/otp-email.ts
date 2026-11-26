export function renderOtpEmail(otp: string, type: 'sign-in' | 'email-verification') {
  if (!/^\d{6}$/.test(otp)) throw new Error('Unexpected verification code format');
  const title = type === 'sign-in' ? 'Đăng nhập vào Finora' : 'Xác minh email của bạn';
  const intro =
    type === 'sign-in'
      ? 'Nhập mã bên dưới để tiếp tục vào Finora.'
      : 'Nhập mã bên dưới trong Finora để xác minh địa chỉ email này.';
  const expiry = 'Mã chỉ dùng một lần và hết hạn sau 5 phút.';
  const safety = 'Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã với bất kỳ ai.';
  return {
    subject: `${title} | Finora`,
    text: `Finora\n\n${title}\n${intro}\n\n${otp}\n\n${expiry}\n${safety}`,
    html: `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#F7F5EF;color:#222824;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff"><tr><td style="background:#173D32;color:#fff;padding:24px 28px;font-family:Georgia,serif;font-size:30px">Finora</td></tr><tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font:normal 26px/1.25 Georgia,serif">${title}</h1><p style="margin:0 0 18px;line-height:1.55">${intro}</p>
<p style="margin:0;padding:18px 12px;text-align:center;color:#173D32;background:#DCE6D7;font:bold 32px monospace;letter-spacing:.12em">${otp}</p>
<p style="margin:16px 0;line-height:1.55">${expiry}</p><p style="margin:0;color:#445149;line-height:1.55">${safety}</p></td></tr></table>
</td></tr></table></body></html>`,
  };
}

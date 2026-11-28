export const twoFactorCopy = {
  'vi-VN': {
    title: 'Xác thực hai bước',
    intro: 'Mở Google Authenticator hoặc app xác thực bạn đã liên kết, rồi nhập mã 6 số.',
    recoveryIntro: 'Dùng một mã khôi phục chưa sử dụng mà bạn đã lưu khi bật xác thực hai bước.',
    code: 'Mã xác thực 6 số',
    recoveryCode: 'Mã khôi phục',
    useRecovery: 'Dùng mã khôi phục',
    useAuthenticator: 'Dùng app xác thực',
    back: 'Quay lại đăng nhập',
    incorrect: 'Mã không đúng. Kiểm tra và thử lại.',
    expired: 'Phiên xác thực đã hết hạn hoặc hết lượt thử. Hãy đăng nhập lại.',
    locked: 'Đã thử quá nhiều lần. Vui lòng đợi rồi đăng nhập lại.',
    enable: 'Bật xác thực hai bước',
    disable: 'Tắt xác thực hai bước',
    enabled: 'Đã bật. Khi đăng nhập, FINORA sẽ hỏi thêm mã từ app xác thực.',
    setupIntro:
      'FINORA sẽ yêu cầu mã từ app xác thực sau bước đăng nhập đầu tiên, dù bạn dùng mật khẩu, mã email hay tài khoản liên kết.',
    setupGuide:
      'Mở app xác thực và quét mã QR. Nếu dùng cùng điện thoại, nhập khóa thiết lập bên dưới.',
    setupKey: 'Khóa thiết lập (giữ bí mật)',
    next: 'Tạo mã QR',
    backupTitle: 'Lưu mã khôi phục',
    backupBody:
      'Mỗi mã dùng một lần để đăng nhập nếu mất app xác thực. Lưu ở nơi an toàn. Bạn có thể lưu mã trước khi xác nhận để tránh mất quyền truy cập.',
    finish: 'Xác nhận và bật',
    disabled: 'Đã tắt xác thực hai bước.',
    verifyEmail: 'Xác minh email của bạn trước khi bật xác thực hai bước.',
    disableIntro: 'Khi tắt xác thực hai bước, mã khôi phục cũ sẽ không còn hiệu lực.',
    recent: 'Hãy đăng xuất rồi đăng nhập lại trước khi đổi cài đặt này.',
  },
  'en-US': {
    title: 'Two-step verification',
    intro:
      'Open Google Authenticator or the authenticator you linked, then enter the 6-digit code.',
    recoveryIntro: 'Enter one unused recovery code you saved during setup.',
    code: '6-digit authenticator code',
    recoveryCode: 'Recovery code',
    useRecovery: 'Use a recovery code',
    useAuthenticator: 'Use the authenticator app',
    back: 'Back to sign-in',
    incorrect: 'That code is incorrect. Check it and try again.',
    expired: 'This challenge has expired or used all attempts. Sign in again.',
    locked: 'Too many attempts. Wait a while and sign in again.',
    enable: 'Turn on two-step verification',
    disable: 'Turn off two-step verification',
    enabled: 'On. FINORA will ask for an authenticator code when you sign in.',
    setupIntro:
      'FINORA will ask for an authenticator code after your first sign-in step, whether you use a password, email code or a linked account.',
    setupGuide:
      'Open your authenticator app and scan the QR code. On the same phone, enter the setup key below.',
    setupKey: 'Setup key (keep it private)',
    next: 'Create QR code',
    backupTitle: 'Save recovery codes',
    backupBody:
      'Each code works once if you lose your authenticator. Store them somewhere safe. You can save the codes before confirming so you don’t lose access.',
    finish: 'Verify and turn on',
    disabled: 'Two-step verification is off.',
    verifyEmail: 'Verify your email before turning on two-step verification.',
    disableIntro:
      'When you turn off two-step verification, your old recovery codes will no longer work.',
    recent: 'Sign out and sign in again before changing this setting.',
  },
} as const;

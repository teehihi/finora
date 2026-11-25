# ADR 002 · Bề mặt kính theo nền tảng

**Đã chọn** dùng hiệu ứng kính có mục đích ở thanh điều hướng mobile. iOS 26 trở lên dùng `@callstack/liquid-glass`; iOS cũ dùng Expo Blur; Android dùng Expo Blur với `BlurTargetView`; web giữ nền đặc. Các màn hình tài chính, thẻ dữ liệu và sidebar không dùng glass để giữ độ tương phản và tránh glassmorphism tràn lan.

Callstack Liquid Glass cần development build và Xcode 26 trở lên; thư viện không chạy trong Expo Go và dưới iOS 26 chỉ render View thường. Do đó Expo Blur là fallback hiển thị cho iOS cũ. Trên Android, Expo Blur dùng native target và tự chuyển sang nền bán trong suốt trên API cũ để hạn chế chi phí blur.

[Callstack Liquid Glass](https://github.com/callstack/liquid-glass) · [Expo Blur SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/blur-view/) · [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/)

# FINORA · Dock iOS

Trên iPhone chạy iOS có Liquid Glass, FINORA tự dùng CYL trong cả Debug lẫn
Release. Không cần `.env.local`, cờ CYL hay symlink. Trên iOS không có Liquid
Glass, tiếp tục dùng dock Expo Blur. Binary iOS cũ thiếu bridge vẫn chạy với
dock cũ (Callstack Clear nếu khả dụng). Android và web không link CYL; bố cục
rộng vẫn dùng rail. Không đổi backend, tài khoản, quyền truy cập hay dữ liệu.

## Chuyển từ nhánh thử cũ

Nếu checkout từng bật pilot, trước khi pull hãy gỡ **chỉ symlink** cũ bằng
`node experiments/cyl-dock/switch.mjs disable` trong checkout hiện tại. Nếu đã
pull và đường dẫn là thư mục thật, không gỡ nó. Dòng
`EXPO_PUBLIC_FINORA_DOCK=cyl` cũ có thể xóa; bản mới không đọc cờ này.

Sau khi pull hoặc clone, dùng Xcode có SDK iOS 26+ và CocoaPods để cài lại
development build. Nếu checkout có thay đổi Xcode thủ công, lưu chúng trước
khi Expo tái sinh native project, hoặc dùng checkout riêng.

```sh
pnpm install --frozen-lockfile
pnpm --filter @finora/app exec expo prebuild --platform ios --no-install
pnpm --filter @finora/app run ios --device
```

Dùng development build, **không dùng Expo Go**. Chạy API local theo
[README](../../README.md) và để Mac/iPhone cùng mạng LAN tin cậy. Với một build
phân phối, cấu hình endpoint HTTPS trong môi trường build bằng
`EXPO_PUBLIC_API_URL`; không dùng địa chỉ Metro hay IP nhà phát triển.

## Hành vi và ownership

- Expo Router giữ route, back, deep link và auth; callback native chỉ chấp nhận
  index và identifier trong danh sách năm tab. Fin vẫn là một tab thật.
- CYL giữ UIKit tab bar/pill và cử chỉ native. Cử chỉ dự phòng trên dock chỉ
  đổi một tab nếu UIKit không nhận. Không vẽ đè viền giả, không can thiệp viền
  hay khúc xạ bên trong phần chọn do iOS sở hữu.
- ScrollView của Home/Page đang focus phát trạng thái thu/mở. Dock thu cùng
  pill khi vuốt ngón lên đủ xa; đảo chiều có chủ đích hoặc về đầu trang thì
  mở. Giữ khoảng đáy để nội dung không nhảy. Không thu trong chat, khi
  VoiceOver bật hoặc dùng cỡ chữ trợ năng; Giảm chuyển động không chạy spring.

## Release và giới hạn

Expo autolink module local trong `apps/app/modules`, config plugin khai báo
**Core** tại SHA `960dc211d829d540e5249cf13b6e8ec1b24fbca2` và CocoaPods liên
kết ở cả hai cấu hình. Không tích hợp Lottie/PAG/Rive. [Giấy phép MIT upstream
được đóng gói cùng app](../../apps/app/modules/finora-cyl-dock/ios/CYL-LICENSE.txt).

Workflow `FINORA iOS Release build` kiểm tra pod, đăng ký module và compile
Release unsigned cho simulator trên macOS. Đây không phải signed archive,
không cài app lên iPhone, và không tự phát hành. Trước khi quảng bá bản này,
dùng một build Release đã ký trên thiết bị thật để kiểm tra chọn tab/deep link,
vuốt trên pill, thu/mở ở Home, sáng/tối, safe area, bàn phím, VoiceOver và
Giảm chuyển động. iOS cũ, Android và web phải giữ fallback.

**Chưa gửi App Store/TestFlight.** Adapter FINORA chỉ gọi API công khai, nhưng
bản CYL ghim vẫn [nhận diện lớp UIKit nội bộ](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CYLTabBarController/UIView%2BCYLTabBarControllerExtention.m#L80-L151)
và [có KVC tới `_backgroundView`](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CYLTabBarController/CYLTabBar.m#L1914-L1918).
Cần chọn hoặc sửa bản CYL để không phụ thuộc vào các phần nội bộ trước khi
nộp duyệt theo [Apple App Review Guidelines, mục 2.5.1](https://developer.apple.com/app-store/review/guidelines/#software-requirements).
Không xem compile sạch hay iPhone chạy được là bằng chứng App Review.

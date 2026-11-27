# FINORA · So dock Callstack và CYL trên cùng iPhone

**Đây là bản thử trong app, không phải mockup hay quyết định đổi thư viện.**
Hai chế độ dùng cùng màn hình, dữ liệu và Expo Router. A là dock FINORA hiện tại
với Callstack `clear`; B dùng tab bar UIKit của CYL, với năm tab thật và biểu
tượng SF Symbols. Tab AI ở giữa vẫn đi tới Fin. B cố ý không dùng nút “plus” nhô
cao: host coi nút đó là một trang đặc biệt, trong khi Fin cần nhận trạng thái
được chọn cả lúc mở từ deep link. Vì vậy A/B này đánh giá **cả dock**, không
cô lập riêng shader. API CYL chọn `liquidGlass`, không hứa tương đương
`UIGlassEffect.Style.clear` của Callstack.

## Thao tác trên nhánh thử này

- Kéo pill ngang **ngay trên dock** để thử chuyển động UIKit. Cử chỉ gốc của
  thanh được ưu tiên; nếu không nhận, FINORA sẽ xử lý một bước đổi tab. Vuốt
  trong nội dung không đổi tab. Pill/viền vẫn do cùng một thanh UIKit vẽ ở cả
  hai kích thước, không có lớp viền Swift/React giả đè lên.
- Trên Home và các màn dùng Page, vuốt ngón tay lên để đi xuống nội dung:
  dock thu sau khi đủ khoảng cuộn; kéo ngược lại thì mở. Đây là resize của
  cùng CYL host, không phải chế độ chỉ còn một tab do UITabBarController điều
  khiển. Bản trước trông chờ UIKit nhận cuộn của trang React Native bên cạnh
  controller con; nay chính ScrollView đang focus gửi trạng thái cho host.
- Giữ khoảng đáy ổn định để nội dung không nhảy và không thu trên chat, với
  VoiceOver hoặc cỡ chữ trợ năng. Giảm chuyển động đổi kích thước tức thì.
  Bấm lại tab về đầu tiếp tục dùng cơ chế thử riêng nếu tìm được ScrollView.
- Cần thử trên iPhone: thử Home đủ dài, rê pill chậm (so viền/hiệu ứng với tap),
  vuốt lên rồi xuống trên nội dung, đổi tab và mở lại Home. So cả sáng/tối;
  kiểm tra bấm đủ 5 tab khi dock thu, bàn phím, VoiceOver và Giảm chuyển động.
  Viền/khúc xạ bên trong pill là do iOS kiểm soát, không có public API trong
  CYL để ép nó thành viền giống Callstack Clear.

## Thử trên Mac (iOS 26+, Xcode có SDK iOS 26+, CocoaPods)

1. Dùng một checkout **riêng** của nhánh thử. Theo [README dự án](../../README.md)
   để cài Node 22, pnpm, API local và tài khoản thử. Không dùng dữ liệu thật.
   Dừng Metro đang chạy. Nếu dùng iPhone thật, để cùng mạng LAN với máy chạy API.
2. Từ gốc repo, tạo development build một lần:

   ```sh
   node experiments/cyl-dock/switch.mjs enable
   pnpm --filter @finora/app exec expo prebuild --platform ios --no-install
   pnpm --filter @finora/app run ios --device --no-bundler
   ```

   Chọn simulator hoặc thiết bị khi Expo hỏi. Đây là development client riêng,
   **không phải Expo Go**. Prebuild có thể tái sinh thư mục iOS; đừng chạy trong
   checkout chứa thay đổi Xcode thủ công chưa lưu. Dùng CocoaPods, không bật Expo
   SPM. Sau khi cài Pods, mục `CHECKOUT OPTIONS` trong `apps/app/ios/Podfile.lock`
   phải trỏ CYL về commit `960dc211d829d540e5249cf13b6e8ec1b24fbca2`.

3. Bật một chế độ, mở development client và vào Trang chủ của tài khoản thử:

   ```sh
   # A: mặc định, có nút AI nhô lên.
   EXPO_PUBLIC_FINORA_DOCK=callstack pnpm --filter @finora/app run dev
   # Dừng Metro (Ctrl+C); chạy B, mở lại/reload cùng development client.
   EXPO_PUBLIC_FINORA_DOCK=cyl pnpm --filter @finora/app run dev
   ```

   B có AI ngang hàng với bốn tab còn lại. Accessibility identifier của native
   host: `finora-cyl-pilot`. Nếu không thấy B, kiểm tra đã **build lại** sau
   bước 2, mở màn sau đăng nhập ở chiều rộng điện thoại, bàn phím đã đóng và
   thiết bị/binary hỗ trợ Liquid Glass. Bundle JS một mình không cài được pod.

4. Quay về A ngay bằng lệnh A ở trên. Để **gỡ hẳn mã native** khỏi binary thử:
   chạy `node experiments/cyl-dock/switch.mjs disable`, làm lại hai lệnh
   prebuild/build ở bước 2. Khi tắt, autolinking không đăng ký bridge và
   Podfile không thêm CYL. Không cần xóa ứng dụng, dữ liệu hay database để đổi mode.

## Tiêu chí chọn

| Thử trên đúng một máy, cùng dữ liệu và vị trí cuộn                                      | Điều phải thấy                                                                                              |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Quay hai clip khi cuộn Home, nền sáng rồi tối; bấm/chuyển ngang 5 tab                   | So độ rõ nhãn, kính trên nền chuyển động, phản hồi và chọn đúng trang, không chỉ độ đẹp ảnh tĩnh.           |
| Home → Fin → tài liệu; deep link khoản đã lưu; Back                                     | Tab Fin/Khoản vay tương ứng vẫn sáng. Thử chạm lại tab, chuyển nhanh và quay lại từ trang con.              |
| Mở/đóng bàn phím, xoay máy, chữ lớn, VoiceOver; bật Giảm chuyển động/Giảm độ trong suốt | Kiểm tra khe home indicator, nội dung cuối, focus, thứ tự tab và vùng chạm. Chuyển sang rail ở bề rộng lớn. |
| Mở web, Android, iOS cũ, hoặc development client không có pod                           | Giữ dock/fallback hiện tại.                                                                                 |

**Khuyến nghị hiện tại: giữ A là mặc định.** B chỉ đáng đưa tiếp nếu clip trên
máy cho thấy chuyển tab hoặc khả năng đọc tốt hơn và mọi bài kiểm tra điều
hướng/trợ năng đều đạt. Một ưu thế hình ảnh cũng chưa giải quyết được rủi ro
UIKit nội bộ bên dưới.

## Vì sao triển khai như vậy?

- [Host public của upstream](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CYLTabBarController/CYLTabBarHostView.h)
  gắn một `CYLTabBarController` làm child controller và chỉ hiển thị tab bar.
  Đây cũng là lớp dùng trong [bridge React Native Fabric của họ](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CrossPlatform/react-native-cyltabbar/ios/CyltabbarView.mm).
  Gói RN có source ở thư mục con, nhưng tra npm `react-native-cyltabbar` trả
  404 khi làm thử. Adapter Swift này gọi trực tiếp public host; native được ghim
  theo commit và chỉ lấy pod **Core**, không Lottie/PAG/Rive. Không tải icon,
  cấu hình hoặc trang từ mạng, không chuyển session/dữ liệu tài chính sang CYL.
- Router vẫn sở hữu route, back, auth, trang con và index đang chọn.
  Callback nhận cả index lẫn identifier, chỉ điều hướng khi khớp danh sách có
  sẵn. Host trả chiều cao gồm safe area; B không cộng thêm inset đáy lần hai.
- **Chặn đưa vào production:** adapter FINORA không gọi private API. Nhưng
  [mã Core upstream nhận diện các lớp view nội bộ và dùng NSClassFromString](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CYLTabBarController/UIView%2BCYLTabBarControllerExtention.m#L80-L151)
  và [đọc `_backgroundView` qua KVC](https://github.com/ChenYilong/CYLTabBarController/blob/960dc211d829d540e5249cf13b6e8ec1b24fbca2/CYLTabBarController/CYLTabBar.m#L1914-L1918).
  Không kết luận mọi đường chạy đều gọi chúng, cũng không khẳng định Apple sẽ
  chấp thuận/từ chối. Cần review, loại bỏ sự phụ thuộc vào internals hoặc chọn
  giải pháp chỉ dùng public API trước khi đưa vào bản phát hành.
- Không có symlink opt-in thì **không** liên kết native; khi có thì cả bridge
  và khai báo pod đều giới hạn Debug. Không có cờ JS, binary tương thích, mode
  dev, phiên đăng nhập hoặc bề rộng điện thoại thì không thay dock.

## Bằng chứng và giới hạn

Trên Linux đã chạy Expo prebuild iOS, kiểm tra đồ thị autolinking khi bật/tắt
và ghim SHA, kiểm tra Android không có module, export JS iOS ở chế độ dev với
cờ CYL và kiểm thử JavaScript cổng chọn/fallback, callback tab, chiều cao.
Không có CocoaPods/Xcode/Simulator/iPhone ở máy này: **chưa compile Swift/pods,
chưa chạy UIKit, chưa có ảnh/clip so sánh và chưa kết luận B đẹp hơn**.

# Authentic Shoes

## Chạy ứng dụng

Cài .NET 10 SDK, mở terminal tại thư mục dự án và chạy:

```powershell
dotnet run
```

Trang chủ: `/`  
Đăng ký: `/register`  
Đăng nhập: `/login`  
Trang quản trị (chỉ role `Admin`): `/admin`

Tài khoản tạo từ biểu mẫu đăng ký được gán role `User`. Cơ sở dữ liệu Identity dùng SQLite và tự áp dụng migration khi ứng dụng khởi động.

Danh mục sản phẩm được lưu trong cùng cơ sở dữ liệu. Trang quản trị có thể thêm, sửa, ẩn/hiện và xóa sản phẩm; các sản phẩm đang hiển thị sẽ được tải từ cơ sở dữ liệu lên trang cửa hàng. Trang chủ có khu vực sản phẩm nổi bật riêng cho giày, quần áo, phụ kiện, vợt Pickleball và mẫu bán chạy; các bộ sưu tập được ngăn cách bằng banner quảng bá. Mẫu bán chạy xếp theo số lượng trong đơn chưa bị hủy, đồng thời tôn trọng nhãn **BÁN CHẠY** của sản phẩm. Danh mục hỗ trợ giày (tennis, chạy bộ, lifestyle), quần áo, vợt Pickleball và phụ kiện. Trang chủ có menu lọc các danh mục này; mục **Danh mục** trong admin lọc sản phẩm theo nhóm và hiển thị số lượng từng nhóm. Migration thêm các sản phẩm mẫu bằng ID tự sinh, không ghi đè sản phẩm admin đã tạo. Ảnh sản phẩm nhận đường dẫn trong `/img/` hoặc `/assets/`, hoặc URL HTTPS.

Tồn kho ban đầu của 18 sản phẩm mẫu là 10 sản phẩm mỗi mặt hàng. Giày có tồn kho riêng theo từng tổ hợp màu và size; trang chi tiết hiển thị số lượng còn, đồng thời vô hiệu hóa lựa chọn đã hết. Trong mục **Sản phẩm** của admin, mở sửa một sản phẩm có sẵn, bấm **Thêm màu sắc** để tạo màu mới rồi thêm một hoặc nhiều size cùng tồn kho cho màu đó; có thể lặp lại để tạo nhiều màu trên cùng sản phẩm. Sản phẩm chưa có phân loại vẫn dùng tồn kho tổng. Khách thêm hàng và đặt hàng đều được kiểm tra tồn kho; đơn COD chỉ trừ kho khi đặt thành công, còn hủy đơn trước khi giao sẽ hoàn lại đúng phân loại. Các đơn mới xuất hiện trong mục **Đơn hàng**; trạng thái được chuyển theo quy trình chờ xác nhận → đã xác nhận → đang giao → hoàn tất. Khách hàng đăng nhập có thể xem lịch sử đơn tại **Tài khoản**; khi admin đổi trạng thái, đơn được cập nhật trực tiếp trên trang này. Đơn đặt khi chưa đăng nhập không được liên kết với tài khoản và không xuất hiện trong lịch sử.

Trang chi tiết tại `/product.html?id=<id>` lấy sản phẩm đang bán trực tiếp từ API/database. Chọn size giày hoặc kích cỡ quần áo được lưu cùng dòng đơn hàng. Giỏ hàng dùng chung giữa trang chủ và chi tiết, hiển thị dưới dạng ngăn thanh toán trượt bên phải; hiện hỗ trợ thanh toán COD.

Khách chưa đăng nhập vẫn có thể thêm sản phẩm vào giỏ; cần đăng nhập hoặc đăng ký để đặt hàng. Giỏ hàng được lưu trên thiết bị và sẽ mở lại sau khi hoàn tất đăng nhập/đăng ký.

Ảnh sản phẩm và danh mục hiện dùng ảnh chụp lưu cục bộ trong `wwwroot/img`. Ảnh vợt từ Wikimedia Commons: [“Pickleball Paddle 2025”](https://commons.wikimedia.org/wiki/File:Pickleball_Paddle_2025.jpg) của Fakhar Saeed (CC0), [“Pickleball balls and paddles”](https://commons.wikimedia.org/wiki/File:Pickleball_balls_and_paddles.jpg) của E is for Ian và [“Headpickleballracket”](https://commons.wikimedia.org/wiki/File:Headpickleballracket.jpg) của Helloheart (CC BY-SA 4.0; [điều khoản CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)). Ảnh áo và ba lô lấy từ Unsplash theo [Unsplash License](https://unsplash.com/license).

## Khởi tạo tài khoản quản trị

Không có mật khẩu admin mặc định trong mã nguồn. Trước khi chạy, đặt email và mật khẩu admin trong biến môi trường:

```powershell
$env:Admin__Email = "admin@example.com"
$env:Admin__Password = "Use-A-Unique-Strong-Password"
dotnet run
```

Mật khẩu phải đáp ứng chính sách Identity: tối thiểu 8 ký tự, có chữ thường, chữ hoa, chữ số và ký tự đặc biệt. Chỉ tài khoản được cấu hình theo cách này mới được gán role `Admin`; người dùng không thể tự chọn quyền admin khi đăng ký.

Ứng dụng dùng cookie đăng nhập, chống giả mạo biểu mẫu Razor Pages, yêu cầu email duy nhất và khóa tạm đăng nhập sau 5 lần nhập sai. Khi đưa lên Internet, cấu hình HTTPS và đặt thông tin admin trong secret manager của môi trường triển khai, không lưu mật khẩu thật trong file cấu hình hoặc mã nguồn.

## Bảo mật và riêng tư

Bảo mật là yêu cầu xuyên suốt để bảo vệ cửa hàng và người dùng. Ba mục tiêu cần duy trì là **tính khả dụng** (người dùng hợp pháp truy cập được dịch vụ), **tính toàn vẹn** (dữ liệu và đơn hàng không bị sửa trái phép) và **tính bảo mật** (thông tin chỉ được người có quyền truy cập xem).

### Xác thực, phân quyền và kiểm soát truy cập

- **Xác thực (authentication)** xác minh danh tính qua email và mật khẩu; **phân quyền (authorization)** quyết định danh tính đó được phép làm gì.
- Ứng dụng dùng ASP.NET Core Identity, yêu cầu email duy nhất, khóa đăng nhập 15 phút sau 5 lần nhập sai và lưu mật khẩu bằng cơ chế băm của Identity, không lưu mật khẩu dạng rõ.
- Cookie đăng nhập được đặt `HttpOnly` và `SameSite=Lax`. Trang quản trị và các API tương ứng giới hạn theo vai trò `Admin`; người đăng ký mới chỉ có vai trò `User`.
- Đây là kiểm soát truy cập theo vai trò, một dạng ACL ở mức ứng dụng. Ứng dụng chưa có ACL tùy chỉnh theo từng người dùng, đơn vị hay điều kiện tài nguyên.
- Biểu mẫu và thao tác ghi dữ liệu dùng antiforgery token. Ứng dụng dùng HTTPS redirect; HSTS được bật ngoài môi trường phát triển. Khi triển khai công khai, phải cấu hình HTTPS đúng tại ứng dụng và proxy/load balancer.

### Mối đe dọa và biện pháp

| Nhóm rủi ro | Ví dụ | Biện pháp và giới hạn hiện tại |
| --- | --- | --- |
| Khả dụng | DoS/DDoS làm dịch vụ chậm hoặc không truy cập được | Cần giới hạn lưu lượng và dùng lớp bảo vệ ở hạ tầng triển khai; ứng dụng chưa cấu hình cơ chế chống DDoS chuyên dụng. |
| Toàn vẹn | Injection/SQL poisoning, sửa đơn hoặc dữ liệu trái phép | Truy vấn cơ sở dữ liệu đi qua Entity Framework Core; endpoint quản trị được giới hạn quyền và dữ liệu đầu vào được kiểm tra. Không ghép SQL từ chuỗi đầu vào. |
| Bảo mật | XSS, chiếm cookie phiên (session hijacking), brute force | Razor mã hóa đầu ra HTML theo mặc định; cookie `HttpOnly` giảm khả năng đọc cookie bằng JavaScript; HTTPS bảo vệ dữ liệu truyền tải; Identity khóa tạm đăng nhập sai nhiều lần. Các biện pháp này không thay thế kiểm thử đầu ra, bảo vệ hạ tầng và giám sát. |
| An toàn bộ nhớ | Buffer overflow | Đây là rủi ro thường gắn với chương trình xử lý bộ nhớ mức thấp; ứng dụng web .NET này không tự quản lý bộ đệm kiểu C/C++. Cần cập nhật runtime và thư viện, đặc biệt nếu bổ sung thành phần native. |

### Mã hóa, vận hành và phục hồi

- TLS/HTTPS mã hóa đường truyền và xác minh máy chủ theo chứng thư TLS. Mã hóa đối xứng dùng chung một khóa; mã hóa bất đối xứng dùng một cặp khóa công khai/bí mật.
- Dữ liệu đang truyền cần HTTPS; dữ liệu lưu trữ cần được bảo vệ ở cấp cơ sở dữ liệu, tập tin hoặc phương tiện lưu trữ phù hợp; dữ liệu đang xử lý cũng cần giới hạn quyền truy cập. SQLite hiện **không được ứng dụng mã hóa ở cấp cơ sở dữ liệu**; hãy bật mã hóa ổ đĩa/storage ở hạ tầng và bảo vệ quyền truy cập tệp.
- Không đưa khóa hay mật khẩu vào mã nguồn. Dùng secret manager/KMS để tạo, lưu và cấp quyền truy cập khóa; lập kế hoạch luân chuyển khóa và duy trì phiên bản cần thiết để phục hồi. Dự án hiện chưa tích hợp KMS hoặc quy trình luân chuyển khóa.
- Vận hành môi trường thật cần cập nhật bản vá, giám sát đăng nhập và thao tác quản trị, có quy trình ứng phó sự cố, sao lưu định kỳ và kiểm tra khôi phục. Tự động đăng xuất theo thời gian ngắn, MFA, nhật ký kiểm toán đầy đủ và sao lưu tự động chưa được cấu hình trong ứng dụng này.

### Dữ liệu cá nhân và quyền riêng tư

Ứng dụng cần email và họ tên để tạo tài khoản; khi đặt hàng cần tên người nhận, số điện thoại, địa chỉ giao hàng và thông tin sản phẩm/đơn hàng để xử lý đơn COD và hiển thị lịch sử mua hàng. Giỏ hàng được lưu trong `localStorage` của trình duyệt. Ứng dụng hiện không nhận thông tin thẻ thanh toán. Bảo vệ dữ liệu cũng là yêu cầu kinh doanh và tuân thủ: vi phạm có thể làm mất niềm tin, gây thiệt hại hoặc dẫn đến chế tài và hạn chế hoạt động tại một số thị trường.

Chỉ sử dụng dữ liệu cho các mục đích đã nêu; không dùng cho mục đích khác nếu chưa có căn cứ phù hợp và thông báo/đồng ý cần thiết. Người dùng có thể yêu cầu xem, sửa hoặc xóa dữ liệu, hoặc rút lại sự đồng ý khi áp dụng, thông qua đơn vị vận hành cửa hàng. Ứng dụng chưa có chức năng tự phục vụ để xuất/xóa tài khoản và chưa tự động xóa dữ liệu theo thời hạn; dữ liệu SQLite tồn tại cho đến khi được quản trị viên xử lý. Vì vậy, đơn vị vận hành phải xác định thời hạn lưu giữ, quy trình đáp ứng yêu cầu của chủ thể dữ liệu, quyền truy cập nội bộ và lịch xóa bản sao lưu phù hợp với luật áp dụng.

Trang `/Privacy` trình bày thông tin quyền riêng tư cho người dùng. Trước khi vận hành thực tế, đơn vị kiểm soát dữ liệu cần bổ sung thông tin liên hệ, nhà cung cấp/hạ tầng thực tế, thời hạn lưu trữ và cơ sở xử lý phù hợp với hoạt động của mình; rà soát nghĩa vụ pháp lý tại các khu vực phục vụ. Chính sách này không tự chứng nhận ứng dụng tuân thủ mọi luật bảo vệ dữ liệu.

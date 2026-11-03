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

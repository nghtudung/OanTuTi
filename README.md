# OanTuTi - Oẳn tù tì vjp pro

Một trò chơi chiến thuật nhiều người chơi kết hợp yếu tố may rủi và tính toán trong thời gian thực.

## 🎮 Luật Chơi Cơ Bản

OanTuTi là một trò chơi 1v1 đấu tranh sinh tử giữa hai người chơi. Mỗi lượt kéo dài 10 giây, bạn phải chọn một trong ba hành động:

### Các Hành Động

| Hành Động | Mô Tả | Điều Kiện |
|-----------|-------|----------|
| **Shoot (Bắn)** | Bắn súng tấn công đối thủ. Nếu đối thủ đang reload, họ sẽ chết. Nếu đối thủ có shield, bản đạn sẽ bị chặn. | Phải có ≥ 1 viên đạn |
| **Shield (Chắn)** | Dựng khiên để bảo vệ bản thân, chặn mọi viên đạn từ đối thủ. | Không thể chắn liên tiếp > 5 lần |
| **Reload (Nạp đạn)** | Nạp 1 viên đạn vào kho (tối đa 3 viên). Nếu bị bắn lúc này, bạn sẽ chết. | Không yêu cầu điều kiện |

### Bảng Kết Quả

```
Shoot  + Shoot        = Cả hai không bị tổn thương
Shoot  + Shield       = Đạn bị chặn
Shoot  + Reload       = Đối thủ chết ☠️
Shield + Shield       = Cả hai không bị tổn thương
Shield + Reload       = Người reload an toàn
Reload + Reload       = Cả hai nạp thêm đạn
```

## 🏆 Cách Chiến Thắng

Để chiến thắng, bạn cần **tiêu diệt đối thủ** bằng cách bắn họ khi họ đang **reload**.

Điều này đòi hỏi:
- Quản lý đạn thông minh (không lãng phí)
- Dự đoán hành động đối thủ
- Chọn đúng thời điểm để tấn công

## 📊 Thống Kê & Giới Hạn

- **Đạn tối đa**: 3 viên
- **Giới hạn khiên liên tiếp**: 5 lần chắn liên tiếp rồi phải dừng
- **Thời gian mỗi lượt**: 10 giây

## 🚀 Cách Chơi

1. **Nhập nickname**: Nhập tên người chơi của bạn
2. **Chọn phòng**: Nhập ID phòng hoặc tạo phòng mới
3. **Chờ đối thủ**: Chơi sẽ bắt đầu khi có 2 người chơi
4. **Chọn hành động**: Bấm Shoot, Shield, hoặc Reload trong 10 giây
5. **Xem kết quả**: Log sẽ hiển thị (ví dụ: "Player 1 shot Player 2")
6. **Lặp lại**: Chơi tiếp cho đến khi bạn hoặc đối thủ thua

## 🎮 Ký Hiệu Trạng Thái

- 💬 = Chưa chọn hành động
- ✅ = Đã chọn hành động

---

**Chúc bạn chơi vui!** 🎯

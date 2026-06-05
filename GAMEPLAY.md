# Mind Clash — Bản Thiết Kế Gameplay Toàn Diện

---

## 1. Tổng quan

**Thể loại:** Đấu tâm lý 1v1, đồng thời (simultaneous action)
**Cốt lõi:** Cả hai người chơi bí mật chọn nước đi rồi tiết lộ cùng lúc. Không ai biết trước đối thủ chọn gì. Chiến thắng đến từ việc đọc và dự đoán đối thủ.
**Điều kiện thắng:** Đưa đối thủ về 0 mạng.

---

## 2. Tài nguyên

### Mạng
- Bắt đầu: **3 mạng**
- Mất khi thua một lượt
- Về 0 → thua ván

### Đạn
- Bắt đầu: **0 đạn**
- Dùng để trả chi phí nước đi
- Tích lũy qua Nạp Đạn hoặc hiệu ứng đặc biệt
- Không có giới hạn tối đa

### Mối quan hệ giữa Mạng và Đạn
Đạn và mạng có thể chuyển đổi qua các lựa chọn trong game (xem phần Resource Conversion). Đây là quyết định chiến lược — không phải augment, không phải nước đi riêng, mà là lựa chọn có thể thực hiện bất kỳ lúc nào trong lượt chọn nước đi.

---

## 3. Cấu trúc một ván đấu

```
[Chọn Augment] → [Lượt 1] → [Lượt 2] → ... → [Game Over]
```

### Trước ván: Chọn Augment
- Mỗi người nhận 3 augment random, chọn 1
- Augment có hiệu lực ngay và kéo dài suốt ván
- Cả hai thấy augment của nhau sau khi đã chọn xong

### Trong ván: Vòng lặp lượt
Mỗi lượt:
1. Cả hai bí mật chọn nước đi
2. Tiết lộ đồng thời
3. Xử lý kết quả: thắng/thua/hòa + hiệu ứng nội tại + combo chain
4. Cập nhật trạng thái (mạng, đạn, streak, debuff)
5. Chờ 3.5s → lượt tiếp theo

---

## 4. Hệ thống nước đi

### Nguyên tắc cốt lõi
- **Trong cùng hệ:** nước đắt hơn thắng nước rẻ hơn — không có ngoại lệ
- **Giữa các hệ:** mỗi hệ có quan hệ khắc chế cụ thể
- **Mỗi quân:** ngoài thắng/thua còn có hiệu ứng nội tại riêng

---

### Hệ Vàng — Tích Lũy

> Không tốn đạn. Vai trò: xây dựng tài nguyên và đặt bẫy.

#### 🔋 Nạp Đạn (`nap`) — 0 đạn
**Kết quả:** Hòa với hệ Xanh và Vàng; thua mọi nước hệ Đỏ và Đặc Biệt
**Hiệu ứng nội tại:**
- Lần nạp đầu: +1 đạn
- Nạp liên tiếp lần 2 trở đi: +2 đạn mỗi lần
- Sau 2 lần nạp liên tiếp: bị **cooldown** (không nạp được lượt kế)
- Nếu bị tấn công lúc nạp: mất mạng nhưng **giữ lại đạn vừa nạp** (không mất trắng)

#### 💣 Mìn (`min`) — 0 đạn
**Kết quả:** Thắng Zombie và Magic Hand; thua tất cả còn lại
**Hiệu ứng nội tại:**
- Khi nổ trúng (thắng): đối thủ mất **2 mạng** thay vì 1 (xứng với rủi ro đặt bẫy)
- Khi tự nổ (thua): chỉ mất 1 mạng như bình thường

---

### Hệ Xanh — Kỹ Thuật

> Chi phí 0–1 đạn. Vai trò: phản công và vô hiệu hóa hệ Đỏ. Không tự tấn công được.

#### 🛡️ Khiên (`khien`) — 0 đạn
**Kết quả:** Hòa Súng, Shotgun, Zombie; thua Móc và Magic Hand; thắng Mìn
**Hiệu ứng nội tại:**
- Đỡ thành công (hòa trước đòn tấn công Đỏ): nhận **+1 đạn miễn phí** lượt sau

#### 🧨 Kíp (`kip`) — 0 đạn
**Kết quả:** Thắng Súng và Shotgun; thua Zombie; hòa còn lại
**Hiệu ứng nội tại:**
- Phản thành công: đối thủ mất mạng **và** mất toàn bộ đạn đã bỏ ra cho nước đó

#### ✂️ Kéo (`keo`) — 1 đạn
**Kết quả:** Thắng Shotgun và Zombie; hòa Súng, Khiên, Kíp, Móc; thua Magic Hand
**Hiệu ứng nội tại:**
- Không có hiệu ứng phụ — sức mạnh nằm ở việc khắc chế hai nước đắt nhất hệ Đỏ

---

### Hệ Đỏ — Tấn Công

> Chi phí 1–3 đạn. Vai trò: gây sát thương trực tiếp. Thắng hệ Vàng, thua hệ Xanh.
> **Quy tắc nội hệ:** Shotgun > Súng; trong vai trò tương đương Zombie > Shotgun về diện tấn công.

#### 🔫 Súng (`sung`) — 1 đạn
**Kết quả:** Thắng Nạp Đạn; hòa Khiên, Kéo; thua Kíp, Shotgun, Zombie, Magic Hand
**Hiệu ứng nội tại:**
- Không có hiệu ứng phụ — nước tấn công cơ bản, chi phí thấp nhất hệ Đỏ

#### 🪝 Móc (`moc`) — 1 đạn
**Kết quả:** Thắng Khiên và Nạp Đạn; thua Súng, Shotgun, Zombie, Magic Hand
**Hiệu ứng nội tại:**
- Thắng: **lấy 1 đạn từ đối thủ** sang mình (cướp tài nguyên, không phải damage thêm)

#### 🔥 Shotgun (`shotgun`) — 2 đạn
**Kết quả:** Thắng Súng, Móc, Nạp Đạn; thua Kíp, Kéo, Zombie, Magic Hand; hòa Khiên, Siêu Khiên
**Hiệu ứng nội tại:**
- Thắng: đối thủ mất thêm **1 đạn** ngoài mạng (phá vỡ tích lũy của đối thủ)

#### 🧟 Zombie (`zombie`) — 3 đạn
**Kết quả:** Thắng Súng, Kíp, Shotgun, Móc, Nạp Đạn; thua Kéo, Mìn; hòa Khiên, Siêu Khiên
**Hiệu ứng nội tại:**
- Thắng: đối thủ bị **choáng** — lượt sau chỉ được dùng nước 0 đạn

---

### Hệ Đặc Biệt

> Chi phí 2–5 đạn. Nằm ngoài vòng tròn chính — không bị khắc chế bởi hệ Xanh hay Đỏ thông thường, nhưng đều thua Mìn.

#### ⚡ Siêu Khiên (`sieu_khien`) — 2 đạn
**Kết quả:** Hòa tất cả trừ Mìn (thua); không thua bất kỳ nước nào khác
**Hiệu ứng nội tại:**
- Đỡ thành công đòn tốn ≥ 2 đạn (Shotgun, Zombie, Magic Hand): **hoàn lại 1 đạn**
- Downside thực tế: nếu đối thủ dùng Nạp Đạn, bạn tiêu 2 đạn mà chỉ hòa — mất lợi thế kinh tế

#### ✋ Magic Hand (`magic_hand`) — 5 đạn
**Kết quả:** Thắng tất cả trừ Mìn (thua) và Siêu Khiên (hòa)
**Hiệu ứng nội tại:**
- Thắng: đối thủ **không thể dùng nước đắt nhất** của họ lượt tiếp theo (khóa lựa chọn)

---

### Bảng quan hệ giữa các hệ

```
Đỏ      → thắng Vàng (trừ Mìn)
Xanh    → thắng/phản Đỏ
Vàng    → Mìn thắng Đặc Biệt
Đặc Biệt → thắng Xanh và Đỏ; thua Mìn
```

> Trong cùng hệ Đỏ: Shotgun > Súng về sức mạnh tổng thể (đắt hơn, thắng nhiều hơn).
> Zombie là nước đắt nhất Đỏ nhưng có điểm yếu rõ (Kéo, Mìn) — đánh đổi có chủ đích.

---

## 5. Time Bank

- Mỗi người bắt đầu với **15 giây** tích lũy cho cả ván (không phải per-lượt)
- Thời gian trôi qua trong một lượt bị trừ khỏi bank khi bạn submit nước đi
- Người submit trước: +1s hoàn lại; người submit sau: +0.5s hoàn lại
- **Hết bank trong một lượt** → mất 1 mạng, lượt đó bị bỏ qua hoàn toàn
- Áp lực tăng dần theo ván — người chơi chậm sẽ cảm thấy nguy hiểm hơn ở cuối ván

---

## 6. Augments

Chọn trước ván, hiệu lực suốt ván. Cả hai thấy augment của nhau sau khi đã chọn.

| Augment | Hiệu ứng | Đánh giá |
|---------|----------|----------|
| ⚡ Tăng Tốc | Đối thủ chỉ có 7.5s bank | Gây áp lực timeout, mạnh ở cuối ván |
| 🐢 Giảm Tốc | Bạn có 22.5s bank | Thoải mái suy nghĩ, yếu hơn Tăng Tốc về tác động |
| ❤️ Thêm Mạng | Bắt đầu 4 mạng | Ổn định, không có downside |
| 💔 Yếu Đối Thủ | Đối thủ chỉ có 2 mạng | **Cần rebalance** — quá mạnh so với các augment còn lại |
| 💣 Đạn Ngay | +1 đạn ngay, mất 1 mạng; lượt 3 nhận thêm 3 đạn | High risk/reward, phù hợp lối chơi aggressive |
| 🏆 Bền Lâu | Sau lượt 10: +2 mạng | Yếu nếu ván kết thúc sớm |

**Vấn đề cân bằng cần xem xét:**
- Yếu Đối Thủ hiệu quả tương đương 1 lượt thắng miễn phí — cân nhắc giảm xuống còn 2.5 mạng hoặc thêm downside
- Bền Lâu cần buff hoặc giảm ngưỡng (lượt 7 thay vì 10) để có giá trị thực tế

---

## 7. Combo Chain — Chuỗi đòn

Thưởng cho người đọc đúng đối thủ liên tiếp; tạo đà thắng/thua rõ ràng.

### Streak thắng
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thắng 2 lượt liên tiếp | Lượt 3 được dùng 1 nước miễn phí (không tốn đạn) |
| Thắng 2 lượt liên tiếp bằng cùng một hệ | Nước đó được buff nhẹ lượt tiếp (ví dụ: Súng lấy 2 mạng) |

### Comeback mechanic
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thua 2 lượt liên tiếp | Nhận 1 đạn miễn phí (giảm khoảng cách, không xoay ngược quá mạnh) |

**Lưu ý thiết kế:** Comeback mechanic chỉ cho đạn, không cho mạng — để không phủ nhận hoàn toàn lợi thế của người đang thắng.

---

## 8. Resource Conversion — Chuyển đổi tài nguyên

Lựa chọn có thể thực hiện trong lượt chọn nước đi, thay thế cho việc chọn nước đi thông thường.

| Hành động | Chi phí | Nhận |
|-----------|---------|------|
| Đổi mạng lấy đạn | 1 mạng | +3 đạn ngay lập tức |
| Đổi đạn lấy mạng | 3 đạn | +1 mạng |

**Khi nào hữu ích:**
- Đổi mạng → đạn: khi còn nhiều mạng, cần đạn gấp để dùng Zombie/Magic Hand
- Đổi đạn → mạng: khi còn 1 mạng và có nhiều đạn dư, không muốn thua vì một lượt xui

**Lưu ý thiết kế:**
- Lượt dùng Resource Conversion, đối thủ vẫn chọn nước đi bình thường — người dùng Conversion không tham gia chiến đấu lượt đó (bỏ lượt)
- Điều này tạo rủi ro: đối thủ biết bạn bỏ lượt có thể lợi dụng hoặc cũng có thể bị đọc ngược

---

## 9. Trạng thái người chơi (Player State)

Tại bất kỳ thời điểm nào, mỗi người chơi có các thông số:

```
{
  lives: number,          // mạng hiện tại
  bullets: number,        // đạn hiện tại
  timeBank: number,       // giây còn lại
  napStreak: number,      // số lần nạp liên tiếp
  cooldown: boolean,      // đang bị cooldown nạp không
  winStreak: number,      // số lượt thắng liên tiếp
  loseStreak: number,     // số lượt thua liên tiếp
  debuff: string|null,    // debuff hiện tại (choáng, khóa nước, ...)
  augment: string,        // augment đang dùng
}
```

---

## 10. Thứ tự xử lý một lượt

1. Cả hai submit nước đi (hoặc Resource Conversion)
2. Kiểm tra debuff (choáng → bắt buộc dùng nước 0 đạn; khóa nước → loại bỏ lựa chọn đắt nhất)
3. Kiểm tra hợp lệ (đủ đạn, không cooldown)
4. Tra MATRIX → xác định thắng/thua/hòa
5. Áp dụng hiệu ứng nội tại của quân thắng
6. Áp dụng Combo Chain (cập nhật winStreak/loseStreak, phát thưởng nếu đủ điều kiện)
7. Cập nhật trạng thái (mạng, đạn, debuff lượt sau)
8. Reset firstToMove, cập nhật timeBank
9. Kiểm tra game over

---

## 11. Vấn đề mở — cần quyết định

- [ ] **Yếu Đối Thủ:** giảm về 2.5 mạng hay thêm downside gì?
- [ ] **Bền Lâu:** giảm ngưỡng xuống lượt 7, hay thay bằng cơ chế khác?
- [ ] **Resource Conversion bỏ lượt:** có nên cho phép nếu đang bị choáng không? (đang choáng mà đổi tài nguyên thì thoát được debuff)
- [ ] **Combo Chain buff hệ:** Súng lần 2 lấy 2 mạng có quá mạnh khi kết hợp với Kíp phản không?
- [ ] **Siêu Khiên:** có cần thêm downside nào không, hay downside kinh tế (hòa khi đối thủ nạp) đã đủ?

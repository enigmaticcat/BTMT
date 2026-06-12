# Mind Clash — Bản Thiết Kế Gameplay Toàn Diện

---

## 1. Tổng quan

**Thể loại:** Đấu tâm lý 1v1, đồng thời (simultaneous action)
**Cốt lõi:** Cả hai người chơi bí mật chọn nước đi rồi tiết lộ cùng lúc. Không ai biết trước đối thủ chọn gì. Chiến thắng đến từ việc đọc và dự đoán đối thủ.
**Điều kiện thắng:** Đưa HP đối thủ về 0.

---

## 2. Tài nguyên

### HP
- Bắt đầu: **100 HP**
- Liên tục — không phải mạng rời rạc
- Về 0 → thua ván

### Đạn
- Bắt đầu: **0 đạn**
- Dùng để trả chi phí nước đi
- Tích lũy qua Nạp Đạn hoặc hiệu ứng đặc biệt
- Không có giới hạn tối đa

### Mối quan hệ HP và Đạn
Có thể chuyển đổi qua Resource Conversion (xem phần 8) — quyết định chiến lược, không phải augment hay nước đi riêng.

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
3. Xác định thắng/thua/hòa qua MATRIX
4. Áp dụng damage + hiệu ứng nội tại + phòng thủ
5. Áp dụng Combo Chain
6. Cập nhật trạng thái (HP, đạn, streak, debuff)
7. Chờ 3.5s → lượt tiếp theo

---

## 4. Hệ thống nước đi

### Nguyên tắc cốt lõi
- **Trong cùng hệ:** nước đắt hơn thắng nước rẻ hơn — không có ngoại lệ
- **Giữa các hệ:** mỗi hệ có quan hệ khắc chế cụ thể
- **Mỗi quân:** có damage riêng và hiệu ứng nội tại riêng

---

### Hệ Vàng — Tích Lũy

> Không tốn đạn. Vai trò: xây dựng tài nguyên và đặt bẫy.

#### 🔋 Nạp Đạn (`nap`) — 0 đạn | 0 damage
**Kết quả:** Hòa với hệ Xanh và Vàng; thua mọi nước hệ Đỏ và Đặc Biệt
**Hiệu ứng nội tại:**
- Lần nạp đầu: +1 đạn
- Nạp liên tiếp lần 2 trở đi: +2 đạn mỗi lần
- Sau 2 lần nạp liên tiếp: bị **cooldown** (không nạp được lượt kế)
- Nếu bị tấn công lúc nạp: nhận damage bình thường nhưng **giữ lại đạn vừa nạp**

#### 💣 Mìn (`min`) — 0 đạn | 60 damage (nếu trúng)
**Kết quả:** Thắng Zombie và Magic Hand; thua tất cả còn lại
**Hiệu ứng nội tại:**
- Trúng (thắng): đối thủ nhận **60 damage**
- Tự nổ (thua): bản thân nhận **25 damage** thay vì damage của đòn đối thủ — penalty có kiểm soát, không "chết ngay"

---

### Hệ Xanh — Kỹ Thuật

> Chi phí 0–1 đạn. Vai trò: phản công và vô hiệu hóa hệ Đỏ.

#### 🛡️ Khiên (`khien`) — 0 đạn
**Kết quả:** Hòa Súng, Shotgun, Zombie; thua Móc và Magic Hand; thắng Mìn
**Cơ chế phòng thủ:** Giảm **60% damage** nhận vào từ hệ Đỏ (trừ Móc)

| Đòn vào | Damage gốc | Sau Khiên |
|---------|-----------|-----------|
| Súng | 20 | 8 |
| Shotgun | 35 | 14 |
| Zombie | 50 | 20 |

**Hiệu ứng nội tại:** Đỡ thành công → **+1 đạn** lượt sau

#### 🧨 Kíp (`kip`) — 0 đạn
**Kết quả:** Thắng Súng và Shotgun; thua Zombie; hòa còn lại
**Cơ chế phản đòn:** Khi phản thành công, đối thủ nhận **80% damage gốc của đòn bị phản**, bản thân nhận 0 damage. Ngoài ra đối thủ mất toàn bộ đạn đã bỏ ra.

| Đòn bị phản | Damage gốc | Damage phản lại |
|-------------|-----------|----------------|
| Súng (1đ) | 20 | 16 + mất 1đ |
| Shotgun (2đ) | 35 | 28 + mất 2đ |

#### ✂️ Kéo (`keo`) — 1 đạn | 10 damage
**Kết quả:** Thắng Shotgun và Zombie; hòa Súng, Khiên, Kíp, Móc; thua Magic Hand
**Hiệu ứng nội tại:** Không có hiệu ứng phụ — sức mạnh nằm ở khắc chế hai nước đắt nhất hệ Đỏ với chi phí chỉ 1 đạn

---

### Hệ Đỏ — Tấn Công

> Chi phí 1–3 đạn. Vai trò: gây damage trực tiếp. Thắng hệ Vàng, thua hệ Xanh.

#### 🔫 Súng (`sung`) — 1 đạn | 20 damage
**Kết quả:** Thắng Nạp Đạn; hòa Khiên, Kéo; thua Kíp, Shotgun, Zombie, Magic Hand
**Hiệu ứng nội tại:** Không có — nước tấn công baseline

#### 🪝 Móc (`moc`) — 1 đạn | 15 damage
**Kết quả:** Thắng Khiên và Nạp Đạn; thua Súng, Shotgun, Zombie, Magic Hand
**Hiệu ứng nội tại:** Thắng → **cướp 1 đạn từ đối thủ** sang mình (ngoài 15 damage)

#### 🔥 Shotgun (`shotgun`) — 2 đạn | 35 damage
**Kết quả:** Thắng Súng, Móc, Nạp Đạn; thua Kíp, Kéo, Zombie, Magic Hand; hòa Khiên, Siêu Khiên
**Hiệu ứng nội tại:** Thắng → đối thủ mất thêm **1 đạn** ngoài 35 damage

#### 🧟 Zombie (`zombie`) — 3 đạn | 50 damage
**Kết quả:** Thắng Súng, Kíp, Shotgun, Móc, Nạp Đạn; thua Kéo, Mìn; hòa Khiên, Siêu Khiên
**Hiệu ứng nội tại:** Thắng → đối thủ bị **choáng**: lượt sau chỉ được dùng nước 0 đạn

---

### Hệ Đặc Biệt

> Chi phí 2–5 đạn. Nằm ngoài vòng tròn chính — đều thua Mìn.

#### ⚡ Siêu Khiên (`sieu_khien`) — 2 đạn
**Kết quả:** Hòa tất cả trừ Mìn (thua)
**Cơ chế phòng thủ:** Giảm **100% damage** từ mọi nguồn (trừ Mìn)
**Hiệu ứng nội tại:** Đỡ thành công đòn tốn ≥ 2 đạn → **hoàn lại 1 đạn**
**Downside:** Nếu đối thủ Nạp Đạn → bạn tiêu 2 đạn mà chỉ hòa, mất lợi thế kinh tế hoàn toàn

#### ✋ Magic Hand (`magic_hand`) — 5 đạn | 70 damage
**Kết quả:** Thắng tất cả trừ Mìn (thua) và Siêu Khiên (hòa)
**Hiệu ứng nội tại:** Thắng → đối thủ **không thể dùng nước đắt nhất** của họ lượt tiếp theo

---

### Bảng damage tổng hợp

| Vũ khí | Chi phí | Damage | Hiệu ứng thêm |
|--------|---------|--------|--------------|
| 🔋 Nạp Đạn | 0 | 0 | +1/+2 đạn |
| 💣 Mìn (trúng) | 0 | 60 | — |
| 💣 Mìn (tự nổ) | 0 | −25 (tự nhận) | — |
| 🛡️ Khiên | 0 | 0 | Giảm 60% damage vào; +1đ nếu đỡ được |
| 🧨 Kíp | 0 | 0 (phản 80%) | Đối thủ mất đạn đã bỏ |
| ✂️ Kéo | 1 | 10 | — |
| 🔫 Súng | 1 | 20 | — |
| 🪝 Móc | 1 | 15 | Cướp 1 đạn đối thủ |
| 🔥 Shotgun | 2 | 35 | Đối thủ mất thêm 1 đạn |
| ⚡ Siêu Khiên | 2 | 0 | Giảm 100% damage vào; hoàn 1đ nếu đỡ đòn ≥2đ |
| 🧟 Zombie | 3 | 50 | Đối thủ bị choáng 1 lượt |
| ✋ Magic Hand | 5 | 70 | Khóa nước đắt nhất của đối thủ 1 lượt |

---

### Quan hệ giữa các hệ

```
Đỏ      → thắng Vàng (trừ Mìn)
Xanh    → thắng/phản Đỏ
Vàng    → Mìn thắng Đặc Biệt
Đặc Biệt → thắng Xanh và Đỏ; thua Mìn
```

---

## 5. Time Bank

- Mỗi người bắt đầu với **15 giây** tích lũy cho cả ván (không phải per-lượt)
- Thời gian trôi qua trong một lượt bị trừ khỏi bank khi submit
- Người submit trước: +1s hoàn lại; người submit sau: +0.5s hoàn lại
- **Hết bank trong một lượt** → nhận **20 damage** (thay cho việc mất mạng cứng như cũ), lượt bị bỏ qua

---

## 6. Augments

Chọn trước ván, hiệu lực suốt ván. Cả hai thấy augment của nhau sau khi đã chọn.

| Augment | Hiệu ứng | Ghi chú |
|---------|----------|---------|
| ⚡ Tăng Tốc | Đối thủ chỉ có 7.5s bank | Gây áp lực timeout liên tục |
| 🐢 Giảm Tốc | Bạn có 22.5s bank | Thoải mái suy nghĩ |
| ❤️ Thêm Máu | Bắt đầu với 130 HP | Thay cho "thêm mạng" |
| 💔 Yếu Đối Thủ | Đối thủ bắt đầu với 70 HP | Cần rebalance — xem vấn đề mở |
| 💣 Đạn Ngay | +1 đạn ngay, −20 HP (bắt đầu 80 HP); lượt 3 nhận thêm 3 đạn | High risk/reward |
| 🏆 Bền Lâu | Sau lượt 7: +30 HP | Giảm ngưỡng từ lượt 10, buff lượng HP thay vì mạng |

---

## 7. Combo Chain — Chuỗi đòn

Thưởng cho việc đọc đúng đối thủ liên tiếp. Cần thêm `winStreak` và `loseStreak` vào player state.

### Streak thắng
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thắng 2 lượt liên tiếp | Lượt 3 được dùng 1 nước miễn phí (cost = 0 cho lượt đó) |
| Thắng 2 lượt liên tiếp bằng cùng một hệ | Damage của nước đó +10 lượt tiếp — chỉ áp dụng hệ Đỏ |

### Comeback mechanic
| Điều kiện | Phần thưởng |
|-----------|-------------|
| Thua 2 lượt liên tiếp | +1 đạn miễn phí |

**Lưu ý:** Streak reset về 0 khi thua. Hòa không reset, không tăng streak.

---

## 8. Resource Conversion — Chuyển đổi tài nguyên

Xảy ra **sau khi resolve** lượt, không thay thế nước đi — giữ được tính đồng thời.

| Hành động | Chi phí | Nhận |
|-----------|---------|------|
| Đổi HP lấy đạn | −20 HP | +3 đạn |
| Đổi đạn lấy HP | −3 đạn | +20 HP |

**Khi nào hữu ích:**
- Đổi HP → đạn: khi HP còn nhiều, cần đạn gấp để dùng Zombie/Magic Hand
- Đổi đạn → HP: khi HP thấp nguy hiểm và có đạn dư

---

## 9. Trạng thái người chơi (Player State)

```
{
  hp: number,             // HP hiện tại (0–100+)
  bullets: number,        // đạn hiện tại
  timeBank: number,       // giây còn lại
  napStreak: number,      // số lần nạp liên tiếp
  cooldown: boolean,      // đang bị cooldown nạp không
  winStreak: number,      // số lượt thắng liên tiếp
  loseStreak: number,     // số lượt thua liên tiếp
  debuff: string|null,    // 'stun' (choáng) | 'lock' (khóa nước) | null
  augment: string,        // augment đang dùng
}
```

---

## 10. Thứ tự xử lý một lượt

1. Cả hai submit nước đi
2. Kiểm tra debuff (`stun` → chỉ được nước 0 đạn; `lock` → loại nước đắt nhất)
3. Kiểm tra hợp lệ (đủ đạn, không cooldown)
4. Tra MATRIX → xác định thắng/thua/hòa
5. Tính damage: damage gốc × hệ số phòng thủ (nếu có Khiên/Siêu Khiên)
6. Trừ HP, áp dụng hiệu ứng nội tại (cướp đạn, choáng, hoàn đạn, khóa nước...)
7. Áp dụng Combo Chain (cập nhật winStreak/loseStreak, phát thưởng nếu đủ điều kiện)
8. Xử lý Resource Conversion nếu người chơi chọn
9. Reset firstToMove, cập nhật timeBank, xóa debuff đã hết hạn
10. Kiểm tra game over (hp ≤ 0)

---

## 11. Vấn đề mở — cần quyết định trước khi implement

- [ ] **Yếu Đối Thủ:** 70 HP có đủ penalty không, hay cần thêm downside cho người chọn?
- [ ] **Mìn tự nổ:** 25 damage có đủ deterrent không, hay tăng lên 30–35?
- [ ] **Debuff stack:** choáng của Zombie và lock của Magic Hand có thể cùng tồn tại không?
- [ ] **Combo Chain buff hệ:** +10 damage có quá mạnh với Shotgun (35→45) không?
- [ ] **Resource Conversion timing:** có cho phép dùng nhiều lần trong một lượt không (ví dụ đổi 2 lần liên tiếp)?
- [ ] **Timeout damage:** 20 HP có phù hợp không — đủ để tạo áp lực mà không quá punishing?

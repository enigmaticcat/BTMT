# Mind Clash — Tài Liệu Thiết Kế

## Cơ chế hiện tại

### Nền tảng
- 1v1 đồng thời: cả hai chọn nước đi bí mật, tiết lộ cùng lúc
- Tài nguyên: **mạng** (bắt đầu 3) và **đạn** (bắt đầu 0)
- Thắng khi đối thủ về 0 mạng

### 11 nước đi, chia 4 hệ

**Hệ Vàng — Tích Lũy** (0 đạn)
| Quân | Chi phí | Vai trò |
|------|---------|---------|
| Nạp Đạn | 0 | +1 đạn; combo liên tiếp +2; sau 2 lần liên tiếp bị cooldown |
| Mìn | 0 | Bẫy: thắng Zombie và Magic Hand, thua mọi thứ còn lại |

**Hệ Xanh — Kỹ Thuật** (0–1 đạn)
| Quân | Chi phí | Vai trò |
|------|---------|---------|
| Khiên | 0 | Chặn hệ Đỏ, trừ Móc |
| Kíp | 0 | Phản Súng và Shotgun |
| Kéo | 1 | Diệt Shotgun và Zombie |

**Hệ Đỏ — Tấn Công** (1–3 đạn)
| Quân | Chi phí | Vai trò |
|------|---------|---------|
| Súng | 1 | Tấn công cơ bản, thắng Nạp Đạn |
| Móc | 1 | Phá Khiên |
| Shotgun | 2 | Tấn công mạnh, thắng Súng |
| Zombie | 3 | Càn quét diện rộng, thua Kéo và Mìn |

**Hệ Đặc Biệt** (2–5 đạn)
| Quân | Chi phí | Vai trò |
|------|---------|---------|
| Siêu Khiên | 2 | Chặn mọi tấn công, chỉ hòa hoặc thua Mìn |
| Magic Hand | 5 | Thắng tất cả trừ Mìn |

### Quan hệ giữa các hệ
```
Đỏ → thắng Vàng
Xanh → thắng Đỏ
Vàng (Mìn) → thắng Đặc Biệt
Đặc Biệt → thắng Xanh và Đỏ (trừ Mìn)
```

### Time Bank
- Mỗi người có 15s tích lũy cả ván (không phải per-lượt)
- Thời gian trôi bị trừ khi submit; người submit trước +1s, sau +0.5s
- Hết bank trong một lượt → mất 1 mạng, lượt bị bỏ qua

### Augments (chọn trước ván, 1 trong 3 random)
| Augment | Hiệu ứng |
|---------|----------|
| Tăng Tốc | Đối thủ chỉ có 7.5s bank |
| Giảm Tốc | Bạn có 22.5s bank |
| Thêm Mạng | Bắt đầu 4 mạng |
| Yếu Đối Thủ | Đối thủ chỉ có 2 mạng |
| Đạn Ngay | +1 đạn ngay, mất 1 mạng; lượt 3 nhận thêm 3 đạn |
| Bền Lâu | Sau lượt 10: +2 mạng |

---

## Vấn đề cần giải quyết

### Cân bằng
- **Weak Opponent** quá mạnh so với các augment còn lại — tương đương 1 lượt thắng miễn phí
- **Siêu Khiên** chi phí 2 đạn nhưng worst case chỉ hòa, tạo xu hướng spam phòng thủ khi nhiều đạn
- **Magic Hand** (5 đạn) quá đắt để tích lũy trong thực chiến — hiếm khi được dùng

### Độ phức tạp
- Ma trận 11×11 không có cấu trúc suy luận được → người mới phải học thuộc
- Cần UI hỗ trợ: tooltip "thắng X, thua Y" khi hover vào từng quân

---

## Hướng phát triển

### 1. Hiệu ứng nội tại (Internal Effects)

Mỗi quân có hiệu ứng riêng ngoài thắng/thua, ảnh hưởng trạng thái game:

| Quân | Hiệu ứng đề xuất |
|------|-----------------|
| Zombie thắng | Đối thủ bị choáng — lượt sau chỉ dùng được nước 0 đạn |
| Shotgun thắng | Đối thủ mất thêm 1 đạn ngoài mạng |
| Móc thắng | Lấy 1 đạn từ đối thủ sang mình |
| Kíp phản thành công | Đối thủ mất mạng + mất toàn bộ đạn đã bỏ ra |
| Khiên đỡ thành công | Nhận 1 đạn miễn phí lượt sau |
| Mìn nổ trúng | Đối thủ mất 2 mạng (xứng với rủi ro cao) |
| Nạp bị tấn công | Mất mạng nhưng giữ lại đạn vừa nạp |
| Siêu Khiên đỡ đòn ≥ 2 đạn | Hoàn lại 1 đạn |
| Magic Hand thắng | Đối thủ không dùng được nước đắt nhất lượt sau |

### 2. Combo Chain — Chuỗi đòn

Thưởng cho việc đọc đúng đối thủ liên tiếp:

- **Thắng 2 lượt liên tiếp** → lượt 3 được dùng 1 nước miễn phí (không tốn đạn)
- **Thắng bằng cùng một hệ 2 lần liên tiếp** → nước đó mạnh hơn lượt sau (ví dụ Súng lấy 2 mạng)
- **Thua 2 lượt liên tiếp** → comeback mechanic: nhận 1 đạn miễn phí

Tạo ra cảm giác đà thắng/thua rõ ràng, thưởng cho người đọc được pattern đối thủ.

### 3. Resource Conversion — Chuyển đổi tài nguyên

Đạn và mạng không tách biệt hoàn toàn:

- **Chủ động hy sinh 1 mạng** → nhận 3 đạn ngay lập tức (lựa chọn trong game, không phải augment)
- **Tiêu 3 đạn** → hồi 1 mạng
- Một số quân khi thắng cho phép **cướp đạn** thay vì lấy mạng

Tạo ra quyết định chiến lược: khi nào nên đánh đổi mạng lấy đạn và ngược lại.

---

## Nguyên tắc thiết kế cốt lõi

1. **Trong cùng hệ, mạnh hơn (đắt hơn) thì thắng** — không có chuyện nước rẻ hơn thắng nước đắt hơn trong cùng hệ, hoặc nếu có thì cực kỳ hạn chế
2. **Mỗi hệ có ít nhất một nước khiến đối thủ "sợ"** dù biết bạn đang trong hệ đó
3. **Chiều sâu đến từ thông tin bất đối xứng**: biết đối thủ có bao nhiêu đạn nhưng không biết họ sẽ dùng nước nào
4. **Dễ học, khó thành thạo**: người mới hiểu được trong 2 phút, chiều sâu tự khám phá dần

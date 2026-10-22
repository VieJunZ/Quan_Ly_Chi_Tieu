# Tạo ảnh mẫu để kiểm thử đọc hóa đơn / ảnh ngân hàng.
# Chạy: powershell -ExecutionPolicy Bypass -File tests\fixtures\tao_anh_mau.ps1
Add-Type -AssemblyName System.Drawing
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

function New-Picture($name, $width, $height, $background, $lines) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.ColorTranslator]::FromHtml($background))
    foreach ($l in $lines) {
        if ($l.box) {
            $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($l.box))
            $g.FillRectangle($brush, $l.x, $l.y, $l.w, $l.h)
            continue
        }
        $style = if ($l.bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }
        $font = New-Object System.Drawing.Font ($(if ($l.font) { $l.font } else { "Arial" })), $l.size, $style, ([System.Drawing.GraphicsUnit]::Pixel)
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($l.color))
        $g.DrawString($l.text, $font, $brush, $l.x, $l.y)
        if ($l.right) {
            $size = $g.MeasureString($l.right, $font)
            $g.DrawString($l.right, $font, $brush, ($width - 40 - $size.Width), $l.y)
        }
    }
    $g.Dispose()
    $bmp.Save((Join-Path $dir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Đã tạo $name"
}

$ink = "#222222"

# 1. Hóa đơn quán (có tiền khách đưa và tiền thừa lớn hơn tổng)
$y = 30
$receipt = @(
    @{ text = "PHUC LONG COFFEE & TEA"; size = 34; bold = $true; color = $ink; x = 90; y = $y },
    @{ text = "123 Nguyễn Trãi, Quận 5, TP.HCM"; size = 22; color = $ink; x = 110; y = ($y += 50) },
    @{ text = "HÓA ĐƠN THANH TOÁN"; size = 30; bold = $true; color = $ink; x = 140; y = ($y += 60) },
    @{ text = "Ngày: 15/10/2026   Giờ: 08:42"; size = 24; color = $ink; x = 40; y = ($y += 60) },
    @{ text = "Thu ngân: Lan"; size = 24; color = $ink; x = 40; y = ($y += 36) },
    @{ text = "Trà sữa Phúc Long x1"; size = 26; color = $ink; x = 40; y = ($y += 60); right = "55.000" },
    @{ text = "Bánh mì que x2"; size = 26; color = $ink; x = 40; y = ($y += 44); right = "30.000" },
    @{ text = "Tạm tính"; size = 26; color = $ink; x = 40; y = ($y += 60); right = "85.000" },
    @{ text = "Giảm giá"; size = 26; color = $ink; x = 40; y = ($y += 44); right = "-10.000" },
    @{ text = "TỔNG CỘNG"; size = 32; bold = $true; color = $ink; x = 40; y = ($y += 56); right = "75.000" },
    @{ text = "Tiền khách đưa"; size = 26; color = $ink; x = 40; y = ($y += 60); right = "100.000" },
    @{ text = "Tiền thừa"; size = 26; color = $ink; x = 40; y = ($y += 44); right = "25.000" },
    @{ text = "Cảm ơn quý khách!"; size = 26; color = $ink; x = 170; y = ($y += 80) }
)
New-Picture "hoa_don.png" 600 ($y + 80) "#FFFFFF" $receipt

# 2. Màn hình chuyển tiền thành công, phía trên có banner số dư lớn hơn số tiền chuyển
$green = "#0A8F4E"
$transfer = @(
    @{ box = "#0B3D91"; x = 0; y = 0; w = 720; h = 190 },
    @{ text = "Số dư khả dụng"; size = 28; color = "#FFFFFF"; x = 40; y = 40 },
    @{ text = "8.765.432 VND"; size = 52; bold = $true; color = "#FFFFFF"; x = 40; y = 85 },
    @{ text = "Chuyển tiền thành công"; size = 40; bold = $true; color = $green; x = 140; y = 260 },
    @{ text = "250.000 VND"; size = 64; bold = $true; color = $ink; x = 170; y = 330 },
    @{ text = "Người nhận"; size = 28; color = "#666666"; x = 40; y = 470; right = "NGUYEN VAN AN" },
    @{ text = "Ngân hàng nhận"; size = 28; color = "#666666"; x = 40; y = 530; right = "Techcombank" },
    @{ text = "Nội dung: tra tien an trua"; size = 28; color = "#666666"; x = 40; y = 590 },
    @{ text = "Mã giao dịch"; size = 28; color = "#666666"; x = 40; y = 650; right = "FT26288123456" },
    @{ text = "Thời gian"; size = 28; color = "#666666"; x = 40; y = 710; right = "14:05 15/10/2026" },
    @{ text = "Phí giao dịch"; size = 28; color = "#666666"; x = 40; y = 770; right = "Miễn phí" }
)
New-Picture "chuyen_khoan.png" 720 860 "#F5F7FA" $transfer

# 3. Thông báo biến động số dư (ảnh chụp màn hình thông báo trên điện thoại)
$notify = @(
    @{ box = "#FFFFFF"; x = 20; y = 20; w = 680; h = 230 },
    @{ text = "MB Bank  ·  bây giờ"; size = 24; bold = $true; color = "#333333"; x = 40; y = 35 },
    @{ text = "TK 0123xxx456|GD: -180,000VND 13/10/26 19:45"; size = 26; color = $ink; x = 40; y = 80 },
    @{ text = "|SD: 1,020,000VND|ND: tien dien thang 10"; size = 26; color = $ink; x = 40; y = 120 },
    @{ text = "Biến động số dư tài khoản"; size = 22; color = "#777777"; x = 40; y = 180 }
)
New-Picture "thong_bao_ngan_hang.png" 720 270 "#D9DDE3" $notify

# 4. Nhận tiền, giao diện nền tối
$dark = @(
    @{ text = "Nhận tiền thành công"; size = 40; bold = $true; color = "#4ADE80"; x = 150; y = 60 },
    @{ text = "+1.500.000 đ"; size = 64; bold = $true; color = "#FFFFFF"; x = 170; y = 130 },
    @{ text = "Người chuyển: TRAN THI B"; size = 28; color = "#C7CBD1"; x = 40; y = 260 },
    @{ text = "Nội dung: luong part time"; size = 28; color = "#C7CBD1"; x = 40; y = 320 },
    @{ text = "10:20 12/10/2026"; size = 28; color = "#C7CBD1"; x = 40; y = 380 },
    @{ text = "Số dư: 9.876.000 đ"; size = 28; color = "#C7CBD1"; x = 40; y = 440 }
)
New-Picture "nhan_tien_nen_toi.png" 720 520 "#111418" $dark

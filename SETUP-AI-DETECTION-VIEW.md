# 📋 INSTRUKSI: Setup AI Detection View Page

## ✅ Backend (SUDAH SELESAI)

### Endpoint Aktif:
```
GET http://localhost:4000/api/coliform/ai-prediction/history?limit=20
```

### Response Format:
```json
{
  "status": "success",
  "message": "AI Prediction history retrieved successfully",
  "data": [
    {
      "id": 8,
      "timestamp": "2025-11-08T11:10:45.000Z",
      "mpn_value": 69.3473,
      "status": "Bahaya"
    }
  ],
  "count": 5
}
```

---

## 📁 Frontend: Copy File-file Ini

### 1️⃣ **Page Component**
**Source:** `COPY-TO-FRONTEND-aidetectionview-page.tsx`  
**Destination:** 
```
c:\Users\Asus\Desktop\Capstone\Colivera v2\Colivera-Prototype\src\app\dashboard\(others-pages)\aidetectionview\page.tsx
```

**Steps:**
1. Buat folder baru: `aidetectionview` di dalam `(others-pages)`
2. Copy file `COPY-TO-FRONTEND-aidetectionview-page.tsx`
3. Rename jadi `page.tsx`

---

### 2️⃣ **Table Component**
**Source:** `COPY-TO-FRONTEND-AIDetectionHistoryTable.tsx`  
**Destination:** 
```
c:\Users\Asus\Desktop\Capstone\Colivera v2\Colivera-Prototype\src\components\ecommerce\AIDetectionHistoryTable.tsx
```

**Steps:**
1. Copy file `COPY-TO-FRONTEND-AIDetectionHistoryTable.tsx`
2. Paste ke folder `src\components\ecommerce\`
3. Rename jadi `AIDetectionHistoryTable.tsx`

---

## 🔗 Route URL

Setelah setup selesai, halaman AI Detection View bisa diakses di:
```
http://localhost:3000/dashboard/aidetectionview
```

---

## 📊 Komponen yang Digunakan

### Dari Halaman (page.tsx):
- **TotalColiformAI** → Chart MPN AI Prediction (sudah ada, updated dengan fetch dari database)
- **AIDetectionHistoryTable** → Tabel riwayat AI prediction (file baru)

### Features Tabel:
✅ Fetch dari backend `/api/coliform/ai-prediction/history`  
✅ Auto-refresh setiap 1 menit  
✅ Status badge dengan warna (Aman=hijau, Waspada=kuning, Bahaya=merah)  
✅ Format timestamp Indonesia  
✅ Dark mode support  
✅ Loading state  
✅ Error handling  

---

## 🧪 Testing

### 1. Cek Backend Running:
```bash
# Di terminal backend
npm start
```

### 2. Test Endpoint:
```powershell
Invoke-WebRequest -Uri 'http://localhost:4000/api/coliform/ai-prediction/history?limit=5' -UseBasicParsing | Select-Object -ExpandProperty Content
```

### 3. Jalankan Frontend:
```bash
# Di terminal frontend
cd "c:\Users\Asus\Desktop\Capstone\Colivera v2\Colivera-Prototype"
npm run dev
```

### 4. Akses Halaman:
```
http://localhost:3000/dashboard/aidetectionview
```

---

## 📋 Checklist

- [ ] Backend server running (port 4000)
- [ ] File `page.tsx` sudah di-copy ke folder `aidetectionview`
- [ ] File `AIDetectionHistoryTable.tsx` sudah di-copy ke folder `components/ecommerce`
- [ ] Component `TotalColiformAI` sudah updated (fetch dari database, bukan real-time API)
- [ ] Frontend server running (port 3000)
- [ ] Halaman `/dashboard/aidetectionview` bisa diakses
- [ ] Tabel menampilkan data AI prediction history
- [ ] Chart menampilkan trend MPN AI prediction

---

## 🎯 Expected Result

Halaman AI Detection View akan menampilkan:
1. **Header** dengan back button ke dashboard
2. **Chart** Total Coliform (AI Prediction) - line chart dengan data historical dari database
3. **Table** Keterangan & Log Prediksi dengan kolom:
   - Timestamp (format Indonesia)
   - MPN Value (format 2 desimal)
   - Status (badge berwarna: Aman/Waspada/Bahaya)

---

## 🐛 Troubleshooting

### Tabel tidak muncul data:
1. Cek console browser untuk error
2. Cek backend server masih running
3. Cek endpoint dengan curl/Postman
4. Pastikan database `total_coliform_ai_prediction` ada data

### Chart tidak muncul:
1. Cek component `TotalColiformAI` sudah updated
2. Endpoint `/api/sensor/coliform/history?source=ai_prediction` harus return data

### Error CORS:
- Backend sudah setup CORS, tapi pastikan origin `http://localhost:3000` diizinkan

---

✅ **SELESAI!** Halaman AI Detection View siap digunakan!

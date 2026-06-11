const pool = require('../config/database');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios'); // Vẫn giữ axios để gọi sang Python
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 🌟 IMPORT THƯ VIỆN MỚI

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Khởi tạo bộ máy Google AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const diseaseController = {
  predictDisease: async (req, res) => {
    console.log("\n========== BẮT ĐẦU CHẨN ĐOÁN AI + LỜI KHUYÊN CHUYÊN GIA ==========");
    try {
      console.log("1. Kiểm tra file upload...");
      if (!req.file) {
        return res.status(400).json({ message: "Vui lòng tải lên hình ảnh tôm" });
      }
      console.log("✅ Đã nhận file:", req.file.originalname);

      console.log("2. Lưu thông tin ảnh vào Database...");
      const userId = req.user.user_id; 
      const pondId = req.body.pond_id || null;
      const imageUrl = `/uploads/${req.file.filename}`;

      const imgInsert = await pool.query(
        `INSERT INTO uploaded_images (uploaded_by, pond_id, image_url) VALUES ($1, $2, $3) RETURNING image_id`,
        [userId, pondId, imageUrl]
      );
      const imageId = imgInsert.rows[0].image_id;

      console.log("3. Gửi ảnh sang Python MobileNetV2...");
      const fileBuffer = fs.readFileSync(req.file.path);
      const form = new FormData();
      form.append('file', fileBuffer, req.file.originalname);

      // Gọi sang server AI Python của bạn
      const aiResponse = await axios.post('http://127.0.0.1:8000/ai/predict-disease', form, {
        headers: { ...form.getHeaders() },
        timeout: 8000
      });

      if (aiResponse.data.error) throw new Error("AI Phân loại lỗi: " + aiResponse.data.error);
      const { predicted_disease, confidence } = aiResponse.data;
      console.log(`✅ Kết quả phân loại: ${predicted_disease} (${confidence.toFixed(2)}%)`);

      console.log("4. Tra cứu CSDL gốc để làm Kế hoạch B...");
      const diseaseQuery = await pool.query(`SELECT * FROM shrimp_diseases WHERE disease_name = $1`, [predicted_disease]);
      
      let diseaseId = null;
      let diseaseInfo = null;
      if (diseaseQuery.rows.length > 0) {
        diseaseId = diseaseQuery.rows[0].disease_id;
        diseaseInfo = diseaseQuery.rows[0]; 
      }

      // ============================================================
      // 🌟 BƯỚC 5: GỌI GEMINI BẰNG THƯ VIỆN CHÍNH THỨC CỦA GOOGLE
      // ============================================================
      console.log("5. Đang hỏi ý kiến Chuyên gia Generative AI (Gemini)...");

      let finalSymptoms = diseaseInfo?.symptoms || 'Chưa có thông tin.';
      let finalTreatment = diseaseInfo?.treatment || 'Chưa có thông tin.';
      let finalPrevention = diseaseInfo?.prevention || 'Chưa có thông tin.';

      try {
        const geminiPrompt = `
          Bạn là chuyên gia thủy sản và bác sĩ thú y chuyên về bệnh tôm.
          Hệ thống Computer Vision dự đoán con tôm bị "${predicted_disease}" với độ tin cậy ${confidence.toFixed(2)}%.
          Hãy trả về DUY NHẤT một JSON hợp lệ bằng tiếng Việt, không thêm bất kỳ giải thích nào bên ngoài JSON.
          Yêu cầu:
            - symptoms: Mô tả ngắn gọn, dễ nhận biết các dấu hiệu thực tế của bệnh.
            - treatment: Các bước xử lý và điều trị ưu tiên, ngắn gọn, dễ thực hiện.
            - prevention: Các biện pháp phòng ngừa quan trọng nhất để hạn chế tái phát.
          Mỗi trường chỉ nên từ 1–3 câu, dùng ngôn ngữ đơn giản, thực tế cho người nuôi tôm.
        `;

        // 🌟 CHỌN ĐÚNG MODEL TRONG DANH SÁCH CỦA BẠN VÀ ÉP KIỂU JSON
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json" // Trả lại cấu trúc ép JSON vì bản 2.5 có hỗ trợ
            }
        });

        const result = await model.generateContent(geminiPrompt);
        const responseText = result.response.text();
        const aiAdvice = JSON.parse(responseText);
        
        finalSymptoms = aiAdvice.symptoms;
        finalTreatment = aiAdvice.treatment;
        finalPrevention = aiAdvice.prevention;
        console.log("✅ Gemini đã sinh lời khuyên thành công!");

      } catch (geminiError) {
        console.log("⚠️ Google Gemini đang quá tải hoặc lỗi. Kích hoạt Kế hoạch B!");
        console.error("Chi tiết lỗi từ Google SDK:", geminiError.message);
      }

      console.log("6. Lưu lịch sử dự đoán chi tiết vào DB...");
      // Đảm bảo diseaseId là null nếu không tìm thấy bệnh trong CSDL để tránh lỗi khóa ngoại
      const finalDiseaseId = diseaseId || null; 

      const predInsert = await pool.query(
        `INSERT INTO disease_predictions 
         (image_id, disease_id, confidence, symptoms, treatment, prevention) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING prediction_id`,
        [
            imageId, 
            finalDiseaseId, 
            confidence.toFixed(2), 
            finalSymptoms, 
            finalTreatment, 
            finalPrevention
        ]
      );

      console.log("🎉 HOÀN TẤT VÀ TRẢ KẾT QUẢ DYNAMIC!\n");
      res.json({
        success: true,
        data: {
          prediction_id: predInsert.rows[0].prediction_id,
          disease_name: predicted_disease,
          confidence: confidence.toFixed(2),
          image_url: imageUrl,
          symptoms: finalSymptoms,
          treatment: finalTreatment,
          prevention: finalPrevention
        }
      });

    } catch (error) {
      console.error("❌ LỖI HỆ THỐNG:", error.message);
      res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
  },

  getPredictionHistory: async (req, res) => {
    try {
      const query = `
        SELECT 
          dp.prediction_id, 
          dp.confidence, 
          dp.symptoms, 
          dp.treatment, 
          dp.prevention, 
          dp.predicted_at,
          ui.image_url,
          sd.disease_name
        FROM disease_predictions dp
        LEFT JOIN uploaded_images ui ON dp.image_id = ui.image_id
        LEFT JOIN shrimp_diseases sd ON dp.disease_id = sd.disease_id
        ORDER BY dp.predicted_at DESC
      `;
      const result = await pool.query(query);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      console.error("❌ LỖI LẤY LỊCH SỬ:", error.message);
      res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
  },
};

module.exports = diseaseController;
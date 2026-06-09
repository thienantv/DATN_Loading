const pool = require('../config/database');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// 🌟 ĐIỀN API KEY CỦA BẠN VÀO ĐÂY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
      const userId = req.user.user_id; // Tự động lấy từ token đăng nhập
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
      
      const aiResponse = await axios.post('http://127.0.0.1:8000/ai/predict-disease', form, {
        headers: { ...form.getHeaders() },
        timeout: 8000
      });
      
      if(aiResponse.data.error) throw new Error("AI Phân loại lỗi: " + aiResponse.data.error);
      const { predicted_disease, confidence } = aiResponse.data;
      console.log(`✅ Kết quả phân loại: ${predicted_disease} (${confidence.toFixed(2)}%)`);

      console.log("4. Tra cứu ID bệnh để giữ cấu trúc CSDL...");
      const diseaseQuery = await pool.query(`SELECT disease_id FROM shrimp_diseases WHERE disease_name = $1`, [predicted_disease]);
      const diseaseId = diseaseQuery.rows.length > 0 ? diseaseQuery.rows[0].disease_id : null;

      // ============================================================
      // 🌟 BƯỚC ĐỘT PHÁ: GỌI GEMINI AI ĐỂ SUY DIỄN LỜI KHUYÊN DỰA TRÊN NGỮ CẢNH
      // ============================================================
      console.log("5. Đang hỏi ý kiến Chuyên gia Generative AI (Gemini)...");
      
      const geminiPrompt = `
        Bạn là một chuyên gia thủy sản và bác sĩ thú y chuyên về bệnh tôm. 
        Hệ thống Computer Vision vừa chẩn đoán một con tôm bị bệnh: "${predicted_disease}" với độ tin cậy là ${confidence.toFixed(2)}%.
        Hãy viết một phản hồi tự nhiên, chuyên nghiệp, thực tế giúp người nuôi tôm.
        Yêu cầu bắt buộc: Trả về kết quả theo định dạng JSON chuẩn với 3 trường sau (bằng tiếng Việt):
        - symptoms: Mô tả sinh động các triệu chứng nhận biết của bệnh này trong thực tế.
        - treatment: Phác đồ điều trị, xử lý khẩn cấp tối ưu nhất (nếu là tôm khỏe mạnh thì viết lời khuyên duy trì).
        - prevention: Biện pháp phòng ngừa lâu dài cho ao nuôi.
      `;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const geminiResponse = await axios.post(geminiUrl, {
        contents: [{ parts: [{ text: geminiPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json" // Ép Gemini phải trả về JSON chuẩn sạch
        }
      });

      // Bóc tách dữ liệu chữ mà Gemini sinh ra
      const geminiTextResult = geminiResponse.data.candidates[0].content.parts[0].text;
      const aiAdvice = JSON.parse(geminiTextResult); // Chuyển chuỗi chữ thành Object JSON
      console.log("✅ Gemini đã sinh lời khuyên thành công!");

      console.log("6. Lưu lịch sử dự đoán vào DB...");
      const predInsert = await pool.query(
        `INSERT INTO disease_predictions (image_id, disease_id, confidence) VALUES ($1, $2, $3) RETURNING prediction_id`,
        [imageId, diseaseId, confidence]
      );

      console.log("🎉 HOÀN TẤT VÀ TRẢ KẾT QUẢ DYNAMIC!\n");
      res.json({
        success: true,
        data: {
          prediction_id: predInsert.rows[0].prediction_id,
          disease_name: predicted_disease,
          confidence: confidence.toFixed(2),
          image_url: imageUrl,
          // Sử dụng 100% dữ liệu thông minh do Gemini tự suy luận
          symptoms: aiAdvice.symptoms,
          treatment: aiAdvice.treatment,
          prevention: aiAdvice.prevention
        }
      });

    } catch (error) {
      console.error("❌ LỖI HỆ THỐNG:", error.message);
      res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
  }
};

module.exports = diseaseController;
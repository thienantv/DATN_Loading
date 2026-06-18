const cron = require('node-cron');
const pool = require('../config/database');

// 🌟 CẤU HÌNH MÚI GIỜ CHUẨN VIỆT NAM (UTC+7)
const tzConfig = { timezone: "Asia/Ho_Chi_Minh" };

const notificationCron = {
  startAllNotificationJobs: () => {
    
    // =========================================================================
    // 🧠 CRON 1: CẢNH BÁO "AO BỊ BỎ ĐÓI" (Chạy vào 13:00 hằng ngày)
    // Hệ thống quét xem ngày mai các ao đang nuôi có bị Kỹ sư quên lên lịch việc không?
    // =========================================================================
    cron.schedule('0 13 * * *', async () => {
      console.log("🤖 [CRON - ALARM] Đang quét kiểm tra ao bỏ đói ngày mai...");
      try {
        const query = `
          SELECT p.pond_id, p.pond_code, p.pond_name, p.assigned_staff, p.farm_id, u.full_name AS owner_name, u_tech.full_name AS tech_name
          FROM ponds p
          INNER JOIN users u_tech ON p.assigned_staff = u_tech.user_id
          -- 🌟 TỐI ƯU: Tự động tìm ID của quyền Chủ trại thay vì code cứng số 1
          LEFT JOIN users u ON p.farm_id = u.farm_id AND u.role_id = (SELECT role_id FROM roles WHERE role_name = 'OWNER' LIMIT 1)
          WHERE p.status = 'DANG_NUOI'
            AND NOT EXISTS (
                SELECT 1 FROM tasks t 
                WHERE t.pond_id = p.pond_id 
                  -- 🌟 FIX DB TIMEZONE: Ép DB tính toán "Ngày mai" theo đúng giờ VN
                  AND (t.start_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' + INTERVAL '1 DAY')::date
            )
        `;
        const { rows } = await pool.query(query);

        for (const pond of rows) {
          // 1. Gửi thông báo nhắc nhở gấp cho Kỹ sư phụ trách ao đó
          await pool.query(
            `INSERT INTO notifications (user_id, title, content, type, reference_id) 
             VALUES ($1, $2, $3, 'SYSTEM_ALERT', $4)`,
            [
              pond.assigned_staff,
              `⚠️ BÁO ĐỘNG GẤP: Ao [${pond.pond_code}] chưa có lịch ngày mai!`,
              `Chào Kỹ sư ${pond.tech_name}, hệ thống phát hiện ao nuôi này hiện đang trống lịch trình cho ngày mai. Vui lòng vào trang Quản lý công việc để phân phối kịch bản SOP ngay tránh ảnh hưởng đến tôm sú!`,
              pond.pond_id
            ]
          );

          // 2. Gửi thông báo cảnh báo cho Chủ trại
          if (pond.farm_id) {
            // 🌟 TỐI ƯU: Truy vấn động tìm Chủ trại
            const ownerRes = await pool.query(
              `SELECT user_id FROM users WHERE farm_id = $1 AND role_id = (SELECT role_id FROM roles WHERE role_name = 'OWNER' LIMIT 1) LIMIT 1`, 
              [pond.farm_id]
            );
            if (ownerRes.rows.length > 0) {
              await pool.query(
                `INSERT INTO notifications (user_id, title, content, type, reference_id) 
                 VALUES ($1, $2, $3, 'OWNER_REPORT', $4)`,
                [
                  ownerRes.rows[0].user_id,
                  `📢 Giám sát kỹ thuật: Phát hiện thiếu lịch trình ao ${pond.pond_code}`,
                  `Hệ thống cảnh báo: Ao [${pond.pond_name}] phụ trách bởi Kỹ sư ${pond.tech_name} hiện chưa được thiết lập bất kỳ công việc nào cho ngày mai tính đến 19h tối nay.`,
                  pond.pond_id
                ]
              );
            }
          }
        }
      } catch (err) {
        console.error("❌ Lỗi chạy Cron kiểm tra ao trống lịch:", err);
      }
    }, tzConfig); 

    // =========================================================================
    // ⏰ CRON 2: BẢN TIN SÁNG CHO CÔNG NHÂN (Chạy vào 03:00 sáng hằng ngày)
    // Tổng hợp toàn bộ danh sách việc hôm nay gửi thẳng cho từng Công nhân phụ trách
    // =========================================================================
    cron.schedule('0 3 * * *', async () => {
      console.log("🤖 [CRON - DIGEST] Đang chuẩn bị bản tin công việc sáng cho công nhân...");
      try {
        const query = `
          SELECT tw.worker_id, COUNT(t.task_id) AS total_tasks, u.full_name
          FROM task_workers tw
          INNER JOIN tasks t ON tw.task_id = t.task_id
          INNER JOIN users u ON tw.worker_id = u.user_id
          WHERE t.status IN ('PENDING', 'IN_PROGRESS')
            AND (t.start_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          GROUP BY tw.worker_id, u.full_name
        `;
        const { rows } = await pool.query(query);

        for (const worker of rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, content, type) 
             VALUES ($1, $2, $3, 'DAILY_DIGEST')`,
            [
              worker.worker_id,
              `☀️ Nhật ký công việc hôm nay của bạn`,
              `Chào ${worker.full_name}, hôm nay bạn được phân công phụ trách thực địa [ ${worker.total_tasks} công việc ]. Vui lòng truy cập trang việc làm để xem chi tiết hướng dẫn kỹ thuật và thực hiện đúng giờ.`
            ]
          );
        }
      } catch (err) {
        console.error("❌ Lỗi chạy bản tin sáng công nhân:", err);
      }
    }, tzConfig);

    // =========================================================================
    // 🛑 CRON 3: THÔNG BÁO SẮP QUÁ HẠN & LEO THANG LÊN CHỦ TRẠI (Mỗi 15 phút quét 1 lần)
    // =========================================================================
    cron.schedule('*/15 * * * *', async () => {
      try {
        // Lệnh 3a: Nhắc công nhân trước 2 tiếng
        const alertWorkersQuery = `
          SELECT t.task_id, t.task_title, t.due_date, tw.worker_id
          FROM tasks t
          INNER JOIN task_workers tw ON t.task_id = tw.task_id
          WHERE t.status IN ('PENDING', 'IN_PROGRESS')
            AND t.due_date BETWEEN NOW() AND (NOW() + INTERVAL '2 HOURS')
            AND NOT EXISTS (
              SELECT 1 FROM notifications n WHERE n.reference_id = t.task_id AND n.type = 'URGENT_REMINDER'
            )
        `;
        const workersToAlert = await pool.query(alertWorkersQuery);
        for (const task of workersToAlert.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, content, type, reference_id) 
             VALUES ($1, $2, $3, 'URGENT_REMINDER', $4)`,
            [
              task.worker_id,
              `⏰ CẢNH BÁO SẮP TRỄ HẠN: ${task.task_title}`,
              `Nhiệm vụ này sắp hết hạn vào lúc ${new Date(task.due_date).toLocaleTimeString('vi-VN')}. Khẩn trương hoàn thành báo cáo thực địa!`,
              task.task_id
            ]
          );
        }

        // Lệnh 3b: LEO THANG VƯỢT CẤP LÊN CHỦ TRẠI
        const escalationQuery = `
          SELECT t.task_id, t.task_code, t.task_title, t.due_date, p.farm_id, u_tech.full_name AS tech_name
          FROM tasks t
          INNER JOIN ponds p ON t.pond_id = p.pond_id
          INNER JOIN users u_tech ON t.assigned_by = u_tech.user_id
          WHERE t.status IN ('PENDING', 'IN_PROGRESS') 
          AND t.due_date < (NOW() - INTERVAL '1 HOURS')
          AND NOT EXISTS (
          SELECT 1 FROM notifications n WHERE n.reference_id = t.task_id AND n.type = 'ESCALATION_ALERT'
          )
        `;
        const violatedTasks = await pool.query(escalationQuery);
        for (const task of violatedTasks.rows) {
          // 🌟 TỐI ƯU: Truy vấn động tìm Chủ trại
          const ownerRes = await pool.query(
            `SELECT user_id FROM users WHERE farm_id = $1 AND role_id = (SELECT role_id FROM roles WHERE role_name = 'OWNER' LIMIT 1) LIMIT 1`, 
            [task.farm_id]
          );
          if (ownerRes.rows.length > 0) {
            await pool.query(
              `INSERT INTO notifications (user_id, title, content, type, reference_id) 
               VALUES ($1, $2, $3, 'ESCALATION_ALERT', $4)`,
              [
                ownerRes.rows[0].user_id,
                `🚨 CẢNH BÁO NGHIÊM TRỌNG: Vi phạm tiến độ công việc vượt cấp 1h`,
                `Công việc [${task.task_code} - ${task.task_title}] do Kỹ sư ${task.tech_name} quản lý đã bị QUÁ HẠN HƠN 1 TIẾNG nhưng không được hoàn thành hoặc có lý do giải trình. Vui lòng kiểm tra lại quy trình vận hành ao.`,
                task.task_id
              ]
            );
          }
        }

      } catch (err) {
        console.error("❌ Lỗi xử lý ma trận thông báo leo thang:", err);
      }
    }, tzConfig);

    // =========================================================================
    // 🔔 CRON 4: NHẮC NHỞ PHÂN CÔNG SOP (Chạy mỗi 30 phút)
    // =========================================================================
    cron.schedule('*/30 * * * *', async () => {
      console.log("🤖 [CRON - SOP] Đang quét các công việc SOP chưa được gán người...");
      try {
        const query = `
            SELECT t.task_id, t.task_title, t.start_date, t.assigned_by, p.pond_name
            FROM tasks t
            JOIN ponds p ON p.pond_id = t.pond_id
            WHERE t.status = 'PENDING'
              AND t.start_date BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
              AND NOT EXISTS (SELECT 1 FROM task_workers tw WHERE tw.task_id = t.task_id)
              AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.reference_id = t.task_id AND n.type = 'SOP_REMINDER')
        `;
        const { rows } = await pool.query(query);

        if (rows.length > 0) {
          console.log(`[CRON] Đã phát hiện ${rows.length} công việc SOP khẩn cấp chưa có người làm!`);
          
          for (const task of rows) {
            const timeStr = new Date(task.start_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            await pool.query(
              `INSERT INTO notifications (user_id, title, content, type, reference_id) 
               VALUES ($1, $2, $3, 'SOP_REMINDER', $4)`,
              [
                task.assigned_by,
                `⏰ CẦN PHÂN CÔNG GẤP: ${task.task_title}`,
                `Công việc tại ao [${task.pond_name}] sẽ bắt đầu lúc ${timeStr}. Vui lòng vào phân công nhân sự thực hiện ngay để đảm bảo tiến độ!`,
                task.task_id
              ]
            );
          }
        }
      } catch (error) {
        console.error("❌ Lỗi chạy Cron nhắc nhở phân công SOP:", error);
      }
    }, tzConfig); 

  }
};

module.exports = notificationCron;
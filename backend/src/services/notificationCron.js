const cron = require('node-cron');
const pool = require('../config/database');

const notificationCron = {
  startAllNotificationJobs: () => {
    
    // =========================================================================
    // 🧠 CRON 1: CẢNH BÁO "AO BỊ BỎ ĐÓI" (Chạy vào 19:00 hằng đêm)
    // Hệ thống quét xem ngày mai các ao đang nuôi có bị Kỹ sư quên lên lịch việc không?
    // =========================================================================
    cron.schedule('0 19 * * *', async () => {
      console.log("🤖 [CRON - ALARM] Đang quét kiểm tra ao bỏ đói ngày mai...");
      try {
        // Tìm các ao đang trạng thái DANG_NUOI nhưng ngày mai không có bất kỳ công việc nào
        const query = `
          SELECT p.pond_id, p.pond_code, p.pond_name, p.assigned_staff, p.farm_id, u.full_name AS owner_name, u_tech.full_name AS tech_name
          FROM ponds p
          INNER JOIN users u_tech ON p.assigned_staff = u_tech.user_id
          LEFT JOIN users u ON p.farm_id = u.farm_id AND u.role = 'OWNER'
          WHERE p.status = 'DANG_NUOI'
            AND NOT EXISTS (
                SELECT 1 FROM tasks t 
                WHERE t.pond_id = p.pond_id 
                  AND t.start_date::date = (CURRENT_DATE + INTERVAL '1 DAY')::date
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

          // 2. Gửi thông báo cảnh báo cho Chủ trại (Để chủ trại giám sát xem kỹ sư có làm việc không)
          if (pond.farm_id) {
            // Tìm ID của Owner trại đó để bắn tin
            const ownerRes = await pool.query(`SELECT user_id FROM users WHERE farm_id = $1 AND role = 'OWNER' LIMIT 1`, [pond.farm_id]);
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
    });

    // =========================================================================
    // ⏰ CRON 2: BẢN TIN SÁNG CHO CÔNG NHÂN (Chạy vào 06:00 sáng hằng ngày)
    // Tổng hợp toàn bộ danh sách việc hôm nay gửi thẳng cho từng Công nhân phụ trách
    // =========================================================================
    cron.schedule('0 6 * * *', async () => {
      console.log("🤖 [CRON - DIGEST] Đang chuẩn bị bản tin công việc sáng cho công nhân...");
      try {
        const query = `
          SELECT tw.worker_id, COUNT(t.task_id) AS total_tasks, u.full_name
          FROM task_workers tw
          INNER JOIN tasks t ON tw.task_id = t.task_id
          INNER JOIN users u ON tw.worker_id = u.user_id
          WHERE t.status IN ('PENDING', 'IN_PROGRESS')
            AND t.start_date::date = CURRENT_DATE
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
    });

    // =========================================================================
    // 🛑 CRON 3: THÔNG BÁO SẮP QUÁ HẠN & LEO THANG LÊN CHỦ TRẠI (Mỗi 15 phút quét 1 lần)
    // - Nhắc nhở công nhân trước hạn chót 2 tiếng.
    // - Báo cáo vượt cấp thẳng lên Chủ trại nếu việc trễ hạn quá 24 tiếng không giải trình.
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

        // Lệnh 3b: LEO THANG VƯỢT CẤP LÊN CHỦ TRẠI (Quá hạn > 24 tiếng mà chưa xong)
        const escalationQuery = `
          SELECT t.task_id, t.task_code, t.task_title, t.due_date, p.farm_id, u_tech.full_name AS tech_name
          FROM tasks t
          INNER JOIN ponds p ON t.pond_id = p.pond_id
          INNER JOIN users u_tech ON t.assigned_by = u_tech.user_id
          WHERE t.status = 'PENDING' OR (t.status = 'IN_PROGRESS' AND t.due_date < (NOW() - INTERVAL '24 HOURS'))
            AND NOT EXISTS (
              SELECT 1 FROM notifications n WHERE n.reference_id = t.task_id AND n.type = 'ESCALATION_ALERT'
            )
        `;
        const violatedTasks = await pool.query(escalationQuery);
        for (const task of violatedTasks.rows) {
          const ownerRes = await pool.query(`SELECT user_id FROM users WHERE farm_id = $1 AND role = 'OWNER' LIMIT 1`, [task.farm_id]);
          if (ownerRes.rows.length > 0) {
            await pool.query(
              `INSERT INTO notifications (user_id, title, content, type, reference_id) 
               VALUES ($1, $2, $3, 'ESCALATION_ALERT', $4)`,
              [
                ownerRes.rows[0].user_id,
                `🚨 CẢNH BÁO NGHIÊM TRỌNG: Vi phạm tiến độ công việc vượt cấp 24h`,
                `Công việc [${task.task_code} - ${task.task_title}] do Kỹ sư ${task.tech_name} quản lý đã bị QUÁ HẠN HƠN 24 TIẾNG nhưng không được hoàn thành hoặc có lý do giải trình. Vui lòng kiểm tra lại quy trình vận hành ao.`,
                task.task_id
              ]
            );
          }
        }

      } catch (err) {
        console.error("❌ Lỗi xử lý ma trận thông báo leo thang:", err);
      }
    });

  }
};

module.exports = notificationCron;
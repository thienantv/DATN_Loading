const pool = require('../config/database');

const sopService = {
  /**
   * Động cơ tự động sinh Task chuẩn cho Tôm Sú
   */
  generateTasksForBlackTigerShrimp: async (seasonId, pondId, startDate, expectedHarvestDate, technicianId) => {
    const start = new Date(startDate);
    const end = expectedHarvestDate ? new Date(expectedHarvestDate) : new Date(start.getTime() + (120 * 86400000)); // Mặc định 120 ngày nếu không nhập
    
    // Tính tổng số ngày nuôi
    const totalDays = Math.floor((end - start) / 86400000);
    if (totalDays <= 0 || totalDays > 200) return; // Bảo vệ DB không bị lặp vô hạn

    const tasksToInsert = [];
    
    // ---------------------------------------------------------
    // BỘ QUY TRÌNH CHUẨN (SOP) DÀNH CHO TÔM SÚ
    // ---------------------------------------------------------
    for (let day = 1; day <= totalDays; day++) {
      const currentDay = new Date(start.getTime() + (day * 86400000));
      const dateString = currentDay.toISOString().split('T')[0];

      // 1. CÔNG VIỆC HẰNG NGÀY: Kiểm tra môi trường (Tách 2 cữ Sáng/Chiều)
      const envShifts = [
        { label: 'Sáng', start: '06:00:00', due: '08:00:00' },
        { label: 'Chiều', start: '14:00:00', due: '16:00:00' }
      ];
      envShifts.forEach(shift => {
        tasksToInsert.push({
          title: `[Ngày ${day}] Đo môi trường nước cữ ${shift.label}`,
          desc: `Đo các chỉ số pH, Nhiệt độ, Oxy, Kiềm cữ ${shift.label} và cập nhật lên hệ thống.`,
          start: `${dateString} ${shift.start}`,
          due: `${dateString} ${shift.due}`,
          type_id: 5 // Vẫn mượn tạm Type OTHER nếu DB chưa có Type Đo môi trường
        });
      });

      // 2. CÔNG VIỆC HẰNG NGÀY: Cho ăn và Canh sàng (Tách 4 cữ)
      const feedShifts = [
        { label: '6h Sáng', start: '06:00:00', due: '08:00:00' },
        { label: '10h Trưa', start: '10:00:00', due: '12:00:00' },
        { label: '14h Chiều', start: '14:00:00', due: '16:00:00' },
        { label: '18h Tối', start: '18:00:00', due: '20:00:00' }
      ];
      feedShifts.forEach(shift => {
        tasksToInsert.push({
          title: `[Ngày ${day}] Cho tôm ăn cữ ${shift.label}`,
          desc: `Xuất kho thức ăn, rải đều và canh sàng (nhá) sau 1.5 - 2 tiếng để kiểm tra mức độ ăn.`,
          start: `${dateString} ${shift.start}`,
          due: `${dateString} ${shift.due}`,
          type_id: 2 // Type FEEDING
        });
      });

      // 3. CHU KỲ 7 NGÀY: Cấy vi sinh xử lý đáy
      // Type 1 (POND_PROCESS - Xử lý ao) -> Hợp lý hơn cho việc đánh vi sinh
      if (day % 7 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Cấy vi sinh định kỳ (Xử lý đáy)`,
          desc: 'Nhân sinh khối vi sinh và tạt đều quanh ao để phân hủy mùn bã hữu cơ, giữ đáy ao sạch.',
          start: `${dateString} 08:00:00`,
          due: `${dateString} 11:00:00`,
          type_id: 1 
        });
      }

      // 4. CHU KỲ 10 NGÀY: Đánh khoáng cứng vỏ
      // Type 3 (TREATMENT - Cho tôm dùng thuốc)
      if (day % 10 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Đánh khoáng bổ sung (Ban đêm)`,
          desc: 'Tạt khoáng (Canxi, Magie, Kali) lúc 21h-22h đêm để hỗ trợ tôm sú lột xác đồng loạt và cứng vỏ nhanh.',
          start: `${dateString} 20:00:00`,
          due: `${dateString} 23:30:00`,
          type_id: 3 
        });
      }

      // 5. CHU KỲ 15 NGÀY: Kiểm tra sức khỏe, đo Size
      // Type 5 (OTHER - Các công việc khác) thay vì 6 (Không tồn tại)
      if (day % 15 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Chài tôm kiểm tra Size & Gan tụy`,
          desc: 'Chài ngẫu nhiên để cân trọng lượng (tính size con/kg), kiểm tra màu sắc gan tụy và đường ruột.',
          start: `${dateString} 06:00:00`,
          due: `${dateString} 09:00:00`,
          type_id: 5 
        });
      }
    }

    // 6. CÔNG VIỆC CUỐI CÙNG: Ngày thu hoạch
    // Type 4 (HARVEST - Thu hoạch tôm) 
    const harvestDateString = end.toISOString().split('T')[0];
    tasksToInsert.push({
      title: '🎯 Tiến hành thu hoạch tôm sú',
      desc: 'Chuẩn bị dụng cụ, lưới, rổ, đá lạnh và nhân công để tiến hành thu hoạch.',
      start: `${harvestDateString} 04:00:00`,
      due: `${harvestDateString} 12:00:00`,
      type_id: 4 
    });

    // ---------------------------------------------------------
    // BƠM DỮ LIỆU VÀO DATABASE (BATCH INSERT)
    // ---------------------------------------------------------
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lấy sequence để sinh mã Task
      const year = new Date().getFullYear();
      let countRes = await client.query(`SELECT COUNT(*) FROM tasks`);
      let baseCount = parseInt(countRes.rows[0].count);

      // Xây dựng câu lệnh Bulk Insert cực nhanh
      for (let i = 0; i < tasksToInsert.length; i++) {
        const t = tasksToInsert[i];
        baseCount++;
        const taskCode = `TSK-${year}-${String(baseCount).padStart(5, '0')}`;
        
        await client.query(
          `INSERT INTO tasks (task_code, season_id, pond_id, task_title, description, start_date, due_date, type_id, status, assigned_by) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)`,
          [taskCode, seasonId, pondId, t.title, t.desc, t.start, t.due, t.type_id, technicianId]
        );
      }

      await client.query('COMMIT');
      console.log(`✅ [SOP ENGINE] Đã sinh thành công ${tasksToInsert.length} công việc tự động cho Ao ${pondId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [SOP ENGINE] Lỗi sinh Task tự động:', error);
    } finally {
      client.release();
    }
  }
};

module.exports = sopService;
const pool = require('../config/database');

const sopService = {
  /**
   * Động cơ tự động sinh Task chuẩn cho Tôm Sú
   */
  generateTasksForBlackTigerShrimp: async (seasonId, pondId, startDate, expectedHarvestDate, technicianId) => {
    // 🌟 BẮT ĐẦU ĐO TỔNG THỜI GIAN VÀ BỘ NHỚ
    console.time('⏱️ [PERFORMANCE] Tổng thời gian chạy SOP');
    const startMemory = process.memoryUsage().heapUsed;

    const start = new Date(startDate);
    const end = expectedHarvestDate ? new Date(expectedHarvestDate) : new Date(start.getTime() + (120 * 86400000)); 
    
    // Tính tổng số ngày nuôi
    const totalDays = Math.floor((end - start) / 86400000);
    if (totalDays <= 0 || totalDays > 200) return; 

    // 🌟 ĐO PHA 1: THỜI GIAN TÍNH TOÁN CỦA CPU NODE.JS
    console.time('⚙️ [PERFORMANCE] Pha 1 - Xử lý mảng (CPU)');
    const tasksToInsert = [];
    
    // ---------------------------------------------------------
    // BỘ QUY TRÌNH CHUẨN (SOP) DÀNH CHO TÔM SÚ 
    // ---------------------------------------------------------
    for (let day = 1; day <= totalDays; day++) {
      const currentDay = new Date(start.getTime() + (day * 86400000));
      const dateString = currentDay.toISOString().split('T')[0];

      // 1. Kiểm tra môi trường (Type 6)
      const envShifts = [
        { label: 'Sáng', start: '06:00:00', due: '07:00:00' },
        { label: 'Chiều', start: '14:00:00', due: '15:00:00' }
      ];
      envShifts.forEach(shift => {
        tasksToInsert.push({
          title: `[Ngày ${day}] Đo môi trường nước cữ ${shift.label}`,
          desc: `Đo các chỉ số pH, Nhiệt độ, Oxy, Kiềm cữ ${shift.label} và cập nhật lên hệ thống.`,
          start: `${dateString} ${shift.start}`,
          due: `${dateString} ${shift.due}`,
          type_id: 6 
        });
      });

      // 2. Cho ăn (Type 2)
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
          type_id: 2 
        });
      });

      // 3. Xử lý đáy (Type 1)
      if (day % 7 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Cấy vi sinh định kỳ (Xử lý đáy)`,
          desc: 'Nhân sinh khối vi sinh và tạt đều quanh ao để phân hủy mùn bã hữu cơ, giữ đáy ao sạch.',
          start: `${dateString} 08:00:00`,
          due: `${dateString} 12:00:00`, 
          type_id: 1 
        });
      }

      // 4. Đánh khoáng (Type 3)
      if (day % 10 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Đánh khoáng bổ sung (Ban đêm)`,
          desc: 'Tạt khoáng (Canxi, Magie, Kali) lúc 20h đêm để hỗ trợ tôm sú lột xác đồng loạt và cứng vỏ nhanh.',
          start: `${dateString} 20:00:00`,
          due: `${dateString} 22:00:00`, 
          type_id: 3 
        });
      }

      // 5. Kiểm tra sức khỏe (Type 5)
      if (day % 15 === 0) {
        tasksToInsert.push({
          title: `[Ngày ${day}] Chài tôm kiểm tra Size & Gan tụy`,
          desc: 'Chài ngẫu nhiên để cân trọng lượng (tính size con/kg), kiểm tra màu sắc gan tụy và đường ruột.',
          start: `${dateString} 06:00:00`,
          due: `${dateString} 08:00:00`, 
          type_id: 5 
        });
      }
    }

    // 6. Ngày thu hoạch (Type 4)
    const harvestDateString = end.toISOString().split('T')[0];
    tasksToInsert.push({
      title: '🎯 Tiến hành thu hoạch tôm sú',
      desc: 'Chuẩn bị dụng cụ, lưới, rổ, đá lạnh và nhân công để tiến hành thu hoạch.',
      start: `${harvestDateString} 04:00:00`,
      due: `${harvestDateString} 12:00:00`, 
      type_id: 4 
    });

    // 🌟 KẾT THÚC ĐO PHA 1
    console.timeEnd('⚙️ [PERFORMANCE] Pha 1 - Xử lý mảng (CPU)');

    // ---------------------------------------------------------
    // BƠM DỮ LIỆU VÀO DATABASE (BULK INSERT SIÊU TỐC)
    // ---------------------------------------------------------
    // 🌟 BẮT ĐẦU ĐO PHA 2 (I/O)
    console.time('💾 [PERFORMANCE] Pha 2 - Insert Database (I/O)');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const year = new Date().getFullYear();
      let countRes = await client.query(`SELECT COALESCE(MAX(task_id), 0) AS max_id FROM tasks`);
      let baseCount = parseInt(countRes.rows[0].max_id);

      if (tasksToInsert.length > 0) {
        const valueStrings = [];
        const queryParams = [];
        let paramIndex = 1;

        for (let i = 0; i < tasksToInsert.length; i++) {
          const t = tasksToInsert[i];
          baseCount++;
          const taskCode = `TSK-${year}-${String(baseCount).padStart(5, '0')}`;
          
          valueStrings.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, 'PENDING', $${paramIndex++})`);
          queryParams.push(taskCode, seasonId, pondId, t.title, t.desc, t.start, t.due, t.type_id, technicianId);
        }

        // 🌟 GỌI DATABASE DUY NHẤT 1 LẦN
        const bulkInsertQuery = `
          INSERT INTO tasks (task_code, season_id, pond_id, task_title, description, start_date, due_date, type_id, status, assigned_by) 
          VALUES ${valueStrings.join(', ')}
        `;
        
        await client.query(bulkInsertQuery, queryParams);
      }

      await client.query('COMMIT');
      
      // 🌟 KẾT THÚC ĐO PHA 2
      console.timeEnd('💾 [PERFORMANCE] Pha 2 - Insert Database (I/O)');
      console.log(`✅ [SOP ENGINE] Đã Bulk Insert thành công ${tasksToInsert.length} công việc tự động cho Ao ${pondId}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ [SOP ENGINE] Lỗi sinh Task tự động:', error);
    } finally {
      client.release();
      
      // 🌟 KẾT THÚC ĐO TỔNG THỂ VÀ TÍNH TOÁN RAM
      console.timeEnd('⏱️ [PERFORMANCE] Tổng thời gian chạy SOP');
      const endMemory = process.memoryUsage().heapUsed;
      const usedMemoryMB = Math.round((endMemory - startMemory) / 1024 / 1024 * 100) / 100;
      console.log(`📊 [PERFORMANCE] Tiêu thụ RAM cho tác vụ này: ~${usedMemoryMB} MB\n`);
    }
  }
};

module.exports = sopService;
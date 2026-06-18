const cron = require('node-cron');
const logger = require('../utils/logger');
const { run: syncSeasonsAndPonds } = require('../../scripts/sync_seasons_and_ponds');

const startSystemCrons = () => {
    const cronExpr = process.env.SYNC_CRON === 'disabled' ? null : (process.env.SYNC_CRON || '*/1 * * * *');
    if (cronExpr) {
        cron.schedule(cronExpr, async () => {
            try {
                await syncSeasonsAndPonds();
            } catch (err) {
                logger.error('❌ Lỗi đồng bộ Mùa vụ & Ao:', err);
            }
        });
        logger.info(`📅 [CRON - SYSTEM] Đồng bộ hệ thống chạy mỗi: ${cronExpr}`);
    }
};

module.exports = startSystemCrons;
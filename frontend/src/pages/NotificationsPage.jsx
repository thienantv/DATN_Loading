import React, { useEffect, useState } from 'react';
import { notificationService } from '../services/api';
import { showToast } from '../utils/toast';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await notificationService.getNotifications();
            setNotifications(res.data.data || []);
        } catch (error) {
            showToast({ title: 'Lỗi tải thông báo', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id, isRead) => {
        if (isRead) return;
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Lỗi đánh dấu đã đọc", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="max-w-[1600px] mx-auto animate-in fade-in duration-300">
            
            {/* HEADER (Đã đồng bộ kích thước và hiệu ứng ánh sáng với các trang khác) */}
            <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-[24px] p-6 md:p-8 mb-6 border border-emerald-100/60 shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Trung tâm Thông báo</h1>
                    <p className="text-slate-500 font-medium mt-1.5">Theo dõi các nhắc nhở và cảnh báo từ hệ thống</p>
                </div>
                
                {/* Khối hiển thị số lượng thông báo được thiết kế lại to, rõ ràng hơn */}
                <div className="relative z-10 w-full md:w-auto flex items-center justify-between md:justify-center bg-white px-5 py-3 rounded-2xl shadow-sm border border-emerald-100 gap-4">
                    <div className="flex flex-col items-start md:items-end">
                        <span className="text-2xl font-black text-emerald-600 leading-none">{unreadCount}</span>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">Chưa đọc</span>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center text-2xl shadow-inner">
                        🔔
                    </div>
                </div>
            </div>

            {/* DANH SÁCH THÔNG BÁO (Đã mở rộng ra toàn màn hình) */}
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-slate-400">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <span className="text-5xl">📭</span>
                        </div>
                        <h3 className="font-extrabold text-xl text-slate-600">Bạn chưa có thông báo nào</h3>
                        <p className="font-medium mt-2">Hệ thống sẽ gửi nhắc nhở khi có công việc sắp đến hạn.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notif) => (
                            <div 
                                key={notif.notification_id} 
                                onClick={() => handleMarkAsRead(notif.notification_id, notif.is_read)}
                                className={`p-6 md:p-8 transition-all cursor-pointer hover:bg-slate-50 group flex flex-col sm:flex-row gap-5 items-start ${!notif.is_read ? 'bg-emerald-50/40' : ''}`}
                            >
                                {/* Icon */}
                                <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${!notif.is_read ? 'bg-amber-100 border-amber-200 text-amber-500' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                    {notif.type === 'TASK_REMINDER' ? '⏰' : (notif.type === 'AI_ALERT' ? '🦠' : '📢')}
                                </div>

                                {/* Nội dung */}
                                <div className="flex-1 w-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className={`text-lg font-extrabold ${!notif.is_read ? 'text-slate-800' : 'text-slate-600'}`}>
                                            {notif.title}
                                        </h3>
                                        {!notif.is_read && <span className="shrink-0 px-2 py-1 bg-rose-500 text-white text-[10px] font-bold uppercase rounded-md shadow-sm ml-4">Mới</span>}
                                    </div>
                                    <p className={`text-base mb-3 leading-relaxed ${!notif.is_read ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                                        {notif.content}
                                    </p>
                                    <span className="text-sm font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 inline-block">
                                        {new Date(notif.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
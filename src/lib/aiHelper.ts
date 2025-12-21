import { supabase } from '../integrations/supabase/client';

/**
 * AI Sentinel System
 * Proactively monitors user activity and triggers real-time notifications.
 */

export type AiNotificationType = 'success' | 'warning' | 'info' | 'error' | 'security';

export const sendAiNotification = async (
    userId: string, 
    title: string, 
    message: string, 
    type: AiNotificationType = 'info'
) => {
    try {
        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title: `🤖 AI Assistant: ${title}`,
            message,
            type: type === 'security' ? 'error' : type,
            is_read: false
        });

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error("AI Notification Error:", e);
        return { success: false, error: e };
    }
};

/**
 * AI Behavioral Observer
 * Can be called after significant events (e.g., big win, unusual login)
 */
export const aiObserveActivity = async (userId: string, activityType: string, meta?: any) => {
    const { data: profile } = await supabase.from('profiles').select('name_1').eq('id', userId).single();
    
    switch (activityType) {
        case 'big_win':
            await sendAiNotification(
                userId, 
                "Incredible Luck!", 
                `Congratulations ${profile?.name_1 || 'User'}! Our algorithm detected a significant win. Consider withdrawing or diversifying into VIP Assets.`,
                'success'
            );
            break;
        case 'suspicious_login':
            await sendAiNotification(
                userId, 
                "Security Alert", 
                "Unusual login detected from a new device/location. If this wasn't you, please change your password immediately.",
                'security'
            );
            break;
        case 'task_milestone':
            await sendAiNotification(
                userId, 
                "Earning Streak", 
                "You've completed 5 tasks today. You're in the top 10% of earners this hour!",
                'info'
            );
            break;
    }
};

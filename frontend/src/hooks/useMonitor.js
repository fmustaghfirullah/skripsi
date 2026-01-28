import { useEffect } from 'react';
import axios from 'axios';

const useMonitor = (sessionId, onResponse) => {
    useEffect(() => {
        if (!sessionId) return;

        const sendLog = async (activityType, details = '') => {
            try {
                const response = await axios.post('http://localhost:5000/api/submit-log', {
                    session_id: sessionId,
                    activity_type: activityType,
                    details
                });

                if (onResponse) onResponse(response.data);
                // Alert handled by component via callback
            } catch (err) {
                console.error("Log error:", err);
            }
        };

        const handleBlur = () => sendLog('blur', 'Tab switched or browser minimized');
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                sendLog('visibility_hidden', 'Page hidden');
            }
        };
        const handleContextMenu = (e) => {
            e.preventDefault();
            sendLog('context_menu', 'Right click attempt');
        };
        const handleKeyDown = (e) => {
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u')) {
                e.preventDefault();
                sendLog('forbidden_key', `Ctrl+${e.key.toUpperCase()} detected`);
            }
        };

        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [sessionId]);
};

export default useMonitor;

document.addEventListener('DOMContentLoaded', () => {
    console.log("Anti-Cheating Monitor Active");

    function sendLog(activity, details = "") {
        fetch('/submit_log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                activity_type: activity,
                details: details
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.rule_violated) {
                    alert("WARNING: Peringatan Pelanggaran Terdeteksi!");
                }
                console.log("Log stored:", data);
            })
            .catch(error => console.error('Error:', error));
    }

    // 1. Tab Switching & Focus Loss
    window.addEventListener('blur', () => {
        sendLog('blur', 'Focus lost/Tab switched');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            sendLog('visibility_hidden', 'Page hidden');
        }
    });

    // 2. Right Click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        sendLog('context_menu', 'Right click attempt');
        return false;
    });

    // 3. Forbidden Keys
    document.addEventListener('keydown', (e) => {
        // Detect Ctrl+C, Ctrl+V, Ctrl+U (View Source)
        if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u')) {
            e.preventDefault();
            sendLog('forbidden_key', `Ctrl+${e.key.toUpperCase()} pressed`);
        }

        // Detect Alt+Tab (though primarily focus loss handles this better)
        if (e.altKey && e.key === 'Tab') {
            sendLog('forbidden_key', 'Alt+Tab attempted');
        }

        // Prevent Print Screen / Snipping tool if possible (limited success in browser)
        if (e.key === 'PrintScreen') {
            sendLog('forbidden_key', 'PrintScreen pressed');
        }
    });
});

/**
 * monitor.js — Anti-Cheat Monitor untuk halaman legacy (non-React)
 * Diimplementasikan pada halaman ujian berbasis template HTML Flask.
 * Untuk halaman React, anti-cheat ditangani langsung di Exam.jsx.
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('[CBT] Anti-Cheating Monitor v2.0 Active');

    const isMobile = () =>
        /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent) ||
        ('ontouchstart' in window && navigator.maxTouchPoints > 1);

    // ── Feature counter (lokal, untuk dikirim bersama log) ───
    const features = {
        blur_count: 0, hidden_count: 0, forbidden_key_count: 0, context_menu_count: 0,
        screenshot_attempt: 0, devtools_open: 0, copy_attempt: 0, screen_share_detect: 0,
        window_resize_extreme: 0, multi_touch_suspic: 0, tab_switch_rapid: 0, fullscreen_exit: 0,
    };

    const cooldowns = {};
    let lastHiddenTs = null;

    /** Tampilkan toast peringatan */
    function showToast(msg, color = '#ef4444') {
        let toastEl = document.getElementById('ac-toast');
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'ac-toast';
            Object.assign(toastEl.style, {
                position: 'fixed', bottom: '2rem', right: '2rem', zIndex: '99999',
                background: '#1e293b', border: `2px solid ${color}`,
                color: 'white', padding: '1rem 1.5rem', borderRadius: '12px',
                fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: '600',
                maxWidth: '360px', lineHeight: '1.5', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                transition: 'all 0.3s',
            });
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.style.borderColor = color;
        toastEl.style.opacity = '1';
        toastEl.style.transform = 'translateY(0)';
        clearTimeout(toastEl._timeout);
        toastEl._timeout = setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateY(10px)';
        }, 4000);
    }

    /** Kirim log ke server dengan throttle */
    function sendLog(activity, details = '', cooldownMs = 2000) {
        const now  = Date.now();
        const last = cooldowns[activity] || 0;
        if (now - last < cooldownMs) return;
        cooldowns[activity] = now;

        // Update local counters
        if (activity === 'blur')               features.blur_count++;
        if (activity === 'visibility_hidden')  features.hidden_count++;
        if (activity === 'forbidden_key')      features.forbidden_key_count++;
        if (activity === 'context_menu')       features.context_menu_count++;
        if (activity === 'screenshot_attempt') features.screenshot_attempt++;
        if (activity === 'devtools_open')      features.devtools_open++;
        if (activity === 'copy_attempt')       features.copy_attempt++;
        if (activity === 'screen_share')       features.screen_share_detect++;
        if (activity === 'window_resize_extreme') features.window_resize_extreme++;
        if (activity === 'multi_touch')        features.multi_touch_suspic++;
        if (activity === 'fullscreen_exit')    features.fullscreen_exit++;

        // Tab switch rapid
        if (activity === 'visibility_hidden') lastHiddenTs = now;
        else if (activity === 'blur' && lastHiddenTs && now - lastHiddenTs < 2000) {
            features.tab_switch_rapid++;
        }

        const sessionId = document.querySelector('[data-session-id]')?.dataset?.sessionId;
        fetch('/api/submit-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
            body: JSON.stringify({ session_id: sessionId, activity_type: activity, details, features: { ...features } }),
            keepalive: true,
        })
        .then(r => r.json())
        .then(data => {
            if (data.terminated) {
                showToast('❌ Sesi Anda dihentikan karena kecurangan terdeteksi.', '#ef4444');
                setTimeout(() => window.location.href = '/student-dashboard', 2000);
            } else if (data.is_cheating) {
                showToast(`⚠️ AI Engine mendeteksi kecurangan (skor: ${(data.score * 100).toFixed(0)}%)`, '#f59e0b');
            }
        })
        .catch(() => {});
    }

    // ── 1. Fullscreen enforcement ────────────────────────────
    function requestFS() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
                sendLog('fullscreen_exit', 'Fullscreen denied', 0);
            });
        }
    }
    requestFS();
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            sendLog('fullscreen_exit', 'Exited fullscreen', 500);
            showToast('⚠️ Keluar dari layar penuh terdeteksi!', '#f59e0b');
            setTimeout(requestFS, 2000);
        }
    });

    // ── 2. Blur ──────────────────────────────────────────────
    window.addEventListener('blur', () => {
        sendLog('blur', 'Window focus lost', 1500);
        showToast('⚠️ Berpindah tab/jendela tidak diperbolehkan selama ujian!');
    });

    // ── 3. Visibility change ─────────────────────────────────
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            sendLog('visibility_hidden', 'Page hidden', 1000);
        } else {
            // iOS screenshot pattern: visible kembali dalam < 800ms
            if (isMobile() && lastHiddenTs && Date.now() - lastHiddenTs < 800) {
                sendLog('screenshot_attempt', 'iOS screenshot pattern', 500);
                showToast('📸 Kemungkinan screenshot terdeteksi!', '#ef4444');
            }
        }
    });

    // ── 4. Context menu ──────────────────────────────────────
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        sendLog('context_menu', 'Right-click blocked', 3000);
        showToast('🚫 Klik kanan tidak diizinkan selama ujian.', '#f59e0b');
        return false;
    });

    // ── 5. Keyboard ──────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            sendLog('screenshot_attempt', 'PrintScreen key', 500);
            showToast('📸 Screenshot tidak diperbolehkan!', '#ef4444');
            return;
        }
        // F12
        if (e.key === 'F12') {
            e.preventDefault();
            sendLog('devtools_open', 'F12 pressed', 500);
            showToast('🚫 DevTools tidak diizinkan selama ujian!', '#ef4444');
            return;
        }
        // Ctrl combinations
        if (e.ctrlKey || e.metaKey) {
            const k = e.key.toLowerCase();
            // DevTools
            if (e.shiftKey && ['i','j','c','k'].includes(k)) {
                e.preventDefault();
                sendLog('devtools_open', `Ctrl+Shift+${e.key.toUpperCase()}`, 500);
                showToast('🚫 DevTools tidak diizinkan!', '#ef4444');
                return;
            }
            // Screenshot print
            if (k === 'p') {
                e.preventDefault();
                sendLog('screenshot_attempt', 'Ctrl+P (print)', 500);
                return;
            }
            // Copy/Cut
            if (['c','x'].includes(k)) {
                e.preventDefault();
                sendLog('copy_attempt', `Ctrl+${e.key.toUpperCase()}`, 1000);
                showToast('🚫 Copy tidak diizinkan!', '#f59e0b');
                return;
            }
            // Other forbidden
            if (['v','u','a','s','t','w','n','r','tab'].includes(k)) {
                e.preventDefault();
                sendLog('forbidden_key', `Ctrl+${e.key.toUpperCase()}`, 1000);
                return;
            }
        }
        // Alt+Tab / Alt+F4
        if (e.altKey && (e.key === 'Tab' || e.key === 'F4')) {
            e.preventDefault();
            sendLog('forbidden_key', `Alt+${e.key}`, 1000);
            return;
        }
        // Meta/Windows
        if (e.key === 'Meta' || e.key === 'OS') {
            e.preventDefault();
            sendLog('forbidden_key', 'Meta/Windows key', 2000);
            return;
        }
        // F1-F10, F11
        if (/^F[1-9]$|^F1[01]$/.test(e.key)) {
            e.preventDefault();
        }
    }, { capture: true });

    // ── 6. Copy/Paste/Cut events ─────────────────────────────
    ['copy','cut','paste'].forEach(evt => {
        document.addEventListener(evt, (e) => {
            e.preventDefault();
            sendLog(evt === 'paste' ? 'forbidden_key' : 'copy_attempt', `${evt} event`, 2000);
        });
    });

    // ── 7. Select prevent ─────────────────────────────────────
    document.addEventListener('selectstart', (e) => { e.preventDefault(); });
    document.addEventListener('dragstart', (e) => { e.preventDefault(); });

    // ── 8. Window resize DevTools detection ──────────────────
    const baseW = window.outerWidth, baseH = window.outerHeight;
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (Math.abs(window.outerWidth - baseW) > 200 || Math.abs(window.outerHeight - baseH) > 200) {
                sendLog('window_resize_extreme', `outerW=${window.outerWidth}`, 3000);
                sendLog('devtools_open', 'Extreme resize = possible DevTools', 3000);
            }
        }, 300);
    });

    // ── 9. Ctrl+Scroll zoom prevention ─────────────────────
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) e.preventDefault();
    }, { passive: false });

    // ── 10. Mobile: Multi-touch ──────────────────────────────
    document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
            sendLog('multi_touch', `${e.touches.length} fingers`, 2000);
        }
    }, { passive: true });

    // ── 11. Orientation change ────────────────────────────────
    window.addEventListener('orientationchange', () => {
        sendLog('visibility_hidden', `Orientation: ${screen.orientation?.type}`, 5000);
    });

    // ── 12. CSS: disable selection globally ──────────────────
    const s = document.createElement('style');
    s.textContent = `
        * { -webkit-user-select: none !important; user-select: none !important; }
        input, textarea { -webkit-user-select: text !important; user-select: text !important; }
    `;
    document.head.appendChild(s);

    console.log('[CBT] Anti-cheat v2.0 fully initialized. Device:', isMobile() ? 'MOBILE' : 'PC');
});

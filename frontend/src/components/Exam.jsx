import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ChevronRight, ChevronLeft, AlertCircle, Info, Shield, Camera, Monitor } from 'lucide-react';
import useMonitor from '../hooks/useMonitor';

// ============================================================
// ANTI-CHEAT ENGINE
// ============================================================

/**
 * Deteksi apakah perangkat mobile berdasarkan UA + touch.
 */
const isMobile = () =>
    /android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1);

/**
 * Hook anti-cheat komprehensif (PC + Mobile).
 * Mengirimkan log ke server dengan feature vector.
 */
const useAntiCheat = (sessionId, onViolation) => {
    const cooldowns      = useRef({});   // activity_type → last-sent timestamp
    const featureRef     = useRef({      // Akumulator fitur sesi ini
        blur_count:           0,
        hidden_count:         0,
        forbidden_key_count:  0,
        context_menu_count:   0,
        screenshot_attempt:   0,
        devtools_open:        0,
        copy_attempt:         0,
        screen_share_detect:  0,
        window_resize_extreme:0,
        multi_touch_suspic:   0,
        tab_switch_rapid:     0,
        fullscreen_exit:      0,
    });
    const lastHiddenRef  = useRef(null);
    const touchCountRef  = useRef(0);
    const devtoolsRef    = useRef(false);
    const isFullscreen   = useRef(false);

    /**
     * Kirim log ke server (dengan cooldown per activity).
     * @param {string} activity  - jenis aktivitas
     * @param {string} details   - detail tambahan
     * @param {number} cooldownMs- minimum jarak antar pengiriman (ms)
     */
    const sendLog = useCallback(async (activity, details = '', cooldownMs = 2000) => {
        if (!sessionId) return;

        const now = Date.now();
        const last = cooldowns.current[activity] || 0;
        if (now - last < cooldownMs) return; // throttle
        cooldowns.current[activity] = now;

        // Update feature counter lokal
        const f = featureRef.current;
        if (activity === 'blur')                f.blur_count++;
        if (activity === 'visibility_hidden')   f.hidden_count++;
        if (activity === 'forbidden_key')       f.forbidden_key_count++;
        if (activity === 'context_menu')        f.context_menu_count++;
        if (activity === 'screenshot_attempt')  f.screenshot_attempt++;
        if (activity === 'devtools_open')       f.devtools_open++;
        if (activity === 'copy_attempt')        f.copy_attempt++;
        if (activity === 'screen_share')        f.screen_share_detect++;
        if (activity === 'window_resize_extreme') f.window_resize_extreme++;
        if (activity === 'multi_touch')         f.multi_touch_suspic++;
        if (activity === 'fullscreen_exit')     f.fullscreen_exit++;

        // Tab switch rapid detection
        if (activity === 'visibility_hidden') {
            lastHiddenRef.current = now;
        } else if (activity === 'blur' && lastHiddenRef.current) {
            if (now - lastHiddenRef.current < 2000) f.tab_switch_rapid++;
        }

        try {
            const res = await axios.post('/api/submit-log', {
                session_id:    sessionId,
                activity_type: activity,
                details:       details,
                features:      { ...featureRef.current },
            });

            if (res.data?.terminated) {
                onViolation?.({ type: 'TERMINATED', message: 'Sesi Anda telah dihentikan otomatis karena kecurangan terdeteksi.' });
            } else if (res.data?.violated) {
                onViolation?.({ type: 'VIOLATION', message: `Aktivitas mencurigakan terdeteksi: ${activity}` });
            } else if (res.data?.warning) {
                onViolation?.({ type: 'WARNING', message: res.data.warning });
            }
        } catch (err) {
            // Abaikan error jaringan sementara
            console.warn('[AntiCheat] Log error:', err.message);
        }
    }, [sessionId, onViolation]);

    /**
     * Minta fullscreen. Jika ditolak, catat sebagai violation.
     */
    const requestFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
                isFullscreen.current = true;
            }
        } catch {
            // Browser tidak support atau denied — catat
            sendLog('fullscreen_exit', 'Fullscreen request denied', 0);
        }
    }, [sendLog]);

    useEffect(() => {
        if (!sessionId) return;
        const mobile = isMobile();

        // ── 1. Request fullscreen (PC & Mobile) ─────────────────
        requestFullscreen();

        // ── 2. Monitor fullscreen change ─────────────────────────
        const onFullscreenChange = () => {
            if (!document.fullscreenElement) {
                isFullscreen.current = false;
                sendLog('fullscreen_exit', 'User exited fullscreen', 500);
                onViolation?.({ type: 'FULLSCREEN', message: '⚠️ Keluar dari layar penuh terdeteksi! Sistem mencatat aktivitas ini.' });
                // Re-request after 2 seconds
                setTimeout(() => requestFullscreen(), 2000);
            } else {
                isFullscreen.current = true;
            }
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);

        // ── 3. Blur / Focus (berpindah tab/window) ───────────────
        const onBlur = () => {
            sendLog('blur', 'Window focus lost', 1500);
        };
        const onFocus = () => {
            sendLog('focus', 'Window focus restored', 5000);
        };
        window.addEventListener('blur', onBlur);
        window.addEventListener('focus', onFocus);

        // ── 4. Visibility change (mobile + PC) ───────────────────
        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                lastHiddenRef.current = Date.now();
                sendLog('visibility_hidden', 'Page hidden / app backgrounded', 1000);
            }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        // ── 5. Context menu (klik kanan) ─────────────────────────
        const onContextMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            sendLog('context_menu', 'Right-click attempt', 3000);
            return false;
        };
        document.addEventListener('contextmenu', onContextMenu);

        // ── 6. Keyboard — PC anti-cheat ──────────────────────────
        const onKeyDown = (e) => {
            // PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                sendLog('screenshot_attempt', 'PrintScreen key pressed', 500);
                onViolation?.({ type: 'SCREENSHOT', message: '📸 Screenshot terdeteksi! Aktivitas ini dicatat oleh sistem.' });
                return;
            }

            // F12 — DevTools
            if (e.key === 'F12') {
                e.preventDefault();
                sendLog('devtools_open', 'F12 pressed', 500);
                return;
            }

            // Windows key
            if (e.key === 'Meta' || e.key === 'OS') {
                e.preventDefault();
                sendLog('forbidden_key', 'Windows/Meta key pressed', 2000);
                return;
            }

            // Ctrl combinations
            if (e.ctrlKey || e.metaKey) {
                const key = e.key.toLowerCase();

                // Screenshot tools & sharing
                if (key === 'p' || key === 'shift' && e.key === 'S') {
                    e.preventDefault();
                    sendLog('screenshot_attempt', `Ctrl+${e.key.toUpperCase()} (print/screenshot)`, 500);
                    onViolation?.({ type: 'SCREENSHOT', message: '📸 Screenshot terdeteksi! Aktivitas ini dicatat oleh sistem.' });
                    return;
                }

                // DevTools shortcuts
                if (
                    (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k', 'm'].includes(key)) ||
                    (e.ctrlKey && e.shiftKey && key === 'f5')
                ) {
                    e.preventDefault();
                    sendLog('devtools_open', `Ctrl+Shift+${e.key.toUpperCase()}`, 500);
                    return;
                }

                // Copy / paste / select all / view-source
                if (['c', 'v', 'u', 'a', 's', 'x'].includes(key)) {
                    e.preventDefault();
                    if (key === 'c' || key === 'x') {
                        sendLog('copy_attempt', `Ctrl+${e.key.toUpperCase()}`, 1000);
                    } else {
                        sendLog('forbidden_key', `Ctrl+${e.key.toUpperCase()}`, 1000);
                    }
                    return;
                }

                // Tab switching Ctrl+Tab / Ctrl+W / Ctrl+T / Ctrl+N
                if (['tab', 'w', 't', 'n', 'r'].includes(key)) {
                    e.preventDefault();
                    sendLog('forbidden_key', `Ctrl+${e.key.toUpperCase()} (tab/window control)`, 1000);
                    return;
                }
            }

            // Alt+Tab / Alt+F4
            if (e.altKey) {
                if (e.key === 'Tab' || e.key === 'F4') {
                    e.preventDefault();
                    sendLog('forbidden_key', `Alt+${e.key}`, 1000);
                    return;
                }
            }

            // Function keys F1-F10 (kecuali sudah handled)
            if (['F1','F2','F3','F4','F5','F6','F7','F8','F10','F11'].includes(e.key)) {
                e.preventDefault();
                if (e.key === 'F11') {
                    // F11 = fullscreen toggle oleh browser, cegah
                    e.preventDefault();
                    sendLog('forbidden_key', 'F11 fullscreen toggle attempt', 2000);
                }
                return;
            }
        };
        document.addEventListener('keydown', onKeyDown, { capture: true });

        // ── 7. Copy / Paste / Cut events ─────────────────────────
        const onCopy = (e) => {
            e.preventDefault();
            sendLog('copy_attempt', 'Copy event triggered', 1000);
        };
        const onCut = (e) => { e.preventDefault(); sendLog('copy_attempt', 'Cut event', 1000); };
        const onPaste = (e) => { e.preventDefault(); sendLog('forbidden_key', 'Paste attempt', 2000); };
        document.addEventListener('copy', onCopy);
        document.addEventListener('cut', onCut);
        document.addEventListener('paste', onPaste);

        // ── 8. Window resize — deteksi DevTools (PC) ─────────────
        let resizeTimer = null;
        const normalW = window.outerWidth;
        const normalH = window.outerHeight;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const dW = Math.abs(window.outerWidth - normalW);
                const dH = Math.abs(window.outerHeight - normalH);
                // Jika resize sangat besar → kemungkinan DevTools dibuka
                if (dW > 200 || dH > 200) {
                    sendLog('window_resize_extreme', `Resize: outW=${window.outerWidth} outH=${window.outerHeight}`, 3000);
                    if (!devtoolsRef.current) {
                        devtoolsRef.current = true;
                        sendLog('devtools_open', 'Extreme window resize — possible DevTools', 3000);
                    }
                } else {
                    devtoolsRef.current = false;
                }
            }, 300);
        };
        window.addEventListener('resize', onResize);

        // ── 9. DevTools detection via timing attack ─────────────
        // Jika ada debugger statement atau timing panjang → mungkin DevTools
        let dtCheckInterval = null;
        if (!mobile) {
            dtCheckInterval = setInterval(() => {
                const start = performance.now();
                // eslint-disable-next-line no-debugger
                const end = performance.now();
                if (end - start > 100) {
                    if (!devtoolsRef.current) {
                        devtoolsRef.current = true;
                        sendLog('devtools_open', 'Timing attack detected', 5000);
                    }
                } else {
                    devtoolsRef.current = false;
                }
            }, 5000);
        }

        // ── 10. Drag & Drop prevention ────────────────────────────
        const onDragStart = (e) => { e.preventDefault(); return false; };
        document.addEventListener('dragstart', onDragStart);

        // ── 11. Select text prevention ────────────────────────────
        const onSelectStart = (e) => { e.preventDefault(); return false; };
        document.addEventListener('selectstart', onSelectStart);

        // ── 12. Scroll-to-zoom (pinch) prevention ────────────────
        const onWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); // Ctrl+Scroll = zoom
            }
        };
        document.addEventListener('wheel', onWheel, { passive: false });

        // ── 13. Mobile: multi-touch detection ────────────────────
        let touchStartTime = null;
        const onTouchStart = (e) => {
            touchCountRef.current = e.touches.length;
            touchStartTime = Date.now();
            if (e.touches.length > 1) {
                sendLog('multi_touch', `Multi-touch: ${e.touches.length} fingers`, 2000);
            }
        };
        const onTouchEnd = (e) => {
            // iOS: Power + Volume = screenshot — biasanya appends visibilitychange hidden < 500ms
            // Deteksi: hidden event sangat cepat setelah touchend
            touchCountRef.current = 0;
        };
        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        // ── 14. Mobile: screenshot via visibilitychange rapid ─────
        // iOS screenshot: hidden → visible sangat cepat (< 800ms)
        let lastHiddenTs = null;
        const onVisibilityShort = () => {
            if (document.visibilityState === 'hidden') {
                lastHiddenTs = Date.now();
            } else if (document.visibilityState === 'visible' && lastHiddenTs) {
                const elapsed = Date.now() - lastHiddenTs;
                if (mobile && elapsed < 800) {
                    // Kemungkinan screenshot pada iOS
                    sendLog('screenshot_attempt', `iOS screenshot pattern: visible after ${elapsed}ms`, 1000);
                    onViolation?.({ type: 'SCREENSHOT', message: '📸 Kemungkinan screenshot terdeteksi!' });
                }
                lastHiddenTs = null;
            }
        };
        document.addEventListener('visibilitychange', onVisibilityShort);

        // ── 15. Screen Share detection via WebRTC ─────────────────
        const checkScreenShare = async () => {
            if (!navigator.mediaDevices) return;
            try {
                // Check getDisplayMedia — jika dipanggil dari luar konteks user gesture = throw
                // Hanya listen jika ada track aktif
                if (typeof MediaStreamTrack !== 'undefined') {
                    const tracks = [];
                    // Tidak bisa force check tanpa user gesture, tapi bisa deteksi
                    // via resize + getUserMedia track
                }
            } catch { /* ignore */ }
        };

        // Listen capture events (Chrome/Edge specific)
        const onCapture = () => {
            sendLog('screen_share', 'Screen capture/share detected', 1000);
            onViolation?.({ type: 'SCREENSHOT', message: '🖥️ Screen share terdeteksi! Sesi Anda dihentikan.' });
        };
        document.addEventListener('visibilitychange', () => {}, { passive: true });

        // ── 16. Orientation change (mobile) ──────────────────────
        const onOrientationChange = () => {
            sendLog('visibility_hidden', `Orientation changed: ${screen.orientation?.type || 'unknown'}`, 5000);
        };
        window.addEventListener('orientationchange', onOrientationChange);

        // ── 17. Heartbeat setiap 30 detik ─────────────────────────
        const heartbeat = setInterval(() => {
            sendLog('heartbeat', `device=${isMobile() ? 'mobile' : 'pc'}`, 25000);
        }, 30000);

        // ── 18. Disable text selection via CSS ────────────────────
        const style = document.createElement('style');
        style.id = 'anti-cheat-style';
        style.textContent = `
            * { -webkit-user-select: none !important; user-select: none !important; }
            input, textarea { -webkit-user-select: text !important; user-select: text !important; }
        `;
        document.head.appendChild(style);

        // ── Cleanup ──────────────────────────────────────────────
        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            window.removeEventListener('blur', onBlur);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            document.removeEventListener('visibilitychange', onVisibilityShort);
            document.removeEventListener('contextmenu', onContextMenu);
            document.removeEventListener('keydown', onKeyDown, { capture: true });
            document.removeEventListener('copy', onCopy);
            document.removeEventListener('cut', onCut);
            document.removeEventListener('paste', onPaste);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onOrientationChange);
            document.removeEventListener('dragstart', onDragStart);
            document.removeEventListener('selectstart', onSelectStart);
            document.removeEventListener('wheel', onWheel);
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchend', onTouchEnd);
            clearInterval(heartbeat);
            if (dtCheckInterval) clearInterval(dtCheckInterval);
            clearTimeout(resizeTimer);
            const styleEl = document.getElementById('anti-cheat-style');
            if (styleEl) styleEl.remove();
            // Keluar fullscreen saat ujian selesai
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        };
    }, [sessionId, sendLog, onViolation, requestFullscreen]);

    return { sendLog, featureRef };
};

// ============================================================
// EXAM COMPONENT
// ============================================================

const Exam = ({ user }) => {
    const { examId } = useParams();
    const navigate   = useNavigate();

    const [session,         setSession]         = useState(null);
    const [exam,            setExam]            = useState(null);
    const [timeLeft,        setTimeLeft]        = useState(3600);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [questions,       setQuestions]       = useState([]);
    const [answers,         setAnswers]         = useState({});
    const [result,          setResult]          = useState(null);
    const [violation,       setViolation]       = useState(null);
    const [screenshotWarns, setScreenshotWarns] = useState(0);
    const [fullscreenMsg,   setFullscreenMsg]   = useState(false);
    const initialized = useRef(false);

    const handleViolation = useCallback((v) => {
        if (v.type === 'SCREENSHOT') {
            setScreenshotWarns(n => n + 1);
        }
        setViolation(v);
    }, []);

    // ── Anti-Cheat Engine ────────────────────────────────────
    useAntiCheat(session, handleViolation);

    // ── useMonitor hook (polling admin warnings) ─────────────
    useMonitor(session, (data) => {
        if (data.terminated) {
            setViolation({ type: 'TERMINATED', message: 'Sesi Anda dihentikan oleh admin.' });
        }
        if (data.warning) {
            setViolation({ type: 'WARNING', message: data.warning });
        }
        if (data.violated) {
            setViolation({ type: 'VIOLATION', message: 'SISTEM MENDETEKSI AKTIVITAS MENCURIGAKAN!' });
        }
    });

    const handleAnswer = (qId, optionIdx) => {
        setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
    };

    const handleSubmitExam = async () => {
        if (!confirm('Apakah Anda yakin ingin mengumpulkan jawaban?')) return;
        try {
            const res = await axios.post('/api/submit-exam', {
                session_id: session,
                answers,
            });
            setResult(res.data);
            // Keluar fullscreen saat selesai
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        } catch (err) {
            const msg = err.response?.data?.error || 'Pengumpulan gagal';
            alert(`Error: ${msg}`);
        }
    };

    // ── Init exam ────────────────────────────────────────────
    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const start = async () => {
            try {
                const res = await axios.post('/api/start-exam', {
                    user_id: user.user_id,
                    exam_id: examId,
                });
                setSession(res.data.session_id);
                setExam(res.data.exam);

                // Gunakan remaining_seconds dari server (server-side timer)
                if (res.data.remaining_seconds) {
                    setTimeLeft(res.data.remaining_seconds);
                }

                const qRes = await axios.get(`/api/questions?exam_id=${examId}`);

                if (qRes.data.length > 0) {
                    const formatted = qRes.data.map(q => {
                        let opts = q.options;
                        if (typeof opts === 'string') {
                            try { opts = JSON.parse(opts); } catch { opts = []; }
                        }
                        return {
                            question_id: q.question_id,
                            text:        q.question_text || 'Soal tidak tersedia',
                            options:     Array.isArray(opts) ? opts : [],
                        };
                    });
                    setQuestions(formatted);
                } else {
                    setQuestions([{ question_id: -1, text: 'Tidak ada soal untuk ujian ini.', options: [] }]);
                }
            } catch (err) {
                const msg = err.response?.data?.error || 'Tidak dapat terhubung ke server';
                alert(`Error: ${msg}`);
                navigate('/student-dashboard');
            }
        };
        start();
    }, [examId, user.user_id, navigate]);

    // ── Timer countdown ──────────────────────────────────────
    useEffect(() => {
        if (!exam) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmitExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [exam]);

    // ── Check-status polling ─────────────────────────────────
    useEffect(() => {
        if (!session) return;
        const checkStatus = setInterval(async () => {
            try {
                const res = await axios.get(`/api/check-status/${session}`);
                if (res.data.status === 'TERMINATED') {
                    setViolation({ type: 'TERMINATED', message: 'Sesi Anda dihentikan oleh admin.' });
                }
                if (res.data.warning) {
                    setViolation({ type: 'WARNING', message: res.data.warning });
                }
                // Sync timer dengan server
                if (res.data.remaining_seconds !== undefined) {
                    setTimeLeft(res.data.remaining_seconds);
                }
            } catch { /* network error, retry next cycle */ }
        }, 5000);
        return () => clearInterval(checkStatus);
    }, [session]);

    // ── Timer format ─────────────────────────────────────────
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const timerWarning = timeLeft < 300; // < 5 menit
    const timerCritical = timeLeft < 60; // < 1 menit

    // ── Overlays ─────────────────────────────────────────────
    const ViolationOverlay = ({ type, message, onDismiss }) => (
        <div className="lockdown-overlay">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="lockdown-card"
            >
                <AlertCircle size={64} color="#ef4444" />
                <h2>{type === 'TERMINATED' ? 'UJIAN DIHENTIKAN' : type === 'SCREENSHOT' ? '📸 SCREENSHOT TERDETEKSI' : 'PERINGATAN KEAMANAN'}</h2>
                <p>{message}</p>
                {type === 'SCREENSHOT' && (
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '-0.5rem' }}>
                        Screenshot ke-{screenshotWarns}. Sesi akan dihentikan otomatis setelah 2 screenshot.
                    </p>
                )}
                {type !== 'TERMINATED' && (
                    <button className="btn-primary" onClick={onDismiss}>
                        Saya Mengerti &amp; Lanjutkan
                    </button>
                )}
                {type === 'TERMINATED' && (
                    <button className="btn-danger" onClick={() => navigate('/student-dashboard')}>
                        Kembali ke Dashboard
                    </button>
                )}
            </motion.div>
        </div>
    );

    const FullscreenPrompt = () => (
        <div className="lockdown-overlay">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="lockdown-card">
                <Monitor size={64} color="#00b4db" />
                <h2 style={{ color: '#00b4db' }}>Mode Layar Penuh Diperlukan</h2>
                <p>Ujian harus dijalankan dalam mode layar penuh untuk keamanan. Klik tombol di bawah untuk melanjutkan.</p>
                <button className="btn-primary" onClick={async () => {
                    try {
                        await document.documentElement.requestFullscreen();
                        setFullscreenMsg(false);
                    } catch { /* denied */ }
                }}>
                    Aktifkan Layar Penuh
                </button>
            </motion.div>
        </div>
    );

    const ResultOverlay = ({ score, correct, total }) => (
        <div className="lockdown-overlay">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="lockdown-card"
                style={{ borderColor: '#4ade80', boxShadow: '0 0 50px rgba(74, 222, 128, 0.3)' }}
            >
                <CheckCircle size={80} color="#4ade80" />
                <h2 style={{ color: '#4ade80' }}>Ujian Selesai!</h2>
                <div style={{ fontSize: '1.2rem', margin: '1rem 0', color: '#e2e8f0', textAlign: 'center' }}>
                    <p>Nilai Anda: <strong style={{ color: '#4ade80', fontSize: '1.5rem' }}>{Number(score).toFixed(0)}</strong></p>
                    <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>Benar: {correct} / {total}</p>
                </div>
                <button className="btn-primary" onClick={() => navigate('/student-dashboard')}>
                    Kembali ke Dashboard
                </button>
            </motion.div>
        </div>
    );

    // ── Loading states ───────────────────────────────────────
    if (!exam) return (
        <div className="loading-screen">
            <div className="loading-spinner" />
            <p>Mempersiapkan Lingkungan Ujian Aman...</p>
        </div>
    );
    if (questions.length === 0) return (
        <div className="loading-screen">
            <div className="loading-spinner" />
            <p>Memuat Soal Ujian...</p>
        </div>
    );

    const currentQ = questions[currentQuestion];
    const answeredCount = Object.keys(answers).length;

    return (
        <div className="exam-layout">
            {/* ── Navigation Bar ── */}
            <nav className="exam-nav glass">
                <div className="nav-left">
                    <Shield size={18} color="#00b4db" />
                    <h2>SECURE ASSESSMENT</h2>
                </div>
                <div className="nav-center">
                    <div className={`timer-box ${timerWarning ? 'timer-warn' : ''} ${timerCritical ? 'timer-critical' : ''}`}>
                        <Clock size={16} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                </div>
                <div className="nav-right">
                    <div className="user-info">
                        <p className="user-name">{user.nama_lengkap}</p>
                        <p className="user-nim">{user.nim}</p>
                    </div>
                </div>
            </nav>

            {/* ── Main Content ── */}
            <main className="exam-main">
                {/* ── Sidebar ── */}
                <aside className="exam-sidebar glass">
                    <h3>Daftar Soal</h3>
                    <div className="question-grid">
                        {questions.map((q, idx) => (
                            <button
                                key={idx}
                                className={`q-btn ${currentQuestion === idx ? 'active' : ''} ${answers[q.question_id] !== undefined ? 'answered' : ''}`}
                                onClick={() => setCurrentQuestion(idx)}
                            >
                                {idx + 1}
                            </button>
                        ))}
                    </div>
                    <div className="sidebar-progress">
                        <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                        </div>
                        <span>{answeredCount}/{questions.length} dijawab</span>
                    </div>
                    <div className="monitor-status">
                        <div className="status-item">
                            <div className="pulse green" />
                            <span>Anti-Cheat Aktif</span>
                        </div>
                        <div className="status-item">
                            <div className="pulse blue" />
                            <span>AI Engine: ON</span>
                        </div>
                        {isMobile() && (
                            <div className="status-item">
                                <Camera size={10} color="#f59e0b" />
                                <span style={{ color: '#f59e0b' }}>Mobile Protected</span>
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Question Area ── */}
                <div className="exam-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestion}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="question-card glass"
                        >
                            <div className="q-header">
                                <span className="q-number">Soal {currentQuestion + 1} dari {questions.length}</span>
                                <Info size={16} color="var(--text-muted)" />
                            </div>

                            <p className="q-text">{currentQ?.text}</p>

                            <div className="options-list">
                                {currentQ?.options?.map((opt, i) => (
                                    <label
                                        key={i}
                                        className={`option-item ${answers[currentQ?.question_id] === i ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name={`q${currentQuestion}`}
                                            checked={answers[currentQ?.question_id] === i}
                                            onChange={() => handleAnswer(currentQ?.question_id, i)}
                                        />
                                        <span className="option-letter">{['A', 'B', 'C', 'D'][i]}</span>
                                        <span className="opt-text">{opt}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="q-footer">
                                <button
                                    className="btn-secondary"
                                    disabled={currentQuestion === 0}
                                    onClick={() => setCurrentQuestion(c => c - 1)}
                                >
                                    <ChevronLeft size={18} /> Sebelumnya
                                </button>
                                {currentQuestion === questions.length - 1 ? (
                                    <button className="btn-primary" onClick={handleSubmitExam}>
                                        Kumpulkan Jawaban <CheckCircle size={18} />
                                    </button>
                                ) : (
                                    <button className="btn-primary" onClick={() => setCurrentQuestion(c => c + 1)}>
                                        Selanjutnya <ChevronRight size={18} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Warning Banner */}
                    <div className="warning-banner glass">
                        <AlertCircle size={16} />
                        <span>
                            Jangan tinggalkan jendela browser. Semua aktivitas dipantau oleh AI Engine secara real-time.
                            Screenshot, screen share, dan DevTools akan menyebabkan sesi dihentikan.
                        </span>
                    </div>
                </div>
            </main>

            {/* ── Overlays ── */}
            {violation && (
                <ViolationOverlay
                    type={violation.type}
                    message={violation.message}
                    onDismiss={() => setViolation(null)}
                />
            )}
            {result && <ResultOverlay score={result.score} correct={result.correct} total={result.total} />}

            <style>{`
                /* ── Layout ── */
                .exam-layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
                .exam-nav {
                    padding: 0.75rem 2rem; display: flex; justify-content: space-between; align-items: center;
                    border-radius: 0; border-left: none; border-right: none; border-top: none;
                    flex-shrink: 0;
                }
                .nav-left { display: flex; align-items: center; gap: 10px; }
                .nav-left h2 { margin: 0; font-size: 0.9rem; color: var(--text-muted); letter-spacing: 0.08em; }
                .nav-center { display: flex; justify-content: center; }
                .nav-right { display: flex; justify-content: flex-end; }
                .user-info { text-align: right; }
                .user-name { margin: 0; font-weight: 700; font-size: 0.875rem; }
                .user-nim  { margin: 0; font-size: 0.72rem; color: var(--text-muted); }

                /* Timer */
                .timer-box {
                    display: flex; align-items: center; gap: 8px;
                    font-weight: 700; color: var(--primary); font-family: monospace; font-size: 1.25rem;
                    padding: 6px 16px; border-radius: 8px; background: rgba(0,180,219,0.08);
                    border: 1px solid rgba(0,180,219,0.2);
                    transition: all 0.3s;
                }
                .timer-box.timer-warn { color: #f59e0b; background: rgba(245,158,11,0.08); border-color: rgba(245,158,11,0.2); }
                .timer-box.timer-critical { color: #ef4444; background: rgba(239,68,68,0.12); border-color: rgba(239,68,68,0.3); animation: timerPulse 1s infinite; }
                @keyframes timerPulse { 0%,100%{opacity:1}50%{opacity:0.6} }

                /* Main layout */
                .exam-main { flex: 1; display: flex; overflow: hidden; gap: 0; }

                /* Sidebar */
                .exam-sidebar {
                    width: 220px; min-width: 220px; padding: 1.25rem;
                    display: flex; flex-direction: column; gap: 1rem;
                    border-radius: 0; border-top: none; border-bottom: none; border-left: none;
                    overflow-y: auto;
                }
                .exam-sidebar h3 { margin: 0; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
                .question-grid {
                    display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;
                    overflow-y: auto; max-height: 340px;
                }
                .question-grid::-webkit-scrollbar { width: 3px; }
                .question-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
                .q-btn {
                    aspect-ratio: 1; background: rgba(255,255,255,0.04); border: 1px solid var(--border);
                    color: var(--text-muted); border-radius: 6px; font-size: 0.78rem;
                    display: flex; align-items: center; justify-content: center; cursor: pointer;
                    transition: all 0.15s;
                }
                .q-btn:hover  { background: rgba(255,255,255,0.08); color: white; }
                .q-btn.active { background: var(--primary); border-color: var(--primary); color: #0f172a; font-weight: 700; }
                .q-btn.answered { background: rgba(34,197,94,0.12); border-color: rgba(34,197,94,0.3); color: #86efac; }
                .q-btn.active.answered { background: var(--primary); color: #0f172a; }

                /* Progress */
                .sidebar-progress { display: flex; flex-direction: column; gap: 6px; }
                .sidebar-progress span { font-size: 0.72rem; color: var(--text-muted); text-align: center; }
                .progress-bar-bg { height: 4px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary), #22c55e); border-radius: 3px; transition: width 0.3s; }

                /* Monitor status */
                .monitor-status { margin-top: auto; display: flex; flex-direction: column; gap: 6px; }
                .status-item { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text-muted); }
                .pulse { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; flex-shrink: 0; }
                .pulse.green { background: var(--success); }
                .pulse.blue  { background: var(--primary); }
                @keyframes pulse { 0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0} }

                /* Exam content */
                .exam-content { flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 1.5rem; gap: 1rem; }

                /* Question card */
                .question-card {
                    flex: 1; display: flex; flex-direction: column; gap: 1.5rem;
                    padding: 2rem; min-height: 0;
                }
                .q-header { display: flex; align-items: center; gap: 10px; }
                .q-number {
                    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
                    letter-spacing: 0.08em; color: var(--primary);
                    background: rgba(0,180,219,0.1); padding: 3px 10px; border-radius: 20px;
                    border: 1px solid rgba(0,180,219,0.25);
                }
                .q-text { font-size: 1.1rem; line-height: 1.7; font-weight: 500; color: #f8fafc; margin: 0; }

                /* Options */
                .options-list { display: flex; flex-direction: column; gap: 0.6rem; }
                .option-item {
                    display: flex; align-items: center; gap: 12px;
                    padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 10px;
                    cursor: pointer; transition: all 0.2s; background: rgba(255,255,255,0.02);
                }
                .option-item:hover { background: rgba(255,255,255,0.06); border-color: var(--primary); }
                .option-item.selected { background: rgba(0,180,219,0.1); border-color: var(--primary); }
                .option-item input { display: none; }
                .option-letter {
                    width: 26px; height: 26px; border-radius: 50%;
                    background: rgba(255,255,255,0.06); border: 1px solid var(--border);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.72rem; font-weight: 800; flex-shrink: 0;
                    transition: all 0.2s;
                }
                .option-item.selected .option-letter { background: var(--primary); border-color: var(--primary); color: #0f172a; }
                .opt-text { flex: 1; font-size: 0.95rem; }

                /* Footer */
                .q-footer {
                    display: flex; justify-content: space-between; align-items: center;
                    padding-top: 1.5rem; border-top: 1px solid var(--border); margin-top: auto;
                }

                /* Buttons */
                .btn-primary  { display: flex; align-items: center; gap: 8px; padding: 0.65rem 1.5rem; background: linear-gradient(135deg, #00b4db, #0083b0); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,180,219,0.4); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { display: flex; align-items: center; gap: 8px; padding: 0.65rem 1.5rem; background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text-muted); border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
                .btn-secondary:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
                .btn-secondary:disabled { opacity: 0.4; cursor: not-allowed; }
                .btn-danger { display: flex; align-items: center; gap: 8px; padding: 0.65rem 1.5rem; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .btn-danger:hover { background: rgba(239,68,68,0.2); }

                /* Warning banner */
                .warning-banner {
                    padding: 0.85rem 1.25rem; display: flex; align-items: flex-start; gap: 10px;
                    background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.15);
                    font-size: 0.8rem; color: #fca5a5; line-height: 1.5; flex-shrink: 0;
                }
                .warning-banner svg { flex-shrink: 0; margin-top: 2px; }

                /* Lockdown overlay */
                .lockdown-overlay {
                    position: fixed; inset: 0; background: rgba(10, 15, 30, 0.96);
                    backdrop-filter: blur(12px); z-index: 9999;
                    display: flex; align-items: center; justify-content: center;
                    padding: 2rem;
                }
                .lockdown-card {
                    background: #1a2540; border: 2px solid #ef4444;
                    padding: 2.5rem; border-radius: 20px; text-align: center;
                    max-width: 480px; width: 100%;
                    display: flex; flex-direction: column; align-items: center; gap: 1.25rem;
                    box-shadow: 0 0 60px rgba(239,68,68,0.35);
                }
                .lockdown-card h2 { color: #ef4444; font-size: 1.6rem; margin: 0; }
                .lockdown-card p  { font-size: 1rem; line-height: 1.6; color: #cbd5e1; margin: 0; }

                /* Loading */
                .loading-screen {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    height: 100vh; gap: 1.5rem;
                }
                .loading-spinner {
                    width: 48px; height: 48px; border: 4px solid var(--border);
                    border-top-color: var(--primary); border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                /* Responsive mobile */
                @media (max-width: 768px) {
                    .exam-sidebar { display: none; }
                    .exam-content { padding: 1rem; }
                    .question-card { padding: 1.25rem; }
                    .q-text { font-size: 1rem; }
                    .exam-nav { padding: 0.6rem 1rem; }
                    .nav-left h2 { display: none; }
                }
            `}</style>
        </div>
    );
};

export default Exam;

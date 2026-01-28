from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from config import Config
from models import db, User, Exam, SessionMonitoring, EventLog, RuleViolation, RFModelResult
from ml_engine import BehaviorClassifier
import datetime

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

# Initialize ML Engine
ml_engine = BehaviorClassifier()

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        nim = request.form.get('nim')
        user = User.query.filter_by(nim=nim).first()
        if not user:
            # Create user for demo purposes if not exists
            user = User(nama_lengkap=request.form.get('nama'), nim=nim)
            db.session.add(user)
            db.session.commit()
        
        session['user_id'] = user.user_id
        session['user_name'] = user.nama_lengkap
        return redirect(url_for('dashboard' if nim == 'admin' else 'start_exam'))
    return render_template('login.html')

@app.route('/start_exam')
def start_exam():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    # Create or get a dummy exam
    exam = Exam.query.first()
    if not exam:
        exam = Exam(subject_name="Ujian Tengah Semester - AI")
        db.session.add(exam)
        db.session.commit()
    
    # Start a monitoring session
    monitor_session = SessionMonitoring(user_id=session['user_id'], exam_id=exam.exam_id)
    db.session.add(monitor_session)
    db.session.commit()
    
    session['session_id'] = monitor_session.session_id
    return render_template('exam.html', exam=exam)

@app.route('/submit_log', methods=['POST'])
def submit_log():
    data = request.json
    session_id = session.get('session_id')
    if not session_id:
        return jsonify({"status": "error", "message": "No active session"}), 403

    activity_type = data.get('activity_type')
    details = data.get('details', '')

    # 1. Save Event Log
    log = EventLog(session_id=session_id, activity_type=activity_type, details=details)
    db.session.add(log)
    db.session.flush() # Get log_id

    # 2. Rule-Based Detection
    violated = False
    if activity_type == 'blur':
        # Count blur events in this session
        blur_count = EventLog.query.filter_by(session_id=session_id, activity_type='blur').count()
        if blur_count > 3:
            violation = RuleViolation(log_id=log.log_id, rule_code='TAB_SWITCH_EXCESSIVE')
            db.session.add(violation)
            violated = True
    elif activity_type == 'forbidden_key':
        violation = RuleViolation(log_id=log.log_id, rule_code='FORBIDDEN_KEY_DETECTED')
        db.session.add(violation)
        violated = True

    # 3. AI Monitoring (Random Forest)
    # Analyze the log and store confidence score
    conf_score = ml_engine.predict_cheating({'type': activity_type, 'details': details})
    rf_result = RFModelResult(log_id=log.log_id, conf_score=conf_score)
    db.session.add(rf_result)

    db.session.commit()

    return jsonify({
        "status": "success", 
        "rule_violated": violated,
        "ai_score": conf_score
    })

@app.route('/dashboard')
def dashboard():
    # Admin View: Show users and their violation statistics
    results = db.session.query(
        User.nama_lengkap, 
        User.nim, 
        db.func.count(RuleViolation.violation_id).label('violation_count'),
        db.func.avg(RFModelResult.conf_score).label('avg_ai_score')
    ).join(SessionMonitoring, User.user_id == SessionMonitoring.user_id) \
     .join(EventLog, SessionMonitoring.session_id == EventLog.session_id) \
     .outerjoin(RuleViolation, EventLog.log_id == RuleViolation.log_id) \
     .outerjoin(RFModelResult, EventLog.log_id == RFModelResult.log_id) \
     .group_by(User.user_id).all()

    return render_template('dashboard.html', results=results)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

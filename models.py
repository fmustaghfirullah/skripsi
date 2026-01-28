from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import BigInteger

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    nama_lengkap = db.Column(db.String(255), nullable=False)
    nim = db.Column(db.String(20), unique=True, nullable=False)
    
    sessions = db.relationship('SessionMonitoring', backref='user', lazy=True)

class Exam(db.Model):
    __tablename__ = 'exams'
    exam_id = db.Column(db.Integer, primary_key=True)
    subject_name = db.Column(db.String(255), nullable=False)
    
    sessions = db.relationship('SessionMonitoring', backref='exam', lazy=True)

class SessionMonitoring(db.Model):
    __tablename__ = 'session_monitoring'
    session_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey('exams.exam_id'), nullable=False)
    
    logs = db.relationship('EventLog', backref='session', lazy=True)

class EventLog(db.Model):
    __tablename__ = 'event_logs'
    log_id = db.Column(BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('session_monitoring.session_id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False) # 'blur', 'visibility_hidden', 'forbidden_key', 'context_menu'
    details = db.Column(db.Text, nullable=True) # For specific key or other info
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
    
    violation = db.relationship('RuleViolation', backref='log', uselist=False)
    rf_result = db.relationship('RFModelResult', backref='log', uselist=False)

class RuleViolation(db.Model):
    __tablename__ = 'rule_violations'
    violation_id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(BigInteger().with_variant(db.Integer, "sqlite"), db.ForeignKey('event_logs.log_id'), nullable=False)
    rule_code = db.Column(db.String(50), nullable=False) # e.g., 'TAB_SWITCH_EXCESSIVE', 'FORBIDDEN_KEY'

class RFModelResult(db.Model):
    __tablename__ = 'rf_model_results'
    rf_id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(BigInteger().with_variant(db.Integer, "sqlite"), db.ForeignKey('event_logs.log_id'), nullable=False)
    conf_score = db.Column(db.Float, nullable=False)

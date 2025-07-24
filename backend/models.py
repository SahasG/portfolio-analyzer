from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)
    stocks = db.relationship('Stock', backref='portfolio', lazy=True, cascade="all, delete-orphan")
    strategy = db.relationship('Strategy', backref='portfolio', uselist=False, lazy=True, cascade="all, delete-orphan")

class Stock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ticker = db.Column(db.String(10), nullable=False)
    shares = db.Column(db.Float, nullable=False)
    average_price = db.Column(db.Float, nullable=False, default=0.0)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolio.id'), nullable=False)

class Strategy(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolio.id'), unique=True, nullable=False)
    allocations = db.relationship('StrategyAllocation', backref='strategy', lazy=True, cascade="all, delete-orphan")

class StrategyAllocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    strategy_id = db.Column(db.Integer, db.ForeignKey('strategy.id'), nullable=False)
    ticker = db.Column(db.String(10), nullable=False)
    percentage = db.Column(db.Float, nullable=False)

class PortfolioHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    portfolio_id = db.Column(db.Integer, db.ForeignKey('portfolio.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    total_value = db.Column(db.Float, nullable=False)
    total_pl = db.Column(db.Float, nullable=False)
    total_pl_percent = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Add relationship to portfolio
    portfolio = db.relationship('Portfolio', backref=db.backref('history', lazy=True))

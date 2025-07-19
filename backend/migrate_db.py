#!/usr/bin/env python3
"""
Database migration script to add average_price field to existing stocks
"""

import os
import sys
from flask import Flask
from models import db, Stock

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///portfolio.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def migrate_database():
    app = create_app()
    
    with app.app_context():
        try:
            # Create all tables (this will add the new average_price column)
            db.create_all()
            
            # Update existing stocks with default average_price of 0.0
            # In a real scenario, you might want to calculate this from historical data
            stocks_without_avg_price = Stock.query.filter(Stock.average_price == None).all()
            
            for stock in stocks_without_avg_price:
                if stock.average_price is None or stock.average_price == 0:
                    # Set a default average price (you might want to use current price or historical data)
                    stock.average_price = 100.0  # Default placeholder value
                    print(f"Updated {stock.ticker} with default average price: {stock.average_price}")
            
            db.session.commit()
            print("Database migration completed successfully!")
            
        except Exception as e:
            print(f"Migration failed: {e}")
            db.session.rollback()
            sys.exit(1)

if __name__ == '__main__':
    migrate_database()

#!/usr/bin/env python3
"""
Database initialization script to create tables with proper schema
"""

import os
import sys
from flask import Flask
from models import db, Portfolio, Stock, Strategy, StrategyAllocation

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///portfolio.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)
    return app

def init_database():
    app = create_app()
    
    with app.app_context():
        try:
            # Drop all existing tables
            db.drop_all()
            print("Dropped all existing tables")
            
            # Create all tables with the new schema
            db.create_all()
            print("Created all tables with new schema including average_price field")
            
            # Verify the Stock table has the average_price column
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            columns = inspector.get_columns('stock')
            column_names = [col['name'] for col in columns]
            
            if 'average_price' in column_names:
                print("✓ Stock table successfully created with average_price column")
                print(f"Stock table columns: {column_names}")
            else:
                print("✗ ERROR: Stock table missing average_price column")
                sys.exit(1)
                
            print("Database initialization completed successfully!")
            
        except Exception as e:
            print(f"Database initialization failed: {e}")
            sys.exit(1)

if __name__ == '__main__':
    init_database()

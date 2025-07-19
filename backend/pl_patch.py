#!/usr/bin/env python3
"""
Patch script to add P/L calculations to portfolio endpoints
"""

def add_pl_calculations(stock, current_price, stock_value):
    """
    Calculate P/L data for a stock
    """
    cost_basis = stock.shares * stock.average_price
    pl_dollar = stock_value - cost_basis
    pl_percent = (pl_dollar / cost_basis * 100) if cost_basis > 0 else 0
    
    return {
        'id': stock.id,
        'ticker': stock.ticker,
        'shares': stock.shares,
        'average_price': stock.average_price,
        'current_price': current_price,
        'value': round(stock_value, 2),
        'pl_dollar': round(pl_dollar, 2),
        'pl_percent': round(pl_percent, 2)
    }

# This function can be imported and used in app.py to replace the stock_data creation
print("P/L calculation function created. Import add_pl_calculations from this file.")

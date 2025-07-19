#!/usr/bin/env python3
"""
Updated portfolio endpoint code with P/L calculations
"""

# Individual portfolio endpoint (GET /api/portfolios/<id>) - UPDATED VERSION
def get_portfolio_with_pl(portfolio, ticker_prices):
    """
    Generate portfolio data with P/L calculations
    """
    stocks_data = []
    portfolio_value = 0.0
    
    for stock in portfolio.stocks:
        current_price = ticker_prices.get(stock.ticker, 0)
        stock_value = current_price * stock.shares if current_price else 0
        
        # Calculate P/L data
        cost_basis = stock.shares * stock.average_price
        pl_dollar = stock_value - cost_basis
        pl_percent = (pl_dollar / cost_basis * 100) if cost_basis > 0 else 0
        
        stock_data = {
            'id': stock.id,
            'ticker': stock.ticker,
            'shares': stock.shares,
            'average_price': stock.average_price,
            'current_price': current_price,
            'value': round(stock_value, 2),
            'pl_dollar': round(pl_dollar, 2),
            'pl_percent': round(pl_percent, 2)
        }
        stocks_data.append(stock_data)
        portfolio_value += stock_value
    
    return {
        'id': portfolio.id, 
        'name': portfolio.name, 
        'stocks': stocks_data,
        'total_value': round(portfolio_value, 2)
    }

print("Updated portfolio endpoint function created with P/L calculations")

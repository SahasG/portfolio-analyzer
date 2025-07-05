import os
import requests
import math
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
FMP_API_KEY = os.getenv('FMP_API_KEY')
if not FMP_API_KEY:
    print("WARNING: FMP_API_KEY not found in environment variables")

# Constants
FMP_BASE_URL = "https://financialmodelingprep.com/api/v3"

app = Flask(__name__)
CORS(app) # This will allow the frontend to make requests to the backend

# --- Financial Modeling Prep API Configuration ---
# IMPORTANT: You need a free API key from https://financialmodelingprep.com/developer
FMP_API_KEY = os.getenv('FMP_API_KEY')
FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3'

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///portfolio.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
from models import db, Portfolio, Stock, Strategy, StrategyAllocation

db.init_app(app)
migrate = Migrate(app, db)

# API routes
@app.route('/api/portfolios', methods=['GET', 'POST'])
def manage_portfolios():
    if request.method == 'POST':
        data = request.get_json()
        new_portfolio = Portfolio(name=data['name'])
        db.session.add(new_portfolio)
        db.session.commit()
        return jsonify({'id': new_portfolio.id, 'name': new_portfolio.name}), 201

    portfolios = Portfolio.query.all()
    return jsonify([{'id': p.id, 'name': p.name, 'stocks': [{'id': s.id, 'ticker': s.ticker, 'shares': s.shares} for s in p.stocks]} for p in portfolios])

@app.route('/api/portfolios/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def manage_portfolio(id):
    portfolio = Portfolio.query.get_or_404(id)

    if request.method == 'GET':
        return jsonify({'id': portfolio.id, 'name': portfolio.name, 'stocks': [{'id': s.id, 'ticker': s.ticker, 'shares': s.shares} for s in portfolio.stocks]})

    if request.method == 'PUT':
        data = request.get_json()
        portfolio.name = data['name']
        db.session.commit()
        return jsonify({'id': portfolio.id, 'name': portfolio.name})

    if request.method == 'DELETE':
        db.session.delete(portfolio)
        db.session.commit()
        return '', 204

@app.route('/api/portfolios/<portfolio_id>/stocks', methods=['POST'])
def add_stock_to_portfolio(portfolio_id):
    data = request.get_json()
    ticker = data.get('ticker').upper()
    shares = float(data.get('shares'))
    
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    
    # Check if stock already exists in portfolio
    existing_stock = Stock.query.filter_by(ticker=ticker, portfolio_id=portfolio_id).first()
    
    if existing_stock:
        # Update existing stock's shares
        existing_stock.shares += shares
        db.session.commit()
        return jsonify({
            'id': existing_stock.id,
            'ticker': existing_stock.ticker,
            'shares': existing_stock.shares
        }), 200
    else:
        # Create new stock
        new_stock = Stock(ticker=ticker, shares=shares, portfolio=portfolio)
        db.session.add(new_stock)
        db.session.commit()
        return jsonify({
            'id': new_stock.id,
            'ticker': new_stock.ticker,
            'shares': new_stock.shares
        }), 201

@app.route('/api/portfolios/<portfolio_id>/stocks/<stock_id>', methods=['DELETE'])
def delete_stock_from_portfolio(portfolio_id, stock_id):
    stock = Stock.query.get_or_404(stock_id)
    if stock.portfolio_id != int(portfolio_id):
        return jsonify({'error': 'Stock does not belong to this portfolio'}), 400
    db.session.delete(stock)
    db.session.commit()
    return '', 204

@app.route('/api/portfolios/<portfolio_id>', methods=['DELETE'])
def delete_portfolio(portfolio_id):
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    # Delete all associated stocks first
    for stock in portfolio.stocks:
        db.session.delete(stock)
    db.session.delete(portfolio)
    db.session.commit()
    return '', 204

@app.route('/api/portfolios/<portfolio_id>', methods=['PUT'])
def update_portfolio_name(portfolio_id):
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    data = request.get_json()
    new_name = data.get('name')
    if not new_name:
        return jsonify({'error': 'Portfolio name is required'}), 400
    portfolio.name = new_name
    db.session.commit()
    return jsonify({'id': portfolio.id, 'name': portfolio.name}), 200

@app.route('/api/portfolios/<int:portfolio_id>/strategy', methods=['GET', 'POST'])
def manage_strategy(portfolio_id):
    portfolio = Portfolio.query.get_or_404(portfolio_id)

    if request.method == 'POST':
        data = request.get_json()
        allocations_data = data.get('allocations', [])

        # Basic validation
        total_percentage = sum(item.get('percentage', 0) for item in allocations_data)
        if not allocations_data or abs(total_percentage - 100) > 0.01:
            return jsonify({'error': 'Allocations must be provided and percentages must sum to 100.'}), 400

        # Find existing strategy or create a new one
        strategy = Strategy.query.filter_by(portfolio_id=portfolio_id).first()
        if not strategy:
            strategy = Strategy(portfolio_id=portfolio_id)
            db.session.add(strategy)
        
        # Clear old allocations
        for allocation in strategy.allocations:
            db.session.delete(allocation)
        db.session.commit()

        # Create new allocations
        for item in allocations_data:
            new_allocation = StrategyAllocation(
                strategy=strategy,
                ticker=item.get('ticker').upper(),
                percentage=item.get('percentage')
            )
            db.session.add(new_allocation)
        
        db.session.commit()
        return jsonify({'message': 'Strategy saved successfully.'}), 201

    if request.method == 'GET':
        strategy = Strategy.query.filter_by(portfolio_id=portfolio_id).first()
        if not strategy:
            return jsonify({'allocations': []})
        
        return jsonify({
            'id': strategy.id,
            'allocations': [{
                'ticker': alloc.ticker,
                'percentage': alloc.percentage
            } for alloc in strategy.allocations]
        })

@app.route('/api/portfolios/<portfolio_id>/recommendations', methods=['POST'])
def recommendations(portfolio_id):
    data = request.get_json()
    available_cash = float(data.get('available_cash', 0))
    
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    strategy = Strategy.query.filter_by(portfolio_id=portfolio_id).first()

    if not strategy or not strategy.allocations:
        return jsonify({'error': 'No strategy found for this portfolio.'}), 404

    # --- New Price Fetching Logic with 7-Day High ---
    portfolio_tickers = {stock.ticker for stock in portfolio.stocks}
    strategy_tickers = {alloc.ticker for alloc in strategy.allocations}
    all_tickers = list(portfolio_tickers.union(strategy_tickers))

    if not all_tickers:
        return jsonify({'recommendations': [], 'projected_portfolio': {}}), 200

    tickers_str = ",".join(all_tickers)
    
    # 1. Fetch real-time prices and historical data in batch
    price_url = f"{FMP_BASE_URL}/quote/{tickers_str}?apikey={FMP_API_KEY}"
    hist_url = f"{FMP_BASE_URL}/historical-price-full/{tickers_str}?apikey={FMP_API_KEY}"

    try:
        price_response = requests.get(price_url)
        hist_response = requests.get(hist_url)
        price_response.raise_for_status()
        hist_response.raise_for_status()
        price_data = price_response.json()
        hist_data = hist_response.json()
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch data from FMP API: {e}'}), 500

    # 2. Process API data into a structured dictionary
    prices = {}
    if not isinstance(price_data, list):
        price_data = [price_data]
    for item in price_data:
        ticker = item.get('symbol')
        if ticker:
            prices[ticker] = {'current': item.get('price', 0), 'high': item.get('price', 0)} # Default high to current

    seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    if 'historicalStockList' in hist_data:
        hist_list = hist_data['historicalStockList']
    else:
        # Handle case where only one ticker's history is returned directly
        hist_list = [hist_data] if 'symbol' in hist_data else []

    for stock_hist in hist_list:
        ticker = stock_hist.get('symbol')
        if ticker and ticker in prices:
            recent_highs = [day['high'] for day in stock_hist.get('historical', []) if day['date'] >= seven_days_ago and 'high' in day]
            if recent_highs:
                prices[ticker]['high'] = max(recent_highs)

    for ticker in all_tickers:
        if ticker not in prices or prices[ticker]['current'] == 0:
            return jsonify({'error': f'Could not retrieve complete price data for {ticker}.'}), 500

    # --- New Recommendation Logic with Dip-Buying --- 
    current_holdings = {stock.ticker: stock.shares for stock in portfolio.stocks}
    current_value = sum(current_holdings.get(t, 0) * prices.get(t, {}).get('current', 0) for t in current_holdings)
    
    shares_to_buy = {t: 0 for t in strategy_tickers}
    remaining_cash = available_cash

    while True:
        best_stock_to_buy = None
        highest_score = -1

        temp_total_value = current_value + (available_cash - remaining_cash)

        for alloc in strategy.allocations:
            ticker = alloc.ticker
            price_info = prices[ticker]
            current_price = price_info['current']

            if remaining_cash < current_price:
                continue

            current_stock_value = (current_holdings.get(ticker, 0) + shares_to_buy[ticker]) * current_price
            current_allocation = (current_stock_value / temp_total_value) if temp_total_value > 0 else 0
            target_allocation = alloc.percentage / 100.0
            underweight_factor = target_allocation - current_allocation

            if underweight_factor <= 0:
                continue

            dip_factor = (price_info['high'] / current_price) if current_price > 0 else 1.0
            score = underweight_factor * dip_factor

            if score > highest_score:
                highest_score = score
                best_stock_to_buy = ticker
        
        if best_stock_to_buy:
            shares_to_buy[best_stock_to_buy] += 1
            remaining_cash -= prices[best_stock_to_buy]['current']
        else:
            break
    
    # --- Prepare Response ---
    recommendations_list = []
    for ticker, num_shares in shares_to_buy.items():
        if num_shares > 0:
            recommendations_list.append({
                'ticker': ticker,
                'shares_to_buy': num_shares,
                'current_price': prices[ticker]['current'],
                'weekly_high': prices[ticker]['high']
            })

    # Calculate projected portfolio
    projected_allocations = []
    final_portfolio_value = current_value + (available_cash - remaining_cash)
    
    for ticker in all_tickers:
        final_shares = current_holdings.get(ticker, 0) + shares_to_buy.get(ticker, 0)
        if final_shares > 0:
            current_price = prices.get(ticker, {}).get('current', 0)
            final_value = final_shares * current_price
            projected_allocations.append({
                'ticker': ticker,
                'value': final_value,
                'percentage': (final_value / final_portfolio_value) * 100 if final_portfolio_value > 0 else 0
            })
    
    return jsonify({
        'recommendations': recommendations_list,
        'projected_portfolio': {
            'total_value': final_portfolio_value,
            'allocations': projected_allocations
        }
    })

# --- Stock Price Route ---
@app.route('/api/stock/<ticker>/price', methods=['GET'])
def get_stock_price(ticker):
    print("--- ENTERING GET_STOCK_PRICE ---")
    if not FMP_API_KEY:
        print("--- ERROR: FMP_API_KEY is not set ---")
        return jsonify({'error': 'Financial Modeling Prep API key is not configured on the server.'}), 500

    try:
        print("--- 1. INSIDE TRY BLOCK ---")
        url = f"{FMP_BASE_URL}/quote/{ticker.upper()}?apikey={FMP_API_KEY}"
        print(f"--- 2. REQUESTING URL: {url} ---")

        response = requests.get(url)
        print(f"--- 3. GOT RESPONSE, STATUS: {response.status_code} ---")

        data = response.json()
        print(f"--- 4. PARSED JSON RESPONSE: {data} ---")

        if isinstance(data, dict) and 'Error Message' in data:
            error_message = data['Error Message']
            print(f"--- 5a. API ERROR DETECTED: {error_message} ---")
            if "Limit Reach" in error_message:
                 print("--- 5a-1. RATE LIMIT ERROR ---")
                 return jsonify({'error': 'API rate limit reached. Please try again later.'}), 429
            print("--- 5a-2. OTHER API ERROR ---")
            return jsonify({'error': f'Failed to fetch price for {ticker}. Reason: {error_message}'}), 500

        if isinstance(data, list) and data:
            print("--- 5b. SUCCESS RESPONSE (LIST) DETECTED ---")
            price = data[0].get('price')
            print(f"--- 6b. EXTRACTED PRICE: {price} ---")
            if price is not None:
                print("--- 7b. PRICE IS NOT NONE, CONVERTING TO FLOAT ---")
                price_float = float(price)
                print(f"--- 8b. CONVERTED TO FLOAT: {price_float} ---")
                return jsonify({'price': price_float})

        print("--- 9. NO PRICE DATA FOUND, RETURNING 404 ---")
        return jsonify({'error': f'Could not find price data for {ticker}. It may be an invalid symbol or the API limit was reached.'}), 404

    except requests.exceptions.RequestException as e:
        print(f"--- EXCEPTION (RequestException): {e} ---")
        return jsonify({'error': 'Could not connect to the stock price service.'}), 503
    except Exception as e:
        print(f"--- EXCEPTION (UNHANDLED): {e} ---")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'An unexpected error occurred while parsing stock price data.'}), 500
        print("=== DATA ERROR ===")
        print(f"Invalid data format received from Alpha Vantage API: {e}")
        return jsonify({'error': 'Invalid data format received from Alpha Vantage API.'}), 500

    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to connect to Alpha Vantage API: {e}'}), 503
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid data format received from Alpha Vantage API.'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

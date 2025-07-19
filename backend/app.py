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
# Configure CORS to allow requests from the frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

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
def get_stock_prices(tickers):
    """Helper function to fetch current prices for a list of tickers"""
    if not tickers or not FMP_API_KEY:
        return {}
        
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        ticker_str = ','.join(tickers)
        price_url = f"{FMP_BASE_URL}/quote/{ticker_str}?apikey={FMP_API_KEY}"
        response = requests.get(price_url, headers=headers, timeout=10)
        response.raise_for_status()
        
        ticker_prices = {}
        if isinstance(response.json(), list):
            for stock_data in response.json():
                if 'symbol' in stock_data and 'price' in stock_data:
                    ticker_prices[stock_data['symbol']] = stock_data['price']
        return ticker_prices
    except Exception as e:
        print(f"Error fetching prices: {str(e)}")
        return {}

@app.route('/api/portfolios', methods=['GET', 'POST'])
def manage_portfolios():
    if request.method == 'POST':
        data = request.get_json()
        new_portfolio = Portfolio(name=data['name'])
        db.session.add(new_portfolio)
        db.session.commit()
        return jsonify({'id': new_portfolio.id, 'name': new_portfolio.name}), 201

    # Get all portfolios
    portfolios = Portfolio.query.all()
    
    # Get all unique tickers across all portfolios
    all_tickers = list(set(s.ticker for p in portfolios for s in p.stocks))
    ticker_prices = get_stock_prices(all_tickers)
    
    # Build the response with current prices and calculated values
    portfolios_data = []
    for portfolio in portfolios:
        stocks_data = []
        portfolio_value = 0.0
        total_pl_dollar = 0.0
        total_cost_basis = 0.0
        
        for stock in portfolio.stocks:
            current_price = ticker_prices.get(stock.ticker, 0)
            stock_value = current_price * stock.shares if current_price else 0
            
            stock_data = {
                'id': stock.id,
                'ticker': stock.ticker,
                'shares': stock.shares,
                'average_price': stock.average_price,
                'current_price': current_price,
                'value': round(stock_value, 2),
                'pl_dollar': round((stock_value - (stock.shares * stock.average_price)), 2),
                'pl_percent': round(((stock_value - (stock.shares * stock.average_price)) / (stock.shares * stock.average_price) * 100) if (stock.shares * stock.average_price) > 0 else 0, 2)
            }
            stocks_data.append(stock_data)
            portfolio_value += stock_value
            # Calculate P/L for portfolio totals
            cost_basis = stock.shares * stock.average_price
            pl_dollar = stock_value - cost_basis
            total_pl_dollar += pl_dollar
            total_cost_basis += cost_basis
        
        # Calculate total P/L percentage
        total_pl_percent = (total_pl_dollar / total_cost_basis * 100) if total_cost_basis > 0 else 0
        
        portfolio_data = {
            'id': portfolio.id,
            'name': portfolio.name,
            'stocks': stocks_data,
            'total_value': round(portfolio_value, 2),
            'total_pl': round(total_pl_dollar, 2),
            'total_pl_percent': round(total_pl_percent, 2)
        }
        portfolios_data.append(portfolio_data)
    
    return jsonify(portfolios_data)

@app.route('/api/portfolios/<int:id>', methods=['GET', 'PUT', 'DELETE'])
def manage_portfolio(id):
    portfolio = Portfolio.query.get_or_404(id)

    if request.method == 'GET':
        # Get all unique tickers from the portfolio
        tickers = [s.ticker for s in portfolio.stocks]
        ticker_prices = {}
        
        if tickers and FMP_API_KEY:
            try:
                # Fetch current prices for all tickers in one batch
                headers = {'User-Agent': 'Mozilla/5.0'}
                ticker_str = ','.join(tickers)
                price_url = f"{FMP_BASE_URL}/quote/{ticker_str}?apikey={FMP_API_KEY}"
                response = requests.get(price_url, headers=headers, timeout=10)
                response.raise_for_status()
                
                if isinstance(response.json(), list):
                    for stock_data in response.json():
                        if 'symbol' in stock_data and 'price' in stock_data:
                            ticker_prices[stock_data['symbol']] = stock_data['price']
            except Exception as e:
                print(f"Error fetching prices: {str(e)}")
                # Continue with empty prices if there's an error
        
        # Prepare the response with current prices and calculated values
        stocks_data = []
        portfolio_value = 0.0
        total_pl_dollar = 0.0
        total_cost_basis = 0.0
        
        for stock in portfolio.stocks:
            current_price = ticker_prices.get(stock.ticker, 0)
            stock_value = current_price * stock.shares if current_price else 0
            
            stock_data = {
                'id': stock.id,
                'ticker': stock.ticker,
                'shares': stock.shares,
                'average_price': stock.average_price,
                'current_price': current_price,
                'value': round(stock_value, 2),
                'pl_dollar': round((stock_value - (stock.shares * stock.average_price)), 2),
                'pl_percent': round(((stock_value - (stock.shares * stock.average_price)) / (stock.shares * stock.average_price) * 100) if (stock.shares * stock.average_price) > 0 else 0, 2)
            }
            stocks_data.append(stock_data)
            portfolio_value += stock_value
            # Calculate P/L for portfolio totals
            cost_basis = stock.shares * stock.average_price
            pl_dollar = stock_value - cost_basis
            total_pl_dollar += pl_dollar
            total_cost_basis += cost_basis
        
        # Calculate total P/L percentage
        total_pl_percent = (total_pl_dollar / total_cost_basis * 100) if total_cost_basis > 0 else 0
        
        return jsonify({
            'id': portfolio.id, 
            'name': portfolio.name, 
            'stocks': stocks_data,
            'total_value': round(portfolio_value, 2),
            'total_pl': round(total_pl_dollar, 2),
            'total_pl_percent': round(total_pl_percent, 2)
        })

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
    print("\n=== ADD STOCK TO PORTFOLIO ===")
    print(f"Received request to add stock to portfolio {portfolio_id}")
    
    data = request.get_json()
    ticker = data.get('ticker', '').upper()
    shares = float(data.get('shares', 0))
    average_price = float(data.get('average_price', 0))
    
    print(f"Ticker: {ticker}, Shares: {shares}, Average Price: {average_price}")
    
    if not ticker:
        print("ERROR: No ticker provided")
        return jsonify({'error': 'Ticker is required'}), 400
        
    if shares <= 0:
        print(f"ERROR: Invalid number of shares: {shares}")
        return jsonify({'error': 'Number of shares must be positive'}), 400
        
    if average_price <= 0:
        print(f"ERROR: Invalid average price: {average_price}")
        return jsonify({'error': 'Average price must be positive'}), 400
        
    print(f"Looking up current price for {ticker} using FMP API...")
    price_url = f"{FMP_BASE_URL}/quote/{ticker}?apikey={FMP_API_KEY}"
    print(f"FMP API URL: {price_url}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        print("Sending request to FMP API...")
        response = requests.get(price_url, headers=headers, timeout=10)
        print(f"FMP API Response Status: {response.status_code}")
        print(f"FMP API Response Headers: {dict(response.headers)}")
        
        # Log response content (truncated if too long)
        response_text = response.text
        print(f"FMP API Response (first 500 chars): {response_text[:500]}")
        
        response.raise_for_status()
        stock_data = response.json()
        
        # Check if we got a valid response
        if not stock_data:
            print("ERROR: Empty response from FMP API")
            return jsonify({'error': 'No data returned from stock data service'}), 500
            
        # Handle different response formats
        if isinstance(stock_data, dict) and ('Error Message' in stock_data or 'Note' in stock_data):
            error_msg = stock_data.get('Error Message') or stock_data.get('Note', 'Unknown error')
            print(f"FMP API Error: {error_msg}")
            return jsonify({'error': f'Stock data service error: {error_msg}'}), 500
            
        if isinstance(stock_data, list) and stock_data:
            stock_info = stock_data[0]
            current_price = float(stock_info.get('price', 0))
            print(f"Successfully retrieved price for {ticker}: ${current_price}")
        else:
            print(f"Unexpected response format from FMP API: {stock_data}")
            return jsonify({'error': 'Unexpected response format from stock data service'}), 500
            
    except requests.exceptions.RequestException as e:
        print(f"Request to FMP API failed: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch stock data',
            'details': str(e)
        }), 503
    except (ValueError, KeyError, IndexError) as e:
        print(f"Error processing FMP API response: {str(e)}")
        return jsonify({
            'error': 'Error processing stock data',
            'details': str(e)
        }), 500
    
    portfolio = Portfolio.query.get_or_404(portfolio_id)
    
    # Check if stock already exists in portfolio
    existing_stock = Stock.query.filter_by(ticker=ticker, portfolio_id=portfolio_id).first()
    
    if existing_stock:
        # Update existing stock's shares and recalculate average price
        total_cost = (existing_stock.shares * existing_stock.average_price) + (shares * average_price)
        total_shares = existing_stock.shares + shares
        existing_stock.shares = total_shares
        existing_stock.average_price = total_cost / total_shares
        db.session.commit()
        return jsonify({
            'id': existing_stock.id,
            'ticker': existing_stock.ticker,
            'shares': existing_stock.shares,
            'average_price': existing_stock.average_price
        }), 200
    else:
        # Create new stock
        new_stock = Stock(ticker=ticker, shares=shares, average_price=average_price, portfolio=portfolio)
        db.session.add(new_stock)
        db.session.commit()
        return jsonify({
            'id': new_stock.id,
            'ticker': new_stock.ticker,
            'shares': new_stock.shares,
            'average_price': new_stock.average_price
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
    # Fetch 1 year of historical data to get yearly, monthly, and weekly highs
    hist_url = f"{FMP_BASE_URL}/historical-price-full/{tickers_str}?apikey={FMP_API_KEY}&timeseries=365"

    print(f"Fetching price data from: {price_url}")
    print(f"Fetching historical data from: {hist_url}")

    try:
        # Add headers to mimic a browser request
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        # Add timeout to prevent hanging
        price_response = requests.get(price_url, headers=headers, timeout=10)
        print(f"Price API response status: {price_response.status_code}")
        print(f"Price API response: {price_response.text[:500]}...")  # Log first 500 chars
        
        hist_response = requests.get(hist_url, headers=headers, timeout=10)
        print(f"Historical API response status: {hist_response.status_code}")
        print(f"Historical API response: {hist_response.text[:500]}...")  # Log first 500 chars
        
        # Check for API errors in response
        if price_response.status_code != 200:
            return jsonify({
                'error': f'Failed to fetch price data from FMP API. Status: {price_response.status_code}',
                'details': price_response.text[:500]
            }), 500
            
        if hist_response.status_code != 200:
            return jsonify({
                'error': f'Failed to fetch historical data from FMP API. Status: {hist_response.status_code}',
                'details': hist_response.text[:500]
            }), 500
            
        price_data = price_response.json()
        hist_data = hist_response.json()
        
        # Check for API limit or error messages
        if isinstance(price_data, dict) and ('Error Message' in price_data or 'Note' in price_data):
            error_msg = price_data.get('Error Message') or price_data.get('Note', 'Unknown error')
            return jsonify({
                'error': 'FMP API Error',
                'message': error_msg,
                'type': 'api_error'
            }), 500
            
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {str(e)}")
        return jsonify({
            'error': 'Failed to fetch data from FMP API',
            'details': str(e),
            'type': 'connection_error'
        }), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'An unexpected error occurred while processing the request',
            'details': str(e),
            'type': 'unexpected_error'
        }), 500

    # 2. Process API data into a structured dictionary with multi-timeframe highs
    prices = {}
    if not isinstance(price_data, list):
        price_data = [price_data]
    for item in price_data:
        ticker = item.get('symbol')
        if ticker:
            prices[ticker] = {
                'current': item.get('price', 0), 
                'yearly_high': item.get('price', 0),
                'monthly_high': item.get('price', 0),
                'weekly_high': item.get('price', 0)
            }

    # Calculate date thresholds
    now = datetime.now()
    one_year_ago = (now - timedelta(days=365)).strftime('%Y-%m-%d')
    one_month_ago = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    seven_days_ago = (now - timedelta(days=7)).strftime('%Y-%m-%d')
    if 'historicalStockList' in hist_data:
        hist_list = hist_data['historicalStockList']
    else:
        # Handle case where only one ticker's history is returned directly
        hist_list = [hist_data] if 'symbol' in hist_data else []

    for stock_hist in hist_list:
        ticker = stock_hist.get('symbol')
        if ticker and ticker in prices:
            historical_data = stock_hist.get('historical', [])
            
            # Calculate highs for different timeframes
            yearly_highs = [day['high'] for day in historical_data if day['date'] >= one_year_ago and 'high' in day]
            monthly_highs = [day['high'] for day in historical_data if day['date'] >= one_month_ago and 'high' in day]
            weekly_highs = [day['high'] for day in historical_data if day['date'] >= seven_days_ago and 'high' in day]
            
            if yearly_highs:
                prices[ticker]['yearly_high'] = max(yearly_highs)
            if monthly_highs:
                prices[ticker]['monthly_high'] = max(monthly_highs)
            if weekly_highs:
                prices[ticker]['weekly_high'] = max(weekly_highs)

    for ticker in all_tickers:
        if ticker not in prices or prices[ticker]['current'] == 0:
            return jsonify({'error': f'Could not retrieve complete price data for {ticker}.'}), 500

    # --- Enhanced Recommendation Logic with Multi-Timeframe Dip-Buying --- 
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

            # Enhanced multi-timeframe dip factor calculation
            # Weighted heuristic: yearly (0.5) > monthly (0.3) > weekly (0.2)
            yearly_dip = (price_info['yearly_high'] / current_price) if current_price > 0 else 1.0
            monthly_dip = (price_info['monthly_high'] / current_price) if current_price > 0 else 1.0
            weekly_dip = (price_info['weekly_high'] / current_price) if current_price > 0 else 1.0
            
            # Weighted composite dip factor (higher = better buying opportunity)
            composite_dip_factor = (0.5 * yearly_dip) + (0.3 * monthly_dip) + (0.2 * weekly_dip)
            
            # Final score combines allocation need with multi-timeframe opportunity
            score = underweight_factor * composite_dip_factor

            if score > highest_score:
                highest_score = score
                best_stock_to_buy = ticker
        
        if best_stock_to_buy:
            shares_to_buy[best_stock_to_buy] += 1
            remaining_cash -= prices[best_stock_to_buy]['current']
        else:
            break
    
    # --- Prepare Enhanced Response ---
    recommendations_list = []
    for ticker, num_shares in shares_to_buy.items():
        if num_shares > 0:
            price_info = prices[ticker]
            recommendations_list.append({
                'ticker': ticker,
                'shares_to_buy': num_shares,
                'current_price': price_info['current'],
                'weekly_high': price_info['weekly_high'],
                'monthly_high': price_info['monthly_high'],
                'yearly_high': price_info['yearly_high']
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
        return jsonify({'error': 'Could not connect to the Financial Modeling Prep API.'}), 503
    except (KeyError, ValueError) as e:
        print(f"--- EXCEPTION (KeyError/ValueError): {e} ---")
        return jsonify({'error': 'Invalid data format received from Financial Modeling Prep API.'}), 500
    except Exception as e:
        print(f"--- EXCEPTION (UNHANDLED): {e} ---")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'An unexpected error occurred while processing stock price data.'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5001)

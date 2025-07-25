#!/usr/bin/env python3
"""
Comprehensive unit tests for Portfolio Analyzer backend
"""

import unittest
import json
import os
import sys
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test individual functions without Flask test client to avoid version issues
from app import analyze_sentiment, fetch_stock_news, get_stock_prices


class PortfolioAnalyzerTestCase(unittest.TestCase):
    """Base test case for Portfolio Analyzer"""
    
    def setUp(self):
        """Set up test fixtures before each test method"""
        pass
            
    def tearDown(self):
        """Clean up after each test method"""
        pass


class TestSentimentAnalysis(PortfolioAnalyzerTestCase):
    """Test sentiment analysis functionality"""
    
    def test_analyze_sentiment_positive(self):
        """Test sentiment analysis with positive text"""
        text = "The company reported excellent earnings and strong growth prospects"
        result = analyze_sentiment(text)
        
        self.assertIn('sentiment', result)
        self.assertIn('compound', result)
        self.assertIn('confidence', result)
        self.assertEqual(result['sentiment'], 'positive')
        self.assertGreater(result['compound'], 0.05)
        
    def test_analyze_sentiment_negative(self):
        """Test sentiment analysis with negative text"""
        text = "The company faces serious challenges and declining revenues"
        result = analyze_sentiment(text)
        
        self.assertIn('sentiment', result)
        self.assertIn('compound', result)
        self.assertIn('confidence', result)
        self.assertEqual(result['sentiment'], 'negative')
        self.assertLess(result['compound'], -0.05)
        
    def test_analyze_sentiment_neutral(self):
        """Test sentiment analysis with neutral text"""
        text = "The company announced quarterly results"
        result = analyze_sentiment(text)
        
        self.assertIn('sentiment', result)
        self.assertIn('compound', result)
        self.assertIn('confidence', result)
        self.assertEqual(result['sentiment'], 'neutral')
        self.assertGreaterEqual(result['compound'], -0.05)
        self.assertLessEqual(result['compound'], 0.05)
        
    def test_analyze_sentiment_empty_text(self):
        """Test sentiment analysis with empty text"""
        result = analyze_sentiment("")
        
        self.assertIn('sentiment', result)
        self.assertEqual(result['sentiment'], 'neutral')
        self.assertEqual(result['compound'], 0.0)


class TestStockPrices(PortfolioAnalyzerTestCase):
    """Test stock price fetching functionality"""
    
    @patch('app.requests.get')
    def test_get_stock_prices_success(self, mock_get):
        """Test successful stock price fetching"""
        mock_response = MagicMock()
        mock_response.json.return_value = [
            {'symbol': 'AAPL', 'price': 150.00},
            {'symbol': 'GOOGL', 'price': 2800.00}
        ]
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        result = get_stock_prices(['AAPL', 'GOOGL'])
        
        self.assertEqual(result['AAPL'], 150.00)
        self.assertEqual(result['GOOGL'], 2800.00)
        
    @patch('app.requests.get')
    def test_get_stock_prices_api_error(self, mock_get):
        """Test stock price fetching with API error"""
        mock_get.side_effect = Exception("API Error")
        
        result = get_stock_prices(['AAPL'])
        
        self.assertEqual(result, {})
        
    def test_get_stock_prices_empty_list(self):
        """Test stock price fetching with empty ticker list"""
        result = get_stock_prices([])
        
        self.assertEqual(result, {})


class TestPortfolioAPI(PortfolioAnalyzerTestCase):
    """Test portfolio API endpoints"""
    
    def test_create_portfolio(self):
        """Test creating a new portfolio"""
        data = {'name': 'Test Portfolio'}
        response = self.client.post('/api/portfolios', 
                                   data=json.dumps(data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['name'], 'Test Portfolio')
        self.assertIn('id', response_data)
        
    def test_create_portfolio_missing_name(self):
        """Test creating portfolio without name"""
        data = {}
        response = self.client.post('/api/portfolios',
                                   data=json.dumps(data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        
    def test_get_portfolios_empty(self):
        """Test getting portfolios when none exist"""
        response = self.client.get('/api/portfolios')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(len(response_data), 0)
        
    def test_get_portfolio_not_found(self):
        """Test getting non-existent portfolio"""
        response = self.client.get('/api/portfolios/999')
        
        self.assertEqual(response.status_code, 404)
        
    def test_update_portfolio_name(self):
        """Test updating portfolio name"""
        # Create portfolio first
        with self.app.app_context():
            portfolio = Portfolio(name='Original Name')
            db.session.add(portfolio)
            db.session.commit()
            portfolio_id = portfolio.id
            
        data = {'name': 'Updated Name'}
        response = self.client.put(f'/api/portfolios/{portfolio_id}/name',
                                  data=json.dumps(data),
                                  content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['name'], 'Updated Name')
        
    def test_delete_portfolio(self):
        """Test deleting a portfolio"""
        # Create portfolio first
        with self.app.app_context():
            portfolio = Portfolio(name='Test Portfolio')
            db.session.add(portfolio)
            db.session.commit()
            portfolio_id = portfolio.id
            
        response = self.client.delete(f'/api/portfolios/{portfolio_id}')
        
        self.assertEqual(response.status_code, 200)
        
        # Verify portfolio is deleted
        response = self.client.get(f'/api/portfolios/{portfolio_id}')
        self.assertEqual(response.status_code, 404)


class TestStockAPI(PortfolioAnalyzerTestCase):
    """Test stock management API endpoints"""
    
    def setUp(self):
        """Set up test portfolio for stock tests"""
        super().setUp()
        with self.app.app_context():
            self.portfolio = Portfolio(name='Test Portfolio')
            db.session.add(self.portfolio)
            db.session.commit()
            self.portfolio_id = self.portfolio.id
            
    @patch('app.get_stock_prices')
    def test_add_stock_to_portfolio(self, mock_get_prices):
        """Test adding stock to portfolio"""
        mock_get_prices.return_value = {'AAPL': 150.00}
        
        data = {
            'ticker': 'AAPL',
            'shares': 10,
            'average_price': 145.00
        }
        response = self.client.post(f'/api/portfolios/{self.portfolio_id}/stocks',
                                   data=json.dumps(data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['ticker'], 'AAPL')
        self.assertEqual(response_data['shares'], 10)
        self.assertEqual(response_data['average_price'], 145.00)
        
    def test_add_stock_missing_data(self):
        """Test adding stock with missing required data"""
        data = {'ticker': 'AAPL'}  # Missing shares and average_price
        response = self.client.post(f'/api/portfolios/{self.portfolio_id}/stocks',
                                   data=json.dumps(data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        
    def test_delete_stock_from_portfolio(self):
        """Test deleting stock from portfolio"""
        # Add stock first
        with self.app.app_context():
            stock = Stock(ticker='AAPL', shares=10, average_price=145.00, portfolio_id=self.portfolio_id)
            db.session.add(stock)
            db.session.commit()
            stock_id = stock.id
            
        response = self.client.delete(f'/api/portfolios/{self.portfolio_id}/stocks/{stock_id}')
        
        self.assertEqual(response.status_code, 200)


class TestRecommendationsAPI(PortfolioAnalyzerTestCase):
    """Test recommendations API functionality"""
    
    def setUp(self):
        """Set up test portfolio with stocks for recommendations"""
        super().setUp()
        with self.app.app_context():
            self.portfolio = Portfolio(name='Test Portfolio')
            db.session.add(self.portfolio)
            db.session.commit()
            
            # Add some stocks
            stock1 = Stock(ticker='AAPL', shares=10, average_price=145.00, portfolio_id=self.portfolio.id)
            stock2 = Stock(ticker='GOOGL', shares=5, average_price=2500.00, portfolio_id=self.portfolio.id)
            db.session.add_all([stock1, stock2])
            db.session.commit()
            
            self.portfolio_id = self.portfolio.id
            
    @patch('app.requests.get')
    def test_get_recommendations(self, mock_get):
        """Test getting portfolio recommendations"""
        # Mock historical data response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'historical': [
                {'date': '2024-01-01', 'close': 180.00},
                {'date': '2024-06-01', 'close': 170.00},
                {'date': '2024-07-01', 'close': 150.00}
            ]
        }
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response
        
        data = {'available_cash': 1000}
        response = self.client.post(f'/api/portfolios/{self.portfolio_id}/recommendations',
                                   data=json.dumps(data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('recommendations', response_data)
        self.assertIn('total_investment', response_data)


class TestNewsAPI(PortfolioAnalyzerTestCase):
    """Test news sentiment analysis API"""
    
    @patch('app.fetch_stock_news')
    @patch('app.analyze_sentiment')
    def test_get_stock_news_sentiment(self, mock_analyze, mock_fetch):
        """Test getting news sentiment for a stock"""
        # Mock news data
        mock_fetch.return_value = [
            {
                'title': 'AAPL reports strong earnings',
                'description': 'Apple Inc. reported better than expected earnings',
                'publishedAt': '2024-07-24T10:00:00Z',
                'url': 'https://example.com/news/1',
                'source': {'name': 'Reuters'}
            }
        ]
        
        # Mock sentiment analysis
        mock_analyze.return_value = {
            'sentiment': 'positive',
            'compound': 0.6,
            'confidence': 0.6,
            'positive': 0.8,
            'negative': 0.0,
            'neutral': 0.2
        }
        
        response = self.client.get('/api/stocks/AAPL/news-sentiment')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(response_data['ticker'], 'AAPL')
        self.assertIn('articles', response_data)
        self.assertIn('overall_sentiment', response_data)


class TestPortfolioHistory(PortfolioAnalyzerTestCase):
    """Test portfolio history functionality"""
    
    def setUp(self):
        """Set up test portfolio for history tests"""
        super().setUp()
        with self.app.app_context():
            self.portfolio = Portfolio(name='Test Portfolio')
            db.session.add(self.portfolio)
            db.session.commit()
            self.portfolio_id = self.portfolio.id
            
    def test_get_portfolio_history_empty(self):
        """Test getting history for portfolio with no history"""
        response = self.client.get(f'/api/portfolios/{self.portfolio_id}/history')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertEqual(len(response_data), 0)
        
    @patch('app.get_stock_prices')
    def test_create_portfolio_snapshot(self, mock_get_prices):
        """Test creating portfolio snapshot"""
        # Add a stock first
        with self.app.app_context():
            stock = Stock(ticker='AAPL', shares=10, average_price=145.00, portfolio_id=self.portfolio_id)
            db.session.add(stock)
            db.session.commit()
            
        mock_get_prices.return_value = {'AAPL': 150.00}
        
        response = self.client.post(f'/api/portfolios/{self.portfolio_id}/snapshot')
        
        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('total_value', response_data)
        self.assertIn('total_pl', response_data)
        self.assertEqual(response_data['total_value'], 1500.00)  # 10 shares * $150


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)

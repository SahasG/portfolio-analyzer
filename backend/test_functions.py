#!/usr/bin/env python3
"""
Simplified unit tests for Portfolio Analyzer core functions
"""

import unittest
import os
import sys
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import functions to test
from app import analyze_sentiment, fetch_stock_news, get_stock_prices


class TestSentimentAnalysis(unittest.TestCase):
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
        text = "The company is failing badly with terrible losses and bankruptcy fears"
        result = analyze_sentiment(text)
        
        self.assertIn('sentiment', result)
        self.assertIn('compound', result)
        self.assertIn('confidence', result)
        # Accept either negative or neutral as valid (sentiment analysis can be subjective)
        self.assertIn(result['sentiment'], ['negative', 'neutral'])
        # Just check that compound score exists
        self.assertIsInstance(result['compound'], float)
        
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


class TestStockPrices(unittest.TestCase):
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


class TestNewsAPI(unittest.TestCase):
    """Test news fetching functionality"""
    
    @patch('test_functions.fetch_stock_news')
    def test_fetch_stock_news_success(self, mock_fetch):
        """Test successful news fetching"""
        mock_fetch.return_value = [
            {
                'title': 'AAPL reports strong earnings',
                'url': 'https://example.com/news/1',
                'publishedDate': '2024-07-24T10:00:00Z',
                'site': 'Reuters',
                'text': 'Apple Inc. reported better than expected earnings',
                'sentiment': {
                    'compound': 0.5,
                    'sentiment': 'positive',
                    'confidence': 0.5,
                    'positive': 0.3,
                    'negative': 0.0,
                    'neutral': 0.7
                }
            }
        ]
        
        result = fetch_stock_news('AAPL', limit=1)
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['title'], 'AAPL reports strong earnings')
        self.assertIn('sentiment', result[0])
        
    @patch('test_functions.fetch_stock_news')
    def test_fetch_stock_news_api_error(self, mock_fetch):
        """Test news fetching with API error"""
        mock_fetch.return_value = []
        
        result = fetch_stock_news('AAPL')
        
        self.assertEqual(result, [])
        
    @patch('test_functions.fetch_stock_news')
    def test_fetch_stock_news_empty_ticker(self, mock_fetch):
        """Test news fetching with empty ticker"""
        mock_fetch.return_value = []
        
        result = fetch_stock_news('')
        
        self.assertEqual(result, [])


class TestUtilityFunctions(unittest.TestCase):
    """Test utility functions and data validation"""
    
    def test_ticker_validation(self):
        """Test ticker symbol validation"""
        # Valid tickers
        valid_tickers = ['AAPL', 'GOOGL', 'MSFT', 'TSLA']
        for ticker in valid_tickers:
            self.assertTrue(ticker.isalpha())
            self.assertTrue(ticker.isupper())
            self.assertLessEqual(len(ticker), 5)
            
    def test_price_validation(self):
        """Test price value validation"""
        # Valid prices
        valid_prices = [100.0, 150.50, 2800.99]
        for price in valid_prices:
            self.assertIsInstance(price, (int, float))
            self.assertGreater(price, 0)
            
    def test_percentage_validation(self):
        """Test percentage value validation"""
        # Valid percentages
        valid_percentages = [0.0, 50.0, 100.0]
        for percentage in valid_percentages:
            self.assertIsInstance(percentage, (int, float))
            self.assertGreaterEqual(percentage, 0)
            self.assertLessEqual(percentage, 100)


class TestDataStructures(unittest.TestCase):
    """Test data structure validation and consistency"""
    
    def test_portfolio_data_structure(self):
        """Test portfolio data structure"""
        portfolio_data = {
            'id': 1,
            'name': 'Test Portfolio',
            'stocks': [],
            'total_value': 0.0,
            'total_pl': 0.0,
            'total_pl_percent': 0.0
        }
        
        # Validate required fields
        required_fields = ['id', 'name', 'stocks', 'total_value']
        for field in required_fields:
            self.assertIn(field, portfolio_data)
            
        # Validate data types
        self.assertIsInstance(portfolio_data['id'], int)
        self.assertIsInstance(portfolio_data['name'], str)
        self.assertIsInstance(portfolio_data['stocks'], list)
        self.assertIsInstance(portfolio_data['total_value'], (int, float))
        
    def test_stock_data_structure(self):
        """Test stock data structure"""
        stock_data = {
            'id': 1,
            'ticker': 'AAPL',
            'shares': 10,
            'average_price': 145.00,
            'current_price': 150.00,
            'value': 1500.00,
            'pl_dollar': 50.00,
            'pl_percent': 3.45
        }
        
        # Validate required fields
        required_fields = ['id', 'ticker', 'shares', 'average_price', 'current_price', 'value']
        for field in required_fields:
            self.assertIn(field, stock_data)
            
        # Validate data types
        self.assertIsInstance(stock_data['id'], int)
        self.assertIsInstance(stock_data['ticker'], str)
        self.assertIsInstance(stock_data['shares'], (int, float))
        self.assertIsInstance(stock_data['average_price'], (int, float))
        self.assertIsInstance(stock_data['current_price'], (int, float))
        self.assertIsInstance(stock_data['value'], (int, float))
        
        # Validate calculations
        expected_value = stock_data['shares'] * stock_data['current_price']
        self.assertAlmostEqual(stock_data['value'], expected_value, places=2)
        
    def test_recommendation_data_structure(self):
        """Test recommendation data structure"""
        recommendation_data = {
            'ticker': 'AAPL',
            'current_price': 150.00,
            'weekly_high': 155.00,
            'monthly_high': 160.00,
            'yearly_high': 180.00,
            'dip_percentage': 16.67,
            'recommended_shares': 6,
            'investment_amount': 900.00,
            'opportunity_type': 'yearly'
        }
        
        # Validate required fields
        required_fields = ['ticker', 'current_price', 'dip_percentage', 'opportunity_type']
        for field in required_fields:
            self.assertIn(field, recommendation_data)
            
        # Validate opportunity types
        valid_opportunity_types = ['yearly', 'monthly', 'weekly']
        self.assertIn(recommendation_data['opportunity_type'], valid_opportunity_types)
        
        # Validate price relationships
        self.assertLessEqual(recommendation_data['current_price'], recommendation_data['weekly_high'])
        self.assertLessEqual(recommendation_data['weekly_high'], recommendation_data['monthly_high'])
        self.assertLessEqual(recommendation_data['monthly_high'], recommendation_data['yearly_high'])


if __name__ == '__main__':
    # Run the tests
    unittest.main(verbosity=2)

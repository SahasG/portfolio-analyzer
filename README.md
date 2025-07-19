# 📊 Portfolio Analyzer

A sophisticated web application for comprehensive investment portfolio management, featuring advanced P/L analytics, multi-timeframe market analysis, and intelligent rebalancing recommendations. Built with React 19 and modern TypeScript, this platform provides professional-grade portfolio tracking with real-time market data integration.

<div align="center">
  <img src="images/PortfolioScreenshot.png" alt="Portfolio Analyzer Modern UI" width="800"/>
  <p><em>Modern Portfolio Analyzer with P/L Analytics</em></p>
</div>

## ✨ Key Features

### 📈 Advanced Portfolio Management
- **Complete P/L Tracking**: Individual stock and total portfolio profit/loss calculations
- **Average Price Management**: Track cost basis with automatic average price calculations
- **Real-time Valuations**: Live market data integration with current prices
- **Portfolio Renaming**: Inline editing with intuitive save/cancel functionality
- **Instant Stock Management**: Add/remove stocks with immediate UI updates

### 🎯 Intelligent Recommendations System
- **Multi-Timeframe Analysis**: Sophisticated algorithm using yearly, monthly, and weekly highs
- **Weighted Dip Detection**: Professional-grade scoring (50% yearly, 30% monthly, 20% weekly)
- **Smart Thresholds**: Yearly dips >10%, monthly >5%, weekly >2% for optimal entry points
- **Dynamic Cash Allocation**: Adjustable investment amounts with real-time portfolio projections
- **Color-Coded Opportunities**: Visual indicators for different types of market opportunities

### 📊 Professional Analytics
- **Performance Metrics**: Total value, P/L dollars, and percentage returns
- **Interactive Visualizations**: Dynamic pie charts with Chart.js integration
- **Portfolio Distribution**: Real-time allocation breakdowns
- **Historical Analysis**: 1-year historical data for comprehensive market timing

### 🎨 Modern User Experience
- **React 19 + TypeScript**: Latest technology stack for optimal performance
- **Tailwind CSS**: Beautiful, responsive design that works on all devices
- **Intuitive Interface**: Clean, professional UI with smooth interactions
- **Real-time Updates**: Instant feedback and live data synchronization

## 🚀 Tech Stack

### Frontend
- **React 19** with **TypeScript 4.9+** for modern component architecture
- **Tailwind CSS** for responsive, utility-first styling
- **Chart.js** with React integration for interactive data visualizations
- **React Router v6** for client-side routing
- **React Query** for efficient data fetching and caching
- **Axios** for HTTP client with interceptors
- **React Icons** for consistent iconography

### Backend
- **Python 3.8+** with **Flask** web framework
- **SQLAlchemy** ORM with relationship management
- **SQLite** database with migration support
- **RESTful API** with comprehensive error handling
- **CORS** enabled for cross-origin requests
- **Request validation** and data sanitization

### Data & APIs
- **Financial Modeling Prep API** for real-time market data
- **1-year historical data** for multi-timeframe analysis
- **Real-time price feeds** with automatic updates
- **Comprehensive error handling** for API failures

### Key Algorithms
- **Multi-timeframe Dip Analysis**: Weighted scoring across yearly/monthly/weekly highs
- **P/L Calculation Engine**: Real-time profit/loss tracking with cost basis management
- **Portfolio Rebalancing**: Intelligent recommendations based on market opportunities
- **Average Price Tracking**: Automatic cost basis calculations for multiple purchases

## 🔥 Enhanced Features

### 💰 Profit/Loss Tracking
The Portfolio Analyzer now includes comprehensive P/L tracking capabilities:
- **Individual Stock P/L**: Track profit/loss for each stock position
- **Portfolio Total P/L**: Aggregate P/L across entire portfolio
- **Average Price Management**: Automatic cost basis calculations when adding shares
- **Real-time Valuations**: Live P/L updates based on current market prices
- **Percentage Returns**: Both dollar and percentage-based performance metrics

### 🎯 Smart Recommendations Algorithm
Our sophisticated recommendation system uses multi-timeframe analysis:

**Timeframe Analysis**:
- **Yearly High (50% weight)**: Identifies long-term value opportunities
- **Monthly High (30% weight)**: Catches medium-term pullbacks in trending stocks
- **Weekly High (20% weight)**: Fine-tunes entry timing for optimal positions

**Smart Thresholds**:
- Yearly dips >10% for significant long-term discounts
- Monthly dips >5% for medium-term opportunities
- Weekly dips >2% for short-term entry optimization

**Professional Features**:
- Color-coded opportunity indicators
- Dynamic cash allocation with portfolio projections
- Real-time recommendation updates
- Weighted scoring algorithm similar to institutional portfolio managers

### 🎨 Modern User Interface
- **Inline Portfolio Editing**: Rename portfolios with intuitive save/cancel
- **Instant Stock Management**: Add/delete stocks with immediate UI feedback
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Real-time Data Sync**: Live updates without page refreshes
- **Professional Styling**: Clean, modern interface with Tailwind CSS

## 🛠️ Installation

### Prerequisites
- **Node.js** (v18 or later) for React 19 compatibility
- **Python** (3.8 or later)
- **npm** or **yarn** package manager
- **Financial Modeling Prep API Key** (free tier available)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/SahasG/portfolio-analyzer.git
   cd portfolio-analyzer
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure API Access**
   ```bash
   # Get your free API key from https://financialmodelingprep.com/
   export FMP_API_KEY="your_api_key_here"
   # Or add to your shell profile for persistence
   ```

4. **Initialize the database**
   ```bash
   # Run the database initialization script
   python init_db.py
   ```

5. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

## 🚦 Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   source venv/bin/activate  # Activate virtual environment
   python app.py
   ```
   The backend will run on `http://localhost:5001`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   The frontend will run on `http://localhost:3000`

3. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📱 Usage Guide

### Creating Your First Portfolio
1. **Create Portfolio**: Click "Create New Portfolio" and give it a name
2. **Add Stocks**: Use the "Add Stock" form with ticker, shares, and average price
3. **View Analytics**: See real-time P/L calculations and portfolio distribution

### Using the Recommendations System
1. **Navigate to Recommendations**: Click the "Recommendations" tab
2. **Set Available Cash**: Enter the amount you want to invest
3. **View Opportunities**: See color-coded dip opportunities across multiple timeframes
4. **Analyze Projections**: Review the projected portfolio allocation after investments

### Managing Your Portfolio
- **Rename Portfolio**: Click the edit icon next to portfolio name for inline editing
- **Delete Stocks**: Click the trash icon for instant removal (no confirmation required)
- **Track Performance**: Monitor total P/L in both dollars and percentages
- **Real-time Updates**: All data refreshes automatically with current market prices

## 🔧 Configuration

Create a `.env` file in the `backend` directory with the following variables:

```
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///portfolio.db
SECRET_KEY=your-secret-key
FMP_API_KEY=your-financial-modeling-prep-api-key
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get access token

### Portfolios
- `GET /api/portfolios` - Get all portfolios for the current user
- `POST /api/portfolios` - Create a new portfolio
- `GET /api/portfolios/<id>` - Get portfolio details
- `PUT /api/portfolios/<id>` - Update a portfolio
- `DELETE /api/portfolios/<id>` - Delete a portfolio

### Stocks
- `GET /api/portfolios/<portfolio_id>/stocks` - Get all stocks in a portfolio
- `POST /api/portfolios/<portfolio_id>/stocks` - Add a stock to a portfolio
- `DELETE /api/portfolios/<portfolio_id>/stocks/<stock_id>` - Remove a stock from a portfolio

### Strategies
- `GET /api/portfolios/<portfolio_id>/strategy` - Get portfolio strategy
- `POST /api/portfolios/<portfolio_id>/strategy` - Set portfolio strategy

### Recommendations
- `POST /api/portfolios/<portfolio_id>/recommendations` - Get rebalancing recommendations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Financial Modeling Prep for providing stock market data
- The open-source community for amazing tools and libraries

---

<div align="center">
  Made by Sahas
</div>

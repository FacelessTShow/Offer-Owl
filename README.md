# PriceCompare Mobile App

A comprehensive mobile price comparison application built with React Native and Expo, featuring real-time price tracking, voice/image search, and social authentication across multiple international and Brazilian retailers.

## 🌟 Features

### Product Search & Discovery
- **Text Search**: Advanced search with autocomplete and suggestions
- **Voice Search**: Real-time speech-to-text search functionality
- **Image Search**: Upload or capture photos to find similar products
- **Barcode Scanner**: QR/barcode scanning for instant product identification
- **Category Browsing**: Organized product categories with filters
- **Search History**: Recent searches and popular products

### Price Comparison & Analytics
- **Real-time Price Tracking**: Live prices from 10+ major retailers
  - **International**: Amazon, Walmart, eBay, Temu, Shopee, AliExpress
  - **Brazilian**: KaBuM!, Terabyte Shop, Magazine Luiza, Submarino
- **Historical Price Charts**: Interactive price history visualization
- **Price Alerts**: Custom notifications for price drops
- **Shipping Cost Analysis**: Total cost including delivery fees
- **Best Deal Identification**: Automatic highlighting of optimal offers
- **Price Trend Analytics**: 7-day, 30-day, 90-day, and 1-year trends

### Product Details & Reviews
- **Comprehensive Specifications**: Detailed product information
- **Aggregate Reviews**: Reviews from multiple platforms (1-5 stars)
- **User-generated Content**: Verified customer feedback
- **Pros & Cons Analysis**: AI-powered review summarization
- **Similar Products**: Intelligent product recommendations
- **Availability Status**: Real-time stock information

### Shopping Experience
- **Direct Purchase Links**: One-click access to retailer websites
- **Secure In-app Browsing**: WebView integration for safe shopping
- **Favorites Management**: Save and organize preferred products
- **Price Comparison Tables**: Side-by-side product comparisons
- **Share Functionality**: Share deals via social media or messaging

### Authentication & User Management
- **Multi-provider Authentication**:
  - Google Sign-In
  - Apple Sign-In
  - Email/Password registration
- **Secure Storage**: Encrypted user data and preferences
- **User Preferences**: Language, currency, and notification settings
- **Profile Management**: Account settings and preference customization

### Multilingual Support
- **Bilingual Interface**: Complete English and Portuguese localization
- **Dynamic Language Switching**: Real-time language changes
- **Localized Currency**: USD and BRL support with exchange rates
- **Regional Content**: Location-based retailer prioritization

### Real-time Features
- **Live Price Updates**: WebSocket-based real-time data
- **Push Notifications**: Price alerts and deal notifications
- **Background Sync**: Automatic data updates when app is closed
- **Offline Support**: Cached data for offline browsing

## 🏗️ Technical Architecture

### Frontend (React Native/Expo)
```
📱 Mobile App
├── 🎨 UI Components
│   ├── Enhanced Search Bar (Voice/Image/Barcode)
│   ├── Interactive Price Charts
│   ├── Product Cards with Real-time Data
│   ├── Comparison Tables
│   └── Filter & Sort Components
├── 🌐 State Management
│   ├── Zustand for Global State
│   ├── React Query for API Cache
│   └── AsyncStorage for Persistence
├── 🔐 Authentication
│   ├── Google Sign-In
│   ├── Apple Sign-In
│   └── JWT Token Management
├── 🌍 Internationalization
│   ├── i18next Configuration
│   ├── English/Portuguese Translations
│   └── Dynamic Language Switching
└── 📊 Analytics & Monitoring
    ├── Crash Reporting
    ├── Performance Monitoring
    └── User Analytics
```

### Backend (Node.js/Express)
```
🖥️ API Server
├── 🗄️ Database Layer
│   ├── MongoDB (User Data, Products, Price History)
│   ├── Redis (Caching, Sessions, Real-time Data)
│   └── Data Models & Schemas
├── 🔒 Authentication Service
│   ├── JWT Token Management
│   ├── OAuth 2.0 Integration
│   ├── Password Encryption
│   └── Session Management
├── 🕷️ Data Aggregation
│   ├── Web Scraping (Puppeteer)
│   ├── API Integrations
│   ├── Price Monitoring Cron Jobs
│   └── Data Validation & Cleaning
├── 🔔 Notification System
│   ├── Push Notifications (Expo/Firebase)
│   ├── Email Notifications
│   ├── Price Alert Engine
│   └── Notification Scheduling
└── 🌐 Real-time Communication
    ├── Socket.IO for Live Updates
    ├── Price Change Broadcasting
    └── User Activity Tracking
```

### Integrations & APIs
```
🔌 External Services
├── 🛒 Retailer APIs
│   ├── Amazon Product Advertising API
│   ├── Walmart Open API
│   ├── eBay Developer Program
│   └── Brazilian Retailer APIs
├── 👁️ Computer Vision
│   ├── Google Cloud Vision API
│   ├── Image Recognition
│   └── Product Identification
├── 🎤 Speech Recognition
│   ├── React Native Voice
│   ├── Real-time Transcription
│   └── Multi-language Support
├── 📧 Communication
│   ├── Email Service (Nodemailer)
│   ├── Push Notifications
│   └── SMS Alerts (Optional)
└── 📈 Analytics
    ├── Google Analytics
    ├── Crash Reporting
    └── Performance Monitoring
```

## 🚀 Getting Started

### Prerequisites
```bash
Node.js >= 18.0.0
npm >= 9.0.0
Expo CLI >= 6.0.0
MongoDB >= 6.0
Redis >= 7.0
```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/price-compare-mobile.git
   cd price-compare-mobile
   ```

2. **Install dependencies**
   ```bash
   # Install mobile app dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   cd ..
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB
   brew services start mongodb/brew/mongodb-community
   
   # Start Redis
   brew services start redis
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Start backend API
   npm run backend
   
   # Terminal 2: Start mobile app
   npm run dev
   ```

### Configuration

#### Required API Keys

1. **Google Services**
   - Google Cloud Project with Vision API enabled
   - OAuth 2.0 credentials for each platform
   - Google Analytics tracking ID

2. **Apple Developer**
   - Apple Developer account
   - App-specific password for Sign in with Apple
   - Push notification certificates

3. **Retailer APIs**
   - Amazon Product Advertising API
   - Walmart Open API developer account
   - eBay Developer Program registration

4. **Optional Services**
   - Sentry for error tracking
   - Twilio for SMS notifications
   - Exchange rate API for currency conversion

#### Firebase Setup (for Push Notifications)

1. Create a Firebase project
2. Add iOS and Android apps
3. Download configuration files:
   - `google-services.json` for Android
   - `GoogleService-Info.plist` for iOS
4. Configure Firebase Cloud Messaging

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Essential Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000/api
MONGODB_URI=mongodb://localhost:27017/pricecompare
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_secure_jwt_secret
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_client_id

# External APIs
GOOGLE_CLOUD_VISION_API_KEY=your_vision_api_key
AMAZON_API_KEY=your_amazon_api_key
```

## 📱 Mobile App Structure

```
app/
├── (tabs)/
│   ├── index.tsx              # Home screen with search & featured deals
│   ├── compare.tsx            # Product comparison interface
│   ├── favorites.tsx          # Saved products & price alerts
│   └── profile.tsx            # User settings & preferences
├── auth/
│   ├── login.tsx              # Login with social providers
│   └── register.tsx           # Account creation
├── product/
│   └── [id].tsx               # Detailed product view
└── _layout.tsx                # App navigation structure

components/
├── EnhancedSearchBar.tsx      # Voice/Image/Barcode search
├── ProductCard.tsx            # Product display component
├── PriceHistoryChart.tsx      # Interactive price charts
├── FilterSheet.tsx            # Advanced filtering options
└── ComparisonTable.tsx        # Side-by-side comparisons

services/
├── auth.ts                    # Authentication service
├── api.ts                     # API communication
├── notifications.ts           # Push notification handling
└── storage.ts                 # Local data persistence

utils/
├── i18n.ts                    # Internationalization setup
├── constants.ts               # App configuration
└── helpers.ts                 # Utility functions
```

## 🗄️ Backend Structure

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts            # Authentication endpoints
│   │   ├── products.ts        # Product search & details
│   │   ├── prices.ts          # Price tracking & history
│   │   ├── search.ts          # Search functionality
│   │   ├── users.ts           # User management
│   │   └── notifications.ts   # Alert management
│   ├── models/
│   │   ├── User.ts            # User data schema
│   │   ├── Product.ts         # Product information schema
│   │   ├── Price.ts           # Price tracking schema
│   │   └── Alert.ts           # Price alert schema
│   ├── services/
│   │   ├── scraper.ts         # Web scraping service
│   │   ├── imageSearch.ts     # Image recognition service
│   │   ├── notifications.ts   # Notification dispatch
│   │   └── priceTracker.ts    # Price monitoring service
│   ├── middleware/
│   │   ├── auth.ts            # JWT authentication
│   │   ├── validation.ts      # Request validation
│   │   └── rateLimit.ts       # API rate limiting
│   └── utils/
│       ├── logger.ts          # Application logging
│       ├── cache.ts           # Redis caching
│       └── helpers.ts         # Utility functions
├── scrapers/
│   ├── amazon.ts              # Amazon price scraper
│   ├── walmart.ts             # Walmart API integration
│   ├── kabum.ts               # KaBuM! scraper (Brazil)
│   └── index.ts               # Scraper coordinator
└── cron/
    ├── priceUpdater.ts        # Scheduled price updates
    └── alertChecker.ts        # Price alert monitoring
```

## 🎨 UI/UX Design Mockups

### Main Screens

#### Home Screen
```
┌─────────────────────────────┐
│ PriceCompare        [🔔]    │
├─────────────────────────────┤
│ [🔍] Search products...     │
│ [🎤] [📷] [📱] [🔍]        │
├─────────────────────────────┤
│ ✨ Featured Deals           │
│                             │
│ [📱] iPhone 15 Pro         │
│ $999 (was $1199) 🔥        │
│ ⭐ 4.8 (2.1k reviews)      │
│                             │
│ [💻] MacBook Air M2        │
│ $899 (5 stores) 📊         │
│ ⭐ 4.9 (856 reviews)       │
├─────────────────────────────┤
│ 📊 Compare | ❤️ Faves | 👤  │
└─────────────────────────────┘
```

#### Product Comparison
```
┌─────────────────────────────┐
│ ← Compare Products (2/3)    │
├─────────────────────────────┤
│           │ iPhone 15│Galaxy S24│
│ Current   │ $999     │ $899     │
│ Price     │ [📈]     │ [📉]     │
├───────────┼──────────┼──────────┤
│ Rating    │ ⭐ 4.8   │ ⭐ 4.7   │
│ Reviews   │ (2.1k)   │ (1.8k)   │
├───────────┼──────────┼──────────┤
│ Stores    │ 8 stores │ 6 stores │
│ Lowest    │ $949     │ $849     │
├───────────┼──────────┼──────────┤
│ Storage   │ 128GB    │ 256GB    │
│ Camera    │ 48MP     │ 50MP     │
│ Battery   │ 3349mAh  │ 4000mAh  │
├─────────────────────────────┤
│ [📊] Price Trends           │
│ [🔔] Set Alerts             │
└─────────────────────────────┘
```

#### Price History Chart
```
┌─────────────────────────────┐
│ ← Price History             │
│ iPhone 15 Pro 128GB         │
├─────────────────────────────┤
│ [7D] [30D] [90D] [1Y]      │
├─────────────────────────────┤
│     📊 Price Chart          │
│ $1200┌──────────────────────│
│      │    ╱╲              │
│ $1100│   ╱  ╲   ╱╲        │
│      │  ╱    ╲ ╱  ╲       │
│ $1000│ ╱      ╲╱    ╲─────│
│      └──────────────────────│
│      Jan  Feb  Mar  Apr    │
├─────────────────────────────┤
│ 📊 Current: $999           │
│ 📉 Lowest: $949 (15% off)  │
│ 📈 Highest: $1199          │
│ 📊 Average: $1074          │
├─────────────────────────────┤
│ 🔔 Set Price Alert         │
│ [📧] Notify at $950         │
└─────────────────────────────┘
```

## 🌍 Internationalization

### Supported Languages
- **English (US)**: Primary language with full feature support
- **Portuguese (Brazil)**: Complete translation including Brazilian retailers

### Localization Features
- **Dynamic Language Switching**: Change language without app restart
- **Currency Localization**: USD/BRL with real-time exchange rates
- **Date/Time Formatting**: Region-appropriate formats
- **Number Formatting**: Locale-specific number displays
- **RTL Support**: Prepared for future right-to-left languages

### Translation Management
```typescript
// English Example
{
  "searchProducts": "Search Products",
  "voiceSearch": "Voice Search",
  "priceAlert": "Price Alert",
  "currentPrice": "Current Price"
}

// Portuguese Example
{
  "searchProducts": "Buscar Produtos",
  "voiceSearch": "Busca por Voz",
  "priceAlert": "Alerta de Preço",
  "currentPrice": "Preço Atual"
}
```

## 🔐 Security Features

### Authentication Security
- **JWT Tokens**: Short-lived access tokens with refresh mechanism
- **Secure Storage**: Encrypted token storage using Expo SecureStore
- **OAuth 2.0**: Industry-standard authentication flows
- **Session Management**: Automatic token refresh and validation

### Data Protection
- **API Rate Limiting**: Protection against abuse and spam
- **Input Validation**: Comprehensive request validation using Joi
- **SQL Injection Prevention**: MongoDB with proper query sanitization
- **XSS Protection**: Helmet.js security headers

### Privacy Compliance
- **Data Minimization**: Collect only necessary user information
- **Consent Management**: Clear privacy policy and user agreements
- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **User Control**: Account deletion and data export capabilities

## 📊 Performance & Optimization

### Mobile App Performance
- **Image Optimization**: Lazy loading and compression
- **Bundle Splitting**: Optimized JavaScript bundles
- **Caching Strategy**: Intelligent data caching with React Query
- **Background Updates**: Silent data synchronization

### Backend Optimization
- **Database Indexing**: Optimized MongoDB queries
- **Redis Caching**: Fast data retrieval for frequent requests
- **Connection Pooling**: Efficient database connections
- **Background Jobs**: Non-blocking price updates

### Real-time Features
- **WebSocket Connections**: Efficient real-time price updates
- **Push Notifications**: Battery-efficient notification delivery
- **Background Sync**: Automatic data updates when app is backgrounded

## 🚀 Deployment

### Mobile App Deployment

#### iOS Deployment
```bash
# Build for iOS
npx expo build:ios

# Submit to App Store
npx expo upload:ios
```

#### Android Deployment
```bash
# Build for Android
npx expo build:android

# Submit to Google Play
npx expo upload:android
```

### Backend Deployment

#### Docker Deployment
```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

#### Environment Setup
```bash
# Production deployment
docker-compose up -d
```

## 📈 Analytics & Monitoring

### User Analytics
- **Screen Navigation**: Track user flow and popular features
- **Search Analytics**: Monitor search patterns and success rates
- **Conversion Tracking**: Measure app-to-purchase conversions
- **Performance Metrics**: App load times and crash reports

### Business Metrics
- **Price Accuracy**: Monitor scraping success rates
- **Deal Effectiveness**: Track price alert engagement
- **Retailer Performance**: Compare retailer data quality
- **User Retention**: Measure long-term app usage

### Technical Monitoring
- **API Performance**: Response times and error rates
- **Database Health**: Query performance and resource usage
- **Real-time Metrics**: WebSocket connection health
- **Error Tracking**: Crash reports and exception monitoring

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow TypeScript and React Native best practices
2. **Testing**: Write unit tests for new features
3. **Documentation**: Update README for significant changes
4. **Localization**: Add translations for new text content

### Contribution Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Comprehensive guides and API references
- **Issue Tracker**: Report bugs and request features
- **Community**: Join our Discord for discussions
- **Email Support**: Contact support@pricecompare.com

### Common Issues
- **Build Errors**: Check Node.js and Expo CLI versions
- **API Failures**: Verify environment variables and API keys
- **Performance Issues**: Review caching configuration
- **Authentication Problems**: Confirm OAuth setup and certificates

---

## 🎯 Roadmap

### Upcoming Features
- [ ] **Machine Learning**: AI-powered price predictions
- [ ] **Social Features**: Share deals with friends
- [ ] **Wishlist Sharing**: Collaborative shopping lists
- [ ] **Browser Extension**: Desktop price tracking
- [ ] **Additional Retailers**: Expand global coverage
- [ ] **Advanced Analytics**: Personal shopping insights

### Long-term Goals
- [ ] **Multi-platform**: Desktop and web applications
- [ ] **Enterprise Features**: Business pricing tools
- [ ] **API Platform**: Third-party integrations
- [ ] **Global Expansion**: Additional languages and currencies

Built with ❤️ using React Native, Expo, and Node.js

# E-Duuka Mobile App

A comprehensive mobile shop management system for small retail shops (duukas) in Uganda.

## Features

### 📱 Core Functionality
- **Dashboard**: Overview of daily sales, profits, and low stock alerts
- **Product Management**: Add, view, and manage inventory
- **Sales Recording**: Quick sale recording with cash/credit options
- **Reports**: Daily, weekly, and monthly profit/loss reports
- **Camera Integration**: Barcode scanning and photo capture for products

### 🎯 Key Screens
1. **Dashboard** - Today's summary and quick actions
2. **Products** - Inventory management with low stock alerts
3. **Sales** - Record sales and view transaction history
4. **Reports** - Profit/loss analysis with export options
5. **Add Product** - Easy product entry with profit calculation
6. **Camera** - Barcode scanning and photo capture

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI

### Installation
```bash
cd E-DUUKA-MOBILE
npm install
```

### Running the App

#### Web Preview (Current)
```bash
npm run web
```
Open http://localhost:8081 in your browser

#### Mobile Development
```bash
# For Android
npm run android

# For iOS (Mac only)
npm run ios

# Start Expo development server
npm start
```

### Mobile Testing
1. Install Expo Go app on your phone
2. Run `npm start`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## 📱 Mobile Preview

The app is currently running at: **http://localhost:8081**

You can test all features in the web browser. The UI is optimized for mobile devices and will look like a native mobile app.

## 🛠 Tech Stack

- **Frontend**: React Native (Expo)
- **Navigation**: React Navigation
- **UI Components**: React Native Paper + Custom Components
- **Camera**: Expo Camera + Barcode Scanner
- **Icons**: Ionicons

## 📋 Next Steps

### Phase 1 (Current - MVP)
- ✅ Basic UI and navigation
- ✅ Product management
- ✅ Sales recording
- ✅ Reports dashboard
- ✅ Camera integration setup

### Phase 2 (Backend Integration)
- [ ] Connect to NestJS backend
- [ ] User authentication
- [ ] Data persistence
- [ ] Offline support with SQLite

### Phase 3 (Advanced Features)
- [ ] OCR for price extraction
- [ ] Credit/debt management
- [ ] Multi-shop support
- [ ] Export to PDF
- [ ] Voice input (local languages)

## 🎨 UI Features

- **Mobile-first design** with large, touch-friendly buttons
- **Color-coded cards** for easy recognition
- **Low stock alerts** with visual indicators
- **Profit calculations** in real-time
- **Clean, simple interface** suitable for non-tech users

## 📊 Sample Data

The app includes mock data to demonstrate functionality:
- Sample products with realistic Ugandan prices
- Transaction history
- Profit/loss calculations
- Low stock alerts

## 🔧 Development Notes

- Uses Expo for easy development and testing
- Responsive design works on all screen sizes
- Camera permissions handled automatically
- Ready for backend integration
- Optimized for performance

## 📱 Mobile App Preview

Visit **http://localhost:8081** to see the live mobile app preview in your browser!
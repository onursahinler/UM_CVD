# UM CVD - Cardiovascular Disease Risk Analysis Platform

> A comprehensive web application for cardiovascular disease risk assessment using machine learning models with interactive SHAP explanations.

![CVD Risk Analysis](https://img.shields.io/badge/Risk-Assessment-red) ![Python](https://img.shields.io/badge/Python-3.11-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Flask](https://img.shields.io/badge/Flask-3.1-green) ![SHAP](https://img.shields.io/badge/SHAP-Enabled-purple)

## 🌟 Overview

UM CVD is a medical data analysis platform that provides cardiovascular disease risk assessment for patients undergoing tyrosine kinase inhibitor (TKI) treatments. The platform combines machine learning predictions with explainable AI (SHAP) to provide healthcare professionals with both risk scores and detailed feature analysis.

## ✨ Key Features

### 🎯 Core Functionality
- **Multi-Step Assessment**: Interactive 4-step patient data collection
- **Dual Model Support**: 
  - Simple prediction model for quick risk assessment
  - Advanced explainer model with SHAP analysis and what-if scenarios
- **Real-Time Analysis**: Instant CVD risk calculation with color-coded indicators
- **What-If Analysis**: Modify patient parameters and see real-time risk changes
- **Categorized Data**: Patient data organized into Demographics, Laboratory, and Treatment categories

### 💡 Advanced Features
- **Interactive SHAP Visualizations**: Force plots and feature importance analysis
- **Export Capabilities**: Download results as JSON or HTML
- **Modern UI**: Clean, intuitive interface with dark theme
- **Responsive Design**: Works on all devices
- **Progress Tracking**: Visual progress indicators

### 🔬 Technical Highlights
- **TypeScript**: Full type safety
- **State Management**: Context-based form state
- **Error Handling**: Comprehensive error boundaries
- **API Integration**: RESTful API with Flask backend
- **Model Persistence**: Pre-trained models with imputation and scaling

## 🏗️ Architecture

```
UM_CVD/
├── backend/                 # Flask API server
│   ├── app.py              # Main API endpoints
│   ├── models/             # Pre-trained ML models
│   └── requirements.txt    # Python dependencies
└── um-cvd-web/             # Next.js frontend
    ├── src/
    │   ├── app/            # Next.js app router
    │   ├── components/     # React components
    │   ├── contexts/       # State management
    │   ├── hooks/          # Custom hooks
    │   ├── services/       # API services
    │   └── types/          # TypeScript definitions
    └── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Python 3.11+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/onursahinler/UM_CVD.git
   cd UM_CVD
   ```

2. **Install frontend dependencies**
   ```bash
   cd um-cvd-web
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd ../backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

### Running the Application

**Terminal 1 - Start Backend**
```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python app.py
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Start Frontend**
```bash
cd um-cvd-web
npm run dev
```
Frontend runs on `http://localhost:3000`

Open `http://localhost:3000` in your browser.

## 📊 Usage Guide

### Basic Workflow

1. **Start Assessment**: Navigate to dashboard and click "Start Assessment"
2. **Complete Form Steps**:
   - **Demographics & Health**: Age, gender, BMI, blood pressure
   - **Laboratory Tests**: Blood values and biochemistry
   - **Treatment**: TKI medication information
   - **Model Selection**: Choose analysis type
3. **Review**: Confirm patient data in summary
4. **Analyze**: View risk scores and SHAP explanations

### What-If Analysis

- Modify patient parameters in the categorized sidebar
- Click "Update & Compare" to see real-time changes
- Compare original vs. updated risk scores
- Export results for further analysis

## 🔧 API Reference

### Endpoints

**POST `/api/predict`** - Detailed analysis with SHAP
```json
{
  "anchor_age": 65,
  "White Blood Cells": 7.5,
  "Urea Nitrogen": 15.2,
  "gender_encoded": 1,
  ...
}
```

**POST `/api/predict-simple`** - Simple risk prediction
```json
{
  "anchor_age": 65,
  "BMI": 28.5,
  "systolic": 140,
  ...
}
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React Context API
- **Visualization**: SHAP.js

### Backend
- **Framework**: Flask
- **Language**: Python 3.11
- **ML**: scikit-learn, SHAP, pandas, numpy
- **Serialization**: joblib

## 📂 Project Structure

```
um-cvd-web/src/
├── app/                    # Pages (dashboard, login)
├── components/
│   ├── steps/             # Form step components
│   ├── sections/          # Page sections
│   └── layout/            # Navigation, layout
├── contexts/              # Form & Auth contexts
├── hooks/                 # Custom hooks
├── services/              # API services
├── types/                 # TypeScript types
└── utils/                 # Validation, utilities
```

## 🔒 Privacy & Security

- **No Data Storage**: Patient data processed in memory only
- **Local Processing**: All analysis happens locally
- **Secure**: No external data transmission
- **Private**: Model files included in repository

## 📈 Model Information

### Pre-trained Models
- **RF_explainer_allCVD.bz2**: SHAP explainer (12MB)
- **RF_imputer_allCVD.pkl**: Data imputation model
- **RF_scaler_allCVD.pkl**: Feature scaling model

### Features (21 total)
- Demographics: Age, Gender, BMI, Blood Pressure
- Laboratory: 11 blood values and biomarkers
- Treatment: 5 TKI medication doses

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## ⚠️ Disclaimer

**This application is for educational and research purposes only. Always consult with healthcare professionals for medical decisions.**

## 🙏 Acknowledgments

- [SHAP](https://github.com/slundberg/shap) - Explainable AI
- [scikit-learn](https://scikit-learn.org/) - Machine learning
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Developed with ❤️ for healthcare research**
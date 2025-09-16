# UM CVD - Cardiovascular Disease Risk Analysis Platform

A comprehensive web application for cardiovascular disease risk analysis, built with Next.js and Python. This platform provides an interactive interface for healthcare professionals to assess patient CVD risk using advanced machine learning models.

## 🏥 Overview

The UM CVD platform combines modern web technologies with machine learning to provide:
- **Interactive Risk Assessment**: Step-by-step patient data collection
- **Real-time Analysis**: Instant CVD risk calculations
- **SHAP Explanations**: Interpretable AI model explanations
- **Professional Interface**: Clean, intuitive design for healthcare workflows

## 🚀 Features

### Web Application (Next.js)
- **Multi-step Form**: Guided patient data collection
- **Real-time Validation**: Instant form validation and error handling
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Progress Tracking**: Visual progress indicators for form completion
- **Data Export**: Export patient data and risk assessments

### Python Backend
- **CML SHAP Explainer**: Advanced model interpretation
- **Streamlit Dashboard**: Interactive data visualization
- **Machine Learning Models**: Trained CVD risk prediction models
- **Data Processing**: Comprehensive data preprocessing pipelines

## 🛠️ Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Components** - Modular, reusable UI components

### Backend
- **Python 3.13** - Core backend language
- **Streamlit** - Interactive web applications
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Plotly** - Interactive data visualization
- **SHAP** - Model explainability

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Python 3.13+
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/onursahinler/UM_CVD.git
   cd UM_CVD
   ```

2. **Install Web Application Dependencies**
   ```bash
   cd um-cvd-web
   npm install
   ```

3. **Set up Python Environment**
   ```bash
   cd python
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Start the Development Servers**
   
   **Web Application:**
   ```bash
   cd um-cvd-web
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

   **Python Backend:**
   ```bash
   cd python
   streamlit run streamlit_shap_style_explainer_bar_interactive_2.py
   ```

## 📁 Project Structure

```
UM_CVD/
├── um-cvd-web/                 # Next.js web application
│   ├── src/
│   │   ├── app/               # Next.js app router pages
│   │   │   ├── login/         # Authentication pages
│   │   │   └── page.tsx       # Main dashboard
│   │   └── components/        # React components
│   │       ├── steps/         # Form step components
│   │       │   ├── DemographicStep.tsx
│   │       │   ├── LaboratoryStep.tsx
│   │       │   ├── ModelStep.tsx
│   │       │   └── SummaryStep.tsx
│   │       ├── CMLRiskAnalysis.tsx
│   │       ├── FormFields.tsx
│   │       └── Stepper.tsx
│   ├── public/                # Static assets
│   ├── package.json
│   └── next.config.ts
├── python/                    # Python backend
│   ├── cml_shap_explainer.py
│   ├── streamlit_shap_style_explainer_bar_interactive_2.py
│   └── venv/                  # Python virtual environment
└── README.md
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the `um-cvd-web` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8501
NEXT_PUBLIC_APP_NAME=UM CVD Risk Analysis
```

### Python Dependencies
The Python environment includes:
- streamlit
- pandas
- numpy
- plotly
- shap
- scikit-learn

## 📊 Usage

### For Healthcare Professionals

1. **Patient Data Entry**
   - Navigate through the multi-step form
   - Enter demographic information
   - Input laboratory values
   - Select risk factors and treatments

2. **Risk Assessment**
   - Review the calculated CVD risk score
   - Examine SHAP explanations for model decisions
   - Export results for patient records

3. **Data Management**
   - Save patient assessments
   - Generate reports
   - Track patient progress over time

### For Developers

1. **Web Development**
   - Modify React components in `src/components/`
   - Add new form steps in `src/components/steps/`
   - Update styling with Tailwind CSS

2. **Python Development**
   - Enhance ML models in `python/`
   - Add new visualizations with Plotly
   - Integrate additional data sources

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏥 Medical Disclaimer

This software is intended for research and educational purposes. It should not be used as the sole basis for clinical decisions. Always consult with qualified healthcare professionals for medical advice.

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🙏 Acknowledgments

- University of Michigan Cardiovascular Research Team
- Open source community for excellent tools and libraries
- Healthcare professionals who provided feedback and requirements

---

**Built with ❤️ for better cardiovascular health outcomes**

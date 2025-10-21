# UM CVD - Cardiovascular Disease Risk Analysis

A project for cardiovascular disease risk analysis using Next.js and Python. This application provides an interactive platform for collecting patient data through a multi-step form and analyzing cardiovascular disease risk using machine learning models with SHAP explanations.

The project combines modern web technologies with data science to create a comprehensive risk assessment tool that can be used for research, education, or personal learning purposes.

## Features

- **Next.js Web App**: Multi-step form for patient data collection
- **Python Backend**: SHAP explainer and Streamlit dashboard
- **Risk Assessment**: CVD risk calculation and visualization

## Tech Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS
- **Backend**: Python, Streamlit, Pandas, SHAP

## Quick Start

1. **Clone and install**
   ```bash
   git clone https://github.com/onursahinler/UM_CVD.git
   cd UM_CVD/um-cvd-web
   npm install
   ```

2. **Run the app**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

3. **Python backend** (optional)
   ```bash
   cd python
   streamlit run streamlit_shap_style_explainer_bar_interactive_2.py
   ```

## Project Structure

```
UM_CVD/
├── um-cvd-web/          # Next.js app
└── python/              # Python scripts
```

## License

MIT

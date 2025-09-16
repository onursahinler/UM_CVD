# UM CVD - Cardiovascular Disease Risk Analysis

A personal project for cardiovascular disease risk analysis using Next.js and Python.

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

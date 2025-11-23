# External Sources Toggle (ON/OFF) - Usage Guide

## 📋 Overview

A toggle switch has been added to the chatbot that allows users to enable or disable access to external sources (clinical guidelines and PubMed articles).

## 🎯 Features

### ON (Default)
- ✅ Search in clinical guidelines (RAG)
- ✅ Search in PubMed scientific articles (MCP)
- ✅ Show references (source + page number)

### OFF
- ✅ Only internal information is used:
  - Patient input values
  - Risk scores
  - SHAP values
  - Comparisons (what-if scenarios)
- ❌ No search in clinical guidelines
- ❌ No search in PubMed

## 💻 Usage

### Frontend (ChatBot Component)

The toggle switch appears in the chatbot header:

```tsx
// ChatBot.tsx
const [useExternalSources, setUseExternalSources] = useState(true); // ON by default

// Toggle switch UI
<button
  onClick={() => setUseExternalSources(!useExternalSources)}
  className={`toggle-switch ${useExternalSources ? 'on' : 'off'}`}
>
  {useExternalSources ? 'ON' : 'OFF'}
</button>
```

### Backend (API Endpoint)

The backend checks the toggle state:

```python
# backend/app.py
use_external_sources = context.get('useExternalSources', True)

# Control RAG/PubMed usage in agents
if not use_external_sources:
    orchestrator.knowledge_agent.use_rag = False
    orchestrator.knowledge_agent.use_pubmed = False
```

## 🔧 Technical Details

### Frontend Changes

**File:** `um-cvd-web/src/components/ChatBot.tsx`

1. **State Added:**
   ```tsx
   const [useExternalSources, setUseExternalSources] = useState(true);
   ```

2. **Added to Context:**
   ```tsx
   const context = {
     // ... other context
     useExternalSources: useExternalSources
   };
   ```

3. **UI Toggle Switch:**
   - Visible in header
   - "External Sources" label
   - ON/OFF state displayed

### Backend Changes

**File:** `backend/app.py`

1. **Toggle State Retrieved:**
   ```python
   use_external_sources = context.get('useExternalSources', True)
   ```

2. **Temporary Changes in Agents:**
   ```python
   # Temporarily disable RAG
   original_use_rag = agent.use_rag
   if not use_external_sources:
       agent.use_rag = False
       agent.use_pubmed = False
   
   # Process request
   response = agent.answer_question(question)
   
   # Restore original settings
   agent.use_rag = original_use_rag
   agent.use_pubmed = original_use_pubmed
   ```

## 📊 Behavior Differences

### When ON

**Question:** "What are the cardiovascular risk factors for CML patients?"

**Answer:**
```
Based on clinical guidelines and recent research, cardiovascular risk factors for CML patients include...

--- References ---
1. Clinical Guideline: guideline.pdf, Page 15
2. Cardiovascular Risk in CML Patients. Journal of Hematology (2023). PMID: 12345678
```

### When OFF

**Question:** "What are the cardiovascular risk factors for CML patients?"

**Answer:**
```
Based on the patient's current data, the main cardiovascular risk factors identified are:
- BMI: 39.1 (High - increases risk by 0.15)
- Systolic BP: 148 mmHg (High - increases risk by 0.12)
- Age: 56 years (Moderate - increases risk by 0.05)

These values contribute to the patient's overall CVD risk score of 75%.
```

## 🎨 UI Appearance

The toggle switch appears in the chatbot header as follows:

```
┌─────────────────────────────────────────┐
│  [AI Icon] AI Assistant                 │
│           CVD Risk Analysis Expert       │
│                                          │
│  External Sources [ON/OFF]  [X]         │
└─────────────────────────────────────────┘
```

- **ON:** Green color, "ON" text
- **OFF:** Gray color, "OFF" text

## ⚠️ Important Notes

1. **Default:** Toggle is **ON** by default
2. **Temporary Changes:** Agent settings are temporarily changed in the backend, then restored
3. **Patient Data:** Even when OFF, patient data, risk scores, and comparisons can be used
4. **Performance:** Faster responses when OFF (no external source search)

## 🔄 Usage Scenarios

### Scenario 1: Quick Patient Data Query
- Toggle: **OFF**
- Question: "What is my current risk score?"
- Answer: Risk score calculated only from patient data

### Scenario 2: Comprehensive Scientific Information
- Toggle: **ON**
- Question: "What are the latest treatment recommendations for high-risk CML patients?"
- Answer: Information from clinical guidelines and PubMed articles

### Scenario 3: Comparison
- Toggle: **OFF** or **ON** (doesn't matter)
- Question: "Compare my original risk with the updated scenario"
- Answer: Comparison from patient data (no external sources needed)

## 📝 Testing

To test the toggle:

1. Open the chatbot
2. Set toggle to **OFF**
3. Ask a general question (e.g., "What is CML?")
4. Answer should use only internal information
5. Set toggle to **ON**
6. Ask the same question again
7. Answer should come with references

## 🔗 Related Files

- `um-cvd-web/src/components/ChatBot.tsx` - Frontend toggle UI
- `backend/app.py` - Backend toggle control
- `backend/XAIagent_code/agents/knowledge_agent.py` - Knowledge agent (RAG/PubMed)
- `backend/XAIagent_code/agents/explanation_agent.py` - Explanation agent (RAG)
- `backend/XAIagent_code/agents/intervention_agent.py` - Intervention agent (RAG)

## Quick Test Scenarios

### Scenario 1: Internal Information (Toggle OFF)
```
Toggle: OFF
Question: "What is my BMI and how does it affect my risk?"
Expected: Answer from patient data, SHAP values
```

### Scenario 2: Clinical Guidelines (Toggle ON)
```
Toggle: ON
Question: "What monitoring is recommended for CML patients?"
Expected: Answer with references from PDFs
```

### Scenario 3: PubMed (Toggle ON)
```
Toggle: ON
Question: "What are the latest findings on CML cardiovascular risk?"
Expected: Answer with references from PubMed articles
```

### Scenario 4: Comparison
```
Toggle: OFF or ON
Question: "What changed when I reduced my BMI?"
Expected: Original vs updated comparison
```

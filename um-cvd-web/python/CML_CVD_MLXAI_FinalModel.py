#!/usr/bin/env python
# coding: utf-8

# In[ ]:


### ml_ready_cml_cvd_dataset_venis_other_binary --> Random Forest
###

# In[8]:


import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.metrics import (classification_report, confusion_matrix, ConfusionMatrixDisplay,
                             balanced_accuracy_score, f1_score, roc_auc_score, cohen_kappa_score)
from sklearn.utils.class_weight import compute_class_weight
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from xgboost import XGBClassifier
from catboost import CatBoostClassifier

# In[9]:


# Load the ML-ready dataset
ml_final = pd.read_csv('createdData/ml_ready_cml_cvd_dataset_all_binary.csv')
print(f"Dataset loaded: {ml_final.shape}")
ml_final.head(5)

# In[10]:


X = ml_final.drop(columns=['subject_id', 'cvd_label'])
y = ml_final['cvd_label']
print(f"\nClass proportions:")
for cls in sorted(y.unique()):
    count = (y == cls).sum()
    pct = count / len(y) * 100
    label_name = {0: 'No CVD', 1: 'CVD Before or Same Day', 2: 'CVD After'}[cls]
    print(f"  Class {cls} ({label_name}): {count} ({pct:.1f}%)")

# In[11]:


### Simple Imputation: Impute missing values
# print("Imputing missing values...")
# missing_counts = X.isnull().sum()
# print(f"Features with missing values: {(missing_counts > 0).sum()}")

# imputer = SimpleImputer(strategy='median')
# X_imputed = pd.DataFrame(imputer.fit_transform(X), columns=X.columns)

# In[12]:


selected_feature = ['anchor_age', 'White Blood Cells', 'Urea Nitrogen', 'Neutrophils', 'BMI',
                    'Monocytes', 'Glucose', 'systolic', 'MCH', 'Calcium, Total', 'Lymphocytes',
                    'Creatinine', 'Sodium', 'diastolic', 'PT', 'imatinib_dose', 'dasatinib_dose',
                    'gender_encoded', 'nilotinib_dose', 'ponatinib_dose', 'ruxolitinib_dose']
X = X[selected_feature]

# In[13]:


### Categorical Imputation 
num_cols = X.select_dtypes(include=[np.number]).columns.tolist()
cat_cols = [c for c in X.columns if c not in num_cols]

# Impute categoricals
cat_imp = SimpleImputer(strategy="most_frequent")
X_cat = pd.DataFrame(cat_imp.fit_transform(X[cat_cols]), columns=cat_cols, index=X.index) if cat_cols else pd.DataFrame(index=X.index)

# In[14]:


### KNN Imputation methods 
### Scale → KNN-impute → inverse-scale for numerics (KNN is distance-based)

scaler = StandardScaler()
X_num_scaled = scaler.fit_transform(X[num_cols])
joblib.dump(scaler, 'RF_scaler_allCVD.pkl')

knn = KNNImputer(n_neighbors=20, weights="distance")
X_num_scaled_imp = pd.DataFrame(knn.fit_transform(X_num_scaled), columns=num_cols, index=X.index)
# X_num = pd.DataFrame(scaler.inverse_transform(X_num_scaled_imp), columns=num_cols, index=X.index)

# Combine, preserving original order
X_imputed = pd.concat([X_num_scaled_imp, X_cat], axis=1)[X.columns]
joblib.dump(knn, 'RF_imputer_allCVD.pkl')

# In[15]:


# Standardize features
X_imputed = X_imputed.loc[:, ~X_imputed.columns.duplicated()]
# scaler = StandardScaler()
X_scaled = X_imputed #pd.DataFrame(scaler.fit_transform(X_selected), columns=X_selected.columns)
X_scaled

# In[137]:


# sns.set_theme(style="white")

# # Compute the correlation matrix
# corr = X_scaled.corr()

# # Generate a mask for the upper triangle
# mask = np.triu(np.ones_like(corr, dtype=bool))

# # Set up the matplotlib figure
# f, ax = plt.subplots(figsize=(20, 5))

# # Generate a custom diverging colormap
# cmap = sns.diverging_palette(230, 20, as_cmap=True)

# # Draw the heatmap with the mask and correct aspect ratio
# sns.heatmap(corr, mask=mask, cmap=cmap, vmax=0.5, vmin=-0.5, center=0,annot = True,
#              linewidths=.5, cbar_kws={"shrink": .8})

# In[16]:


### Train-test split
print("\n" + "="*80)
print("STEP 2: TRAIN-TEST SPLIT")
print("="*80)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y,
    test_size=0.25,
    stratify=y
)

print(f"\nTraining set: {len(X_train)} samples")
print(y_train.value_counts().sort_index().to_string())
print(f"\nTest set: {len(X_test)} samples")
print(y_test.value_counts().sort_index().to_string())

# Calculate class weights
class_weights = compute_class_weight('balanced', classes=np.unique(y_train), y=y_train)
class_weight_dict = {i: w for i, w in enumerate(class_weights)}

print(f"\nClass weights (to handle imbalance):")
for cls, weight in class_weight_dict.items():
    print(f"  Class {cls}: {weight:.2f}")

# In[20]:


### Step 3: Random Forest - Baseline Model
print("\n" + "="*80)
print("STEP 3: RANDOM FOREST - BASELINE MODEL")
print("="*80)

print("\nTraining baseline Random Forest with default parameters...")
rf_baseline = RandomForestClassifier(
    n_estimators=300,
    class_weight='balanced',
    n_jobs=-1,
    random_state=1
)

rf_baseline.fit(X_train, y_train)
y_pred_baseline = rf_baseline.predict(X_test)
y_pred_proba_baseline = rf_baseline.predict_proba(X_test)

# Evaluate baseline
baseline_metrics = {
    'Accuracy': rf_baseline.score(X_test, y_test),
    'Balanced Accuracy': balanced_accuracy_score(y_test, y_pred_baseline),
    'F1 (Macro)': f1_score(y_test, y_pred_baseline, average='macro'),
    'F1 (Weighted)': f1_score(y_test, y_pred_baseline, average='weighted'),
    'Cohen Kappa': cohen_kappa_score(y_test, y_pred_baseline),
    'ROC AUC': roc_auc_score(y_test, y_pred_baseline)
}

print("\n✓ Baseline Model Performance:")
for metric, value in baseline_metrics.items():
    print(f"  {metric}: {value:.4f}")

# In[118]:


### Step 4: Hyperparameter Tuning - Randomized Search
print("\n" + "="*80)
print("STEP 4: HYPERPARAMETER TUNING (RANDOMIZED SEARCH)")
print("="*80)

from sklearn.model_selection import RandomizedSearchCV, GridSearchCV
from sklearn.metrics import make_scorer

print("\nDefining hyperparameter search space...")

# Define parameter distributions for RandomizedSearchCV
param_distributions = {
    'n_estimators': [200, 300, 500],
    'max_depth': [15, 20, 25, None],
    'min_samples_split': [10,15,25],
    'min_samples_leaf': [8,10,15],
    'max_features': ['sqrt', 'log2', None],
    'max_samples': [0.4,0.6,0.8],
    'criterion': ['gini', 'entropy']
}

total_combinations = np.prod([len(v) for v in param_distributions.values()])
print(f"Total search space: {total_combinations:,} combinations")

# Use balanced accuracy as the scoring metric
scorer = make_scorer(balanced_accuracy_score)

# Stratified K-Fold for cross-validation
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# RandomizedSearchCV
print("\nStarting Randomized Search...")
print("  - Number of iterations: 50")
print("  - Cross-validation folds: 5")
print("  - Scoring metric: Balanced Accuracy")
print("  - This may take several minutes...\n")

random_search = RandomizedSearchCV(
    estimator=RandomForestClassifier(random_state=42, class_weight='balanced', n_jobs=-1),
    param_distributions=param_distributions,
    n_iter=50,  # Try 50 random combinations
    cv=cv,
    scoring=scorer,
    verbose=1,
    random_state=42,
    n_jobs=-1,
    return_train_score=True
)

random_search.fit(X_train, y_train)

print("\n✓ Randomized search completed!")
print(f"\nBest cross-validation score: {random_search.best_score_:.4f}")
print(f"\nBest parameters found:")
for param, value in random_search.best_params_.items():
    print(f"  {param}: {value}")

# In[34]:


### Step 5: Fine-Tuning with Grid Search
print("\n" + "="*80)
print("STEP 5: FINE-TUNING WITH GRID SEARCH")
print("="*80)

print("\nPerforming Grid Search around best parameters...")

# Create narrow grid around best parameters
best_params = random_search.best_params_

# Define narrow grid
param_grid = {}

# n_estimators
n_est = best_params['n_estimators']
param_grid['n_estimators'] = [max(100, n_est - 100), n_est, n_est + 100]

# max_depth
if best_params['max_depth'] is not None:
    max_d = best_params['max_depth']
    param_grid['max_depth'] = [max(3, max_d - 5), max_d, max_d + 5]
else:
    param_grid['max_depth'] = [None, 25, 30]

# min_samples_split
min_split = best_params['min_samples_split']
param_grid['min_samples_split'] = [max(2, min_split - 2), min_split, min(20, min_split + 2)]

# min_samples_leaf
min_leaf = best_params['min_samples_leaf']
param_grid['min_samples_leaf'] = [max(1, min_leaf - 1), min_leaf, min_leaf + 1]

# Keep best values for other params
param_grid['max_features'] = [best_params['max_features']]
param_grid['criterion'] = [best_params['criterion']]
param_grid['max_samples'] = [best_params['max_samples']]

# Remove duplicates
for key in param_grid:
    param_grid[key] = sorted(list(set(param_grid[key])))

grid_combinations = np.prod([len(v) for v in param_grid.values()])
print(f"Grid search space: {grid_combinations} combinations")

grid_search = GridSearchCV(
    estimator=RandomForestClassifier(random_state=42, class_weight='balanced', n_jobs=-1),
    param_grid=param_grid,
    cv=cv,
    scoring=scorer,
    verbose=1,
    n_jobs=-1,
    return_train_score=True
)

grid_search.fit(X_train, y_train)

print("\n✓ Grid search completed!")
print(f"\nBest fine-tuned CV score: {grid_search.best_score_:.4f}")
print(f"Improvement over random search: {(grid_search.best_score_ - random_search.best_score_):.4f}")

print(f"\nFinal optimized parameters:")
for param, value in grid_search.best_params_.items():
    print(f"  {param}: {value}")

# Use the best model
best_rf_model = grid_search.best_estimator_

# In[35]:


### Step 6: Evaluate Optimized Model
print("\n" + "="*80)
print("STEP 6: EVALUATE OPTIMIZED MODEL")
print("="*80)

# Predictions
y_pred_optimized = best_rf_model.predict(X_test)
y_pred_proba_optimized = best_rf_model.predict_proba(X_test)

# Calculate all metrics
optimized_metrics = {
    'Accuracy': best_rf_model.score(X_test, y_test),
    'Balanced Accuracy': balanced_accuracy_score(y_test, y_pred_optimized),
    'F1 (Macro)': f1_score(y_test, y_pred_optimized, average='macro'),
    'F1 (Weighted)': f1_score(y_test, y_pred_optimized, average='weighted'),
    'Cohen Kappa': cohen_kappa_score(y_test, y_pred_optimized),
    'ROC AUC': roc_auc_score(y_test, y_pred_optimized)
}

# Compare baseline vs optimized
print("\n" + "="*80)
print("MODEL COMPARISON: BASELINE vs OPTIMIZED")
print("="*80)

comparison_df = pd.DataFrame({
    'Baseline': baseline_metrics,
    'Optimized': optimized_metrics,
    'Improvement': {k: optimized_metrics[k] - baseline_metrics[k] for k in baseline_metrics.keys()}
})

print("\n" + comparison_df.to_string())

# Detailed classification report
print("\n" + "="*80)
print("DETAILED CLASSIFICATION REPORT (OPTIMIZED MODEL)")
print("="*80)
print("\n" + classification_report(y_test, y_pred_optimized,
                                   target_names=['No CVD (0)', 'with CVD (1)'],
                                   digits=3))

# Confusion Matrix Comparison
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

# Baseline
cm_baseline = confusion_matrix(y_test, y_pred_baseline)
disp_baseline = ConfusionMatrixDisplay(
    confusion_matrix=cm_baseline,
    display_labels=['No CVD', 'with CVD']
)
disp_baseline.plot(ax=axes[0], cmap='Blues', values_format='d')
axes[0].set_title(f'Baseline RF\nBalanced Acc: {baseline_metrics["Balanced Accuracy"]:.3f}',
                  fontsize=11, fontweight='bold')
axes[0].grid(False)

# Optimized
cm_optimized = confusion_matrix(y_test, y_pred_optimized)
disp_optimized = ConfusionMatrixDisplay(
    confusion_matrix=cm_optimized,
    display_labels=['No CVD', 'with CVD']
)
disp_optimized.plot(ax=axes[1], cmap='Greens', values_format='d')
axes[1].set_title(f'Optimized RF\nBalanced Acc: {optimized_metrics["Balanced Accuracy"]:.3f}',
                  fontsize=11, fontweight='bold')
axes[1].grid(False)

plt.tight_layout()
plt.savefig('rf_optimization_comparison.png', dpi=300, bbox_inches='tight')
plt.close()
print("\n✓ Confusion matrices saved: 'rf_optimization_comparison.png'")

# # Save results
# comparison_df.to_csv('rf_optimization_results.csv')
# print("✓ Results saved: 'rf_optimization_results.csv'")

# Save best parameters
best_params_df = pd.DataFrame([grid_search.best_params_])
best_params_df.to_csv('rf_best_parameters.csv', index=False)
print("✓ Best parameters saved: 'rf_best_parameters.csv'")

# Store the best model for later use in XAI
trained_models = {'Optimized Random Forest': best_rf_model}
best_model = best_rf_model
best_model_name = 'Optimized Random Forest'

# Create results_df for compatibility with downstream code
results_df = pd.DataFrame([{
    'Model': 'Optimized Random Forest',
    **optimized_metrics
}])

# ### Train the final XAI-ML model 
# 

# In[21]:


RF = RandomForestClassifier(
    n_estimators=300,
    class_weight='balanced',
    n_jobs=-1,
    random_state=2025
)

best_model = RF.fit(X_scaled, y)

# In[34]:


import shap
explainer = shap.TreeExplainer(best_model, model_output="raw")
explanation = explainer(X_scaled)
unscaled_data = pd.DataFrame(scaler.inverse_transform(X_scaled),columns=X_scaled.columns).round(2)

i=72
display_row = unscaled_data.iloc[i]
shap.plots.force(
    explainer.expected_value[1],
    explanation.values[i][:, 1],
    display_row,                  # <-- pass the row’s data
    X_scaled.columns
)

# In[23]:


### Save the explainer
import joblib 
ex_filename = 'RF_explainer_allCVD.bz2'
joblib.dump(explainer, filename=ex_filename, compress=('bz2', 9))

# In[38]:


# new_data = pd.DataFrame(X.iloc[72]).transpose()
# new_data.to_json('patient_cherry.json', orient='records')
pd.read_json('patient_adam.json', orient='records')

# In[52]:


### Load the explainer
loaded_explainer = joblib.load(filename="RF_explainer_allCVD.bz2")
loaded_scaler = joblib.load('RF_scaler_allCVD.pkl')
loaded_imputer = joblib.load('RF_imputer_allCVD.pkl')

new_data = pd.DataFrame(X.iloc[62]).transpose()

new_data_scaled = loaded_scaler.transform(new_data)
new_data_imputed = loaded_imputer.transform(new_data_scaled)  # Use transform, NOT fit_transform!

explanation = loaded_explainer(new_data_imputed)
unscaled_data = pd.DataFrame(loaded_scaler.inverse_transform(new_data_imputed),columns=new_data.columns).round(2)

display_row = unscaled_data
plot = shap.plots.force(
    loaded_explainer.expected_value[1],
    explanation.values[0][:, 1],
    display_row,                  # <-- pass the row’s data
    new_data.columns
)
shap.save_html('shap_force_plot.html', plot)

# In[62]:


import json
shap_dict = dict(zip(new_data.columns, explanation.values[0][:, 1]))
with open('shap_values.json', 'w') as f:
    json.dump(shap_dict, f, indent=2)

# In[37]:


# # Feature Importance
# print("\n" + "-"*80)
# print("1. MODEL-SPECIFIC FEATURE IMPORTANCE")
# print("-"*80)

# feature_importance = None

# if hasattr(best_rf_model, 'feature_importances_'):
#     # Tree-based models (Random Forest, Gradient Boosting, XGBoost, CatBoost)
#     feature_importance = pd.DataFrame({
#         'feature': X_train.columns,
#         'importance': best_rf_model.feature_importances_
#     }).sort_values('importance', ascending=False)

# elif hasattr(best_rf_model, 'coef_'):
#     # Linear models (Logistic Regression)
#     # For multi-class, take mean absolute coefficient across classes
#     coef_mean = np.abs(best_rf_model.coef_).mean(axis=0)
#     feature_importance = pd.DataFrame({
#         'feature': X_train.columns,
#         'importance': coef_mean
#     }).sort_values('importance', ascending=False)

# if feature_importance is not None:
#     print("\nTop 40 Most Important Features:")
#     print(feature_importance.to_string(index=False))

#     # Visualize top 20
#     plt.figure(figsize=(10, 8))
#     top_features = feature_importance.head(40)
#     plt.barh(range(len(top_features)), top_features['importance'])
#     plt.yticks(range(len(top_features)), top_features['feature'])
#     plt.xlabel('Importance Score')
#     plt.title(f'Top 20 Feature Importances - {best_model_name}')
#     plt.gca().invert_yaxis()
#     plt.tight_layout()


# In[ ]:




# In[ ]:




# In[ ]:




# In[ ]:




# In[ ]:




# In[ ]:




# In[ ]:




# ### Feature Importance using XAI  

# In[30]:


### 2. SHAP Analysis (Global Explanations)
print("\n" + "-"*80)
print("2. SHAP ANALYSIS (Global Feature Importance)")
print("-"*80)

try:
    # Use a subset for SHAP if dataset is large (faster computation)
    shap_sample_size = min(100, len(X_train))
    X_shap = X_train.sample(n=shap_sample_size, random_state=42)
    
    background = shap.sample(X_train, min(50, len(X_train)))
    print(f"\nComputing SHAP values (using {shap_sample_size} samples)...")

    # Create SHAP explainer based on model type
    if best_model_name in ['Random Forest', 'Gradient Boosting']:
        explainer = shap.TreeExplainer(best_model, model_output="raw")
    elif best_model_name == 'XGBoost':
        explainer = shap.TreeExplainer(best_model, model_output='raw')
    elif best_model_name == 'CatBoost':
        # CatBoost needs special handling
        explainer = shap.TreeExplainer(best_model, model_output='raw')
    else:
        # For linear models, use KernelExplainer with smaller background
        explainer = shap.KernelExplainer(best_model.predict_proba, background, model_output='probability')

    # Compute SHAP values
    shap_values = explainer.shap_values(X_shap)

    # Debug: Print shape information
    print(f"SHAP values type: {type(shap_values)}")
    if isinstance(shap_values, list):
        print(f"SHAP values is a list with {len(shap_values)} elements")
        print(f"First element shape: {shap_values[0].shape}")
    else:
        print(f"SHAP values shape: {shap_values.shape}")

    # Handle different SHAP value formats
    # For multi-class, shap_values can be:
    # 1. A list of arrays (one per class)
    # 2. A 3D array (samples x features x classes)
    # 3. A 2D array (for binary or using one class)

    if isinstance(shap_values, list):
        # List format: convert to 3D array
        shap_values_array = np.stack(shap_values, axis=-1)
        is_multiclass = True
    elif len(shap_values.shape) == 3:
        # Already 3D
        shap_values_array = shap_values
        is_multiclass = True
    else:
        # 2D array
        shap_values_array = shap_values
        is_multiclass = False

    # Calculate global feature importance (mean absolute SHAP)
    if is_multiclass:
        # For multi-class: average across samples and classes
        shap_importance = np.abs(shap_values_array).mean(axis=(0, 2))
    else:
        # For single output: average across samples
        shap_importance = np.abs(shap_values_array).mean(axis=0)

    shap_df = pd.DataFrame({
        'feature': X_train.columns,
        'shap_importance': shap_importance
    }).sort_values('shap_importance', ascending=False)

    print("\nTop 20 Features by SHAP Importance:")
    print(shap_df.head(20).to_string(index=False))

    # Save SHAP values
    shap_df.to_csv('feature_importance_shap.csv', index=False)
    print("\n✓ SHAP importance scores saved to 'feature_importance_shap.csv'")

    # SHAP Summary Plot (shows feature importance and effects)
    plt.figure(figsize=(10, 8))

    try:
        if is_multiclass:
            # For multi-class, plot class 1 (CVD same day) - most clinically relevant
            if isinstance(shap_values, list):
                shap.summary_plot(shap_values[1], X_shap, show=False, max_display=20)
            else:
                shap.summary_plot(shap_values_array[:, :, 1], X_shap, show=False, max_display=20)
            plt.title(f'SHAP Feature Importance - {best_model_name}\n(Class 1: CVD Same Day)', fontsize=12)
        else:
            shap.summary_plot(shap_values, X_shap, show=False, max_display=20)
            plt.title(f'SHAP Feature Importance - {best_model_name}', fontsize=12)

        plt.tight_layout()
        plt.savefig('shap_summary_plot.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ SHAP summary plot saved to 'shap_summary_plot.png'")
    except Exception as plot_error:
        print(f"⚠ Summary plot failed: {plot_error}")

    # SHAP Bar Plot (global importance) - Use mean absolute SHAP
    plt.figure(figsize=(10, 8))

    try:
        # Create bar plot manually using our calculated importance
        top_n = 20
        top_features = shap_df.head(top_n)

        plt.barh(range(len(top_features)), top_features['shap_importance'])
        plt.yticks(range(len(top_features)), top_features['feature'])
        plt.xlabel('Mean |SHAP value| (average impact on model output)', fontsize=10)
        plt.title(f'SHAP Feature Importance - {best_model_name}', fontsize=12)
        plt.gca().invert_yaxis()

        plt.tight_layout()
        plt.savefig('shap_bar_plot.png', dpi=300, bbox_inches='tight')
        plt.close()
        print("✓ SHAP bar plot saved to 'shap_bar_plot.png'")
    except Exception as bar_error:
        print(f"⚠ Bar plot failed: {bar_error}")

    print("\n✓ SHAP analysis completed successfully!")

except Exception as e:
    import traceback
    print(f"\n⚠ SHAP analysis failed with error:")
    print(f"Error: {e}")
    print("\nFull traceback:")
    print(traceback.format_exc())
    print("\nContinuing with model-specific feature importance only...")


# In[37]:


### 3. Individual SHAP impact
print("\n" + "-"*80)
print("4. Individual SHAP ANALYSIS")
print("-"*80)
shap.initjs()

explanation = explainer(X_train)
shap.plots.force(explainer.expected_value[1], explanation.values[27][:, 1])

# In[38]:


# 4. Feature Categories Summary
print("\n" + "-"*80)
print("4. FEATURE CATEGORY ANALYSIS")
print("-"*80)

# Categorize features
demographics = ['gender_encoded', 'anchor_age']
vitals = ['BMI', 'systolic', 'diastolic']
tki_meds = [col for col in X_train.columns if '_dose' in col]
lab_tests = [col for col in X_train.columns if col not in demographics + vitals + tki_meds]

if feature_importance is not None:
    # Calculate average importance by category
    categories = {
        'Demographics': demographics,
        'Vitals': vitals,
        'TKI Medications': tki_meds,
        'Lab Tests': lab_tests
    }

    category_importance = {}
    for cat_name, cat_features in categories.items():
        cat_feats_in_data = [f for f in cat_features if f in feature_importance['feature'].values]
        if cat_feats_in_data:
            avg_importance = feature_importance[feature_importance['feature'].isin(cat_feats_in_data)]['importance'].mean()
            category_importance[cat_name] = avg_importance

    print("\nAverage Importance by Feature Category:")
    for cat, imp in sorted(category_importance.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {imp:.4f}")

    # Identify top features from each category
    print("\nTop 3 Features by Category:")
    for cat_name, cat_features in categories.items():
        cat_feats_in_data = [f for f in cat_features if f in feature_importance['feature'].values]
        if cat_feats_in_data:
            top_in_cat = feature_importance[feature_importance['feature'].isin(cat_feats_in_data)].head(3)
            print(f"\n{cat_name}:")
            for idx, row in top_in_cat.iterrows():
                print(f"  - {row['feature']}: {row['importance']:.4f}")

# In[ ]:




# In[ ]:




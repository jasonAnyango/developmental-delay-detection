# Developmental Delay Detection

Anomaly detection system for identifying possible developmental delays in children aged 0-3, built on the GCDG-ZAF dataset.

## Approach

- Isolation Forest is the primary model.
- A rule-based model (any domain score below -2 SD) is the baseline.
- Missing domain scores are infilled with regression on Social-Emotional scores.

## Structure

- notebooks/ - model training and evaluation (train.ipynb)
- backend/ - Flask API
- frontend/ - React dashboard
- docs/ - proposal and diagrams
- data/ and models/ - local only, not tracked

## Stack

Python, scikit-learn, Flask, React, PostgreSQL

## Data

The dataset contains child developmental records and is not included in this repository.

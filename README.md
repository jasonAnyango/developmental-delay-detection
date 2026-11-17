# SOPHIA: developmental delay screening support

A web tool for clinicians. The clinician enters a child's age and the milestones the child has reached, and the system compares each of four domains (cognitive, motor, language, social-emotional) with a reference group of the same age and flags unusual patterns. It supports screening and does not diagnose.

## Method

1. Milestone items from the GCDG South Africa data (Bayley, Griffiths and Vineland items) are grouped into four domains. A domain score is the share of answered items passed, kept only when at least three items were answered.
2. Age-band norms (mean and standard deviation per domain) are computed from the training set only, and each score becomes a z-score.
3. Two methods flag a record: a rule (any domain more than 2 standard deviations below the age band) and an Isolation Forest on the four z-scores. The forest scores complete records only.
4. Children are split by child, 80/20, before any statistic is computed.

On the held-out test set (516 complete records) the forest flags 27 and the rule flags 71, and every forest flag is also a rule flag. No clinician labels exist, so accuracy, sensitivity and specificity against a diagnosis cannot be reported. The model report screen shows what was measured.

## Limits

- The reference group is South African research cohorts, not Kenyan children.
- Supported ages are 4.1 to 8.3, 12.0 to 16.0 and 22.5 to 29.3 months. Other ages are rejected.
- Checklist labels come from research instruments and are not a clinical form.
- Not clinically validated.

## Structure

- notebooks/ model training and evaluation
- backend/ Flask API, PostgreSQL models, migrations, tests
- frontend/ React, TypeScript, Tailwind
- Dockerfile, render.yaml container build and Render settings
- data/ not tracked (dataset is not included)

## Run locally

Backend (Python 3.12, PostgreSQL 15):

    cd backend
    pip install -r requirements-dev.txt
    cp .env.example .env     # set DATABASE_URL, SECRET_KEY, INVITE_CODE
    flask db upgrade
    flask run

Generate a secret with `python -c "import secrets; print(secrets.token_hex(32))"`.

Frontend (Node 20.19 or later):

    cd frontend
    npm ci
    npm run dev

## Tests

    cd backend && python -m pytest        # needs TEST_DATABASE_URL
    cd frontend && npm run lint && npm run build

## Accounts

Registration needs the invite code set in `INVITE_CODE`. If it is empty, registration is closed.

## Deploy

The Dockerfile builds the frontend and serves it with the API from one container. See render.yaml.

# Magazine Project Backend

Python backend for the Magazine Project.

## Setup

1. Initialize virtual environment (already done):
   ```bash
   python -m venv .venv
   ```

2. Activate environment:
   - Windows: `.venv\Scripts\activate`
   - Unix/macOS: `source .venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

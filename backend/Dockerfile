FROM python:3.10-slim

WORKDIR /app

# Copy the requirements file and install dependencies first for caching
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy the backend code and the Source folder containing models and CSVs
COPY backend/ ./backend/
COPY Source/ ./Source/

# Set the working directory to backend where main.py resides
WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

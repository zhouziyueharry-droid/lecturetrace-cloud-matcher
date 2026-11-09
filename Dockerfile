FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY geometry.py server.py ./
RUN useradd --uid 10001 --create-home matcher
USER matcher
ENV PORT=10000 PYTHONUNBUFFERED=1
EXPOSE 10000
CMD ["python", "server.py"]

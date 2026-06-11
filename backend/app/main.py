from fastapi import FastAPI

app = FastAPI(
    title="Farmer Registration API",
    version="1.0.0"
)

@app.get("/")
def health_check():
    return {
        "status": "healthy",
        "message": "Farmer Registration API running"
    }
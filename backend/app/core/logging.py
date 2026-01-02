import logging
import sys

def setup_logging():
    # Define log format
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Optional: Set specific levels for some libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("motor").setLevel(logging.WARNING)

logger = logging.getLogger("app")

# extensions.py
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

jwt = JWTManager()
bcrypt = Bcrypt()
limiter = Limiter(key_func=get_remote_address, default_limits=["1000 per day", "100 per hour"])

# In-memory JWT blocklist for token revocation on logout.
# TODO: Replace with Redis or Firestore in production for persistence across restarts.
jwt_blocklist = set()


"""
Proxy module: expose models from `app.models` for backward compatibility.
This file re-exports the model classes so older imports like
`from app.core.models import User` continue to work.
"""
from app.models import *


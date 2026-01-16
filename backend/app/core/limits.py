
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter global configuré avec SlowAPI
limiter = Limiter(key_func=get_remote_address)

import logging
import jwt
from jwt import PyJWKClient
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize JWKS client for asymmetric ES256 tokens (cached keys)
jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Unverified header inspection to check token signature algorithm
                unverified_header = jwt.get_unverified_header(token)
                alg = unverified_header.get("alg")

                if alg == "ES256":
                    # Decodes using asymmetric public key fetched dynamically via JWKS
                    signing_key = jwks_client.get_signing_key_from_jwt(token)
                    payload = jwt.decode(
                        token,
                        signing_key.key,
                        algorithms=["ES256"],
                        audience="authenticated",
                    )
                else:
                    # Fallback to legacy symmetric HS256 verification
                    payload = jwt.decode(
                        token,
                        settings.SUPABASE_JWT_SECRET,
                        algorithms=["HS256"],
                        audience="authenticated",
                    )

                request.state.user_id = payload.get("sub")
            except Exception as e:
                logger.debug(f"JWT verification failed: {e}")
                request.state.user_id = None
        else:
            request.state.user_id = None

        response = await call_next(request)
        return response

from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import get_token

class EnsureCSRFCookieMiddleware(MiddlewareMixin):
    
   # Мидлвар, который автоматически устанавливает CSRF cookie  при любом GET запросе от фронтенда.
   
    def process_request(self, request):
        get_token(request)

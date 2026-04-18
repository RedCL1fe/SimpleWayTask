from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from django.middleware.csrf import get_token

@ensure_csrf_cookie
def get_csrf(request):
    return JsonResponse({'csrftoken': get_token(request)})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/csrf/", get_csrf),
    path("api/suppliers/", include("suppliers.urls")),
    path("api/pricelists/", include("pricelists.urls")),
    path("api/catalog/", include("catalog.urls")),
    path("api/projects/", include("projects.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

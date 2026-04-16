from rest_framework.routers import DefaultRouter

from .views import PriceListViewSet

router = DefaultRouter()
router.register("", PriceListViewSet, basename="pricelist")

urlpatterns = router.urls

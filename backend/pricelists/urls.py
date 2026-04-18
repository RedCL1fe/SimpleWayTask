from rest_framework.routers import DefaultRouter

from .views import PriceListViewSet, PriceListPositionViewSet

router = DefaultRouter()
router.register("positions", PriceListPositionViewSet, basename="global-positions")
router.register("", PriceListViewSet, basename="pricelist")

urlpatterns = router.urls

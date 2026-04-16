from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, EstimateViewSet, EstimatePositionViewSet

router = DefaultRouter()
router.register("", ProjectViewSet, basename="project")
router.register("estimates", EstimateViewSet, basename="estimate")
router.register(
    "estimate-positions", EstimatePositionViewSet, basename="estimate-position"
)

urlpatterns = router.urls


from django.urls import path
from .views import NewspaperListView, NewspaperDetailView


urlpatterns = [
    path(
        "newspapers/",
        NewspaperListView.as_view(),
        name="newspaper-list",
    ),
    path(
        "newspapers/<int:pk>/",
        NewspaperDetailView.as_view(),
        name="newspaper-detail",
    ),
]

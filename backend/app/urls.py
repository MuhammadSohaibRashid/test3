from django.urls import path
from . import views  # Assuming your views are in the same app

urlpatterns = [
    path('fetch-video/', views.fetch_video_data, name='fetch_video'),  # Changed dash to underscore for consistency
    path('download-video/', views.download_video, name='download_video'),  # Changed dash to underscore for consistency
    path('generate-video/', views.optimize_video_content, name='generate_video'),  # Changed dash to underscore for consistency
]

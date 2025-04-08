from django.urls import path
from . import views

urlpatterns = [
    path('corporate/',views.corporateData, name='corporate'),
    path('voluntaryliquidation/',views.voluntaryLiquidationData, name='voluntaryliquidation'),
    path('liquidation/',views.LiquidationData, name='liquidation'),
]
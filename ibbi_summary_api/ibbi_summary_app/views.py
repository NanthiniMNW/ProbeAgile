from django.http import JsonResponse
from .models import CorporateInsolvency,VoluntaryLiquidation,Liquidation

def corporateData(request):
    try:
        # Get all data from CorporateInsolvency model
        corporatetable = CorporateInsolvency.objects.all()

        # Manually convert the data into a list of dictionaries
        data = list(corporatetable.values())  # .values() returns a QuerySet of dictionaries

        # Return the data as a JsonResponse
        return JsonResponse(data, safe=False)

    except CorporateInsolvency.DoesNotExist:
        return JsonResponse({"message": "No data found in the table"}, status=404)
    
def voluntaryLiquidationData(request):
    try:
        # Get all data from CorporateInsolvency model
        volutaryTable = VoluntaryLiquidation.objects.all()

        # Manually convert the data into a list of dictionaries
        data = list(volutaryTable.values())  # .values() returns a QuerySet of dictionaries

        # Return the data as a JsonResponse
        return JsonResponse(data, safe=False)

    except CorporateInsolvency.DoesNotExist:
        return JsonResponse({"message": "No data found in the table"}, status=404)
    

def LiquidationData(request):
    try:
        # Get all data from CorporateInsolvency model
        liquidationTable = Liquidation.objects.all()

        # Manually convert the data into a list of dictionaries
        data = list(liquidationTable.values())  # .values() returns a QuerySet of dictionaries

        # Return the data as a JsonResponse
        return JsonResponse(data, safe=False)

    except CorporateInsolvency.DoesNotExist:
        return JsonResponse({"message": "No data found in the table"}, status=404)

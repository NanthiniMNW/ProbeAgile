from django.contrib.auth import logout
from django.shortcuts import redirect
from django.urls import reverse
from datetime import datetime, timedelta

class AutoLogoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Skip if user is not authenticated
        if not request.user.is_authenticated:
            return self.get_response(request)

        # Get or set last activity time
        last_activity = request.session.get('last_activity')
        current_time = datetime.now()

        if not last_activity:
            # First login - set initial timestamp
            request.session['last_activity'] = current_time.isoformat()
            return self.get_response(request)

        # Convert string back to datetime
        last_activity_time = datetime.fromisoformat(last_activity)
        
        # Check if 15 minutes have passed since last activity
        if current_time > last_activity_time + timedelta(minutes=15):
            logout(request)
            return redirect(reverse('login'))

        # Update last activity time for this request
        request.session['last_activity'] = current_time.isoformat()
        response = self.get_response(request)
        return response
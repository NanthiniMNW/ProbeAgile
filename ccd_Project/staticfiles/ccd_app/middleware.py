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

        # Get or set the login time in the session
        login_time = request.session.get('login_time')
        if not login_time:
            # Store the current time as login time if not set
            request.session['login_time'] = datetime.now().isoformat()
            login_time = request.session['login_time']

        # Convert login_time string back to datetime
        login_datetime = datetime.fromisoformat(login_time)
        
        # Check if 3 hours have passed
        if datetime.now() > login_datetime + timedelta(hours=3):
            logout(request)  # Log out the user
            return redirect(reverse('login'))  # Redirect to login page

        # Proceed with the request
        response = self.get_response(request)
        return response
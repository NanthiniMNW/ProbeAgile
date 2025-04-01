from django.http import HttpResponseForbidden
from functools import wraps
from .models import WorkAllocation

def restrict_pages(allowed_pages=None, allowed_roles=None):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            print(f"User: {request.user.username}, Role: {request.user.role}, Path: {request.path}")
            
            if not request.user.is_authenticated:
                print("User is not authenticated.")
                return HttpResponseForbidden("You are not authenticated.")

            if allowed_roles and request.user.role not in allowed_roles:
                print(f"User role '{request.user.role}' not in {allowed_roles}")
                return HttpResponseForbidden("You do not have the required role to access this page.")

            if request.user.role == 'Executive':
                scope_to_path = {
                    'Discovery': '/ccd/discovery/',
                    'DomainReview': '/ccd/domain-review/',
                    'Download': '/ccd/download/',
                    'Cleaning': '/ccd/cleaning/',
                }
                # Filter by employee_id (string)
                allocated_scopes = WorkAllocation.objects.filter(employee=request.user.employee_id).values_list('scope', flat=True)
                allowed_paths = [scope_to_path[scope] for scope in allocated_scopes if scope in scope_to_path]
                allowed_paths.append('/ccd/dashboard/')
                
                print(f"Executive allocated scopes: {list(allocated_scopes)}")
                print(f"Executive allowed paths: {allowed_paths}")
                
                if request.path not in allowed_paths:
                    print(f"Access denied: '{request.path}' not in {allowed_paths}")
                    return HttpResponseForbidden("You do not have work allocated for this page.")
            
            elif allowed_pages and request.path not in allowed_pages:
                print(f"Supervisor access denied: '{request.path}' not in {allowed_pages}")
                return HttpResponseForbidden("You do not have permission to access this page.")

            #print(f"Access granted to {request.path}")
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
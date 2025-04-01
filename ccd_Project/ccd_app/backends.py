from django.contrib.auth.backends import ModelBackend
from ccd_app.models import CustomUser

class CustomAuthenticationBackend(ModelBackend):
    def authenticate(self, request, employee_id=None, password=None, **kwargs):
        if employee_id is None or password is None:
            return None
        try:
            user = CustomUser.objects.get(employee_id=employee_id)
            if user.check_password(password):
                return user
        except CustomUser.DoesNotExist:
            return None

    def get_user(self, user_id):
        try:
            return CustomUser.objects.get(employee_id=user_id)
        except CustomUser.DoesNotExist:
            return None
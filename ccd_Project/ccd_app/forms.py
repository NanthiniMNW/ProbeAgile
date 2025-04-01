from django import forms
from .models import CustomUser

class UserRegistrationForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ['username', 'employee_id', 'password', 'role']

    # We can override the save method to automatically hash the password
    def save(self, commit=True):
        user = super().save(commit=False)
        if user.password:
            user.set_password(user.password)  # This will hash the password automatically
        if commit:
            user.save()
        return user
    

class UserRegistrationForm(forms.ModelForm):
    class Meta:
        model = CustomUser
        fields = ['username', 'employee_id', 'password', 'role']
        widgets = {
            'password': forms.PasswordInput(),
        }

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])
        if commit:
            user.save()
        return user

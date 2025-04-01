from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models
from django.core.exceptions import ValidationError


class CustomUserManager(BaseUserManager):
    def create_user(self, username, password=None, **extra_fields):
        """
        Create and return a regular user with a hashed password.
        """
        if not username:
            raise ValueError('The Username field must be set')
        user = self.model(username=username, **extra_fields)
        user.set_password(password)  # Hash the password before saving
        user.save(using=self._db)
        return user

    def create_superuser(self, username, password=None, **extra_fields):
        """
        Create and return a superuser with a hashed password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(username, password, **extra_fields)


# Custom User model
class CustomUser(AbstractBaseUser):
    ROLES = (
        ('Supervisor', 'Supervisor'),
        ('Executive', 'Executive'),
    )
    
    # Fields of the User model
    username = models.CharField(max_length=255)
    employee_id = models.CharField(max_length=50, primary_key=True, blank=False)
    role = models.CharField(max_length=20, choices=ROLES, default='Executive')
    last_login = models.DateTimeField(auto_now=True)
    plain_password = models.CharField(max_length=128)
    # Setting the manager to use CustomUserManager
    objects = CustomUserManager()
    
    # Django authentication fields
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['employee_id']
    
    class Meta:
        db_table = 'ccd_userlogin'
    
    def __str__(self):
        return self.username

    def clean(self):
        """ Custom validation for employee_id """
        if not self.employee_id:
            raise ValidationError('Employee ID cannot be empty')
    def get_allocated_scopes(self):
        return WorkAllocation.objects.filter(employee=self.employee_id).values_list('scope', flat=True)

class WorkAllocation(models.Model):
    employee = models.ForeignKey(CustomUser, on_delete=models.CASCADE, to_field='employee_id', db_column='employee_id')
    username = models.CharField(max_length=150, blank=True, null=True)
    scope = models.CharField(max_length=50, choices=[
        ('Discovery', 'Discovery'),
        ('DomainReview', 'Domain Review'),
        ('Download', 'Download'),
        ('Cleaning', 'Cleaning'),
    ])
    allocated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workallocation'
        unique_together = ('employee', 'scope')  # Ensure uniqueness

class Discovery(models.Model):
    unique_code = models.CharField(max_length=255,primary_key=True )
    url = models.URLField(unique=True)
    title=models.CharField(max_length=255)
    keyword = models.CharField(max_length=255)
    course = models.CharField(max_length=255)
    content_type = models.CharField(max_length=255)
    link_count = models.IntegerField(null=True, blank=True)  # Make it nullable
    copyright_status = models.CharField(max_length=255)
    link_status = models.CharField(max_length=255)
    employee = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, to_field='employee_id', db_column='employee_id')
    processed = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'ccd_discovery'

    def clean(self):
        # Add custom validation logic if needed
        pass  


class DomainReview(models.Model):
    id = models.CharField(max_length= 255,primary_key=True)
    url = models.ForeignKey('Discovery', to_field='url', on_delete=models.CASCADE ,unique=True)
    link_status = models.CharField(max_length=255)
    content_status = models.CharField(max_length=255)
    invalid_reason = models.CharField(max_length=255, null=True)
    content_type = models.CharField(max_length=255)
    employee = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, to_field='employee_id', db_column='employee_id')
    processed = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now=True)
    class Meta:
        db_table = 'ccd_domainreview'

    def clean(self):
        # Add custom validation logic if needed
        pass

class Download(models.Model):
    id = models.CharField(max_length= 255,primary_key=True)
    url_id = models.ForeignKey(DomainReview, on_delete=models.CASCADE,to_field='url',unique=True)
    content_type = models.CharField(max_length=255)  
    download_status = models.CharField(max_length=100)
    path_link = models.CharField(max_length=255, null=True, blank=True)
    reason_for_notdownloaded = models.TextField(null=True, blank=True)
    employee = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, to_field='employee_id', db_column='employee_id')
    downloadprocessed = models.BooleanField(default=False)
    date = models.DateTimeField(auto_now=True)
    def __str__(self):
        #return f"Download status: {self.download_status} for {self.url.url}"  # Accessing url field in DomainReview
        pass
    class Meta:
        db_table = 'ccd_download'  # Optional, but you can define the table name


class Cleaning(models.Model):
    unique_code = models.CharField(max_length= 255,primary_key=True)
    cleaning_status = models.CharField(max_length= 255) 
    webpage_url_id = models.ForeignKey(DomainReview, on_delete=models.CASCADE, to_field='url', null=True, blank=True, db_column='webpage_url_id')
    download_url_id = models.ForeignKey(Download, on_delete=models.CASCADE, to_field='url_id', null=True, blank=True, db_column='download_url_id')
    title=models.CharField(max_length=255)
    keyword = models.CharField(max_length=255)
    content_type = models.CharField(max_length=255)
    link_count = models.IntegerField(null=True, blank=True)  
    link_status = models.CharField(max_length=255)
    content_status = models.CharField(max_length=255)
    download_status = models.CharField(max_length=100, null=True,blank=True)
    path_Link = models.CharField(max_length=500 , null=True,blank=True)
    description = models.CharField(max_length=255 , null= True,blank=True)
    duration = models.TimeField(null=True, blank=True)
    advertisment_level = models.CharField(max_length=255,null= True,blank=True)
    copyright_status = models.CharField(max_length=255,null= True,blank=True)
    crawl_method = models.CharField(max_length=255,null= True,blank=True)
    error = models.CharField(max_length=255)
    reason = models.TextField(blank=True, null=True)
    employee = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, to_field='employee_id', db_column='employee_id')
    date = models.DateTimeField(auto_now=True)
    def clean(self):
        if not self.webpage_url and not self.download_url:
            raise ValidationError("At least one of webpage_url or download_url must be provided.")
    
    class Meta:
        db_table = 'ccd_cleaning'  

# views.py
from django.shortcuts import render, redirect
from django.contrib.auth import login, get_user_model ,logout ,authenticate
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework.views import APIView
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Discovery, DomainReview, Download, Cleaning ,CustomUser ,WorkAllocation 
import logging
from django.db.models import Q
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from urllib.parse import urlparse, urlunparse
from django.contrib import messages  
from .decorators import restrict_pages
import pandas as pd
from io import BytesIO
from django.utils import timezone
from django.db import transaction
from openpyxl.styles import Font
logger = logging.getLogger(__name__)
from django.contrib.auth.hashers import make_password

User = get_user_model()

class LoginView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return redirect('dashboard')
        return render(request, 'ccd_app/login.html')

    def post(self, request):
        employee_id = request.POST.get("username", "").strip()
        password = request.POST.get("password", "").strip()

        if not employee_id or not password:
            messages.error(request, "Both employee ID and password are required.")
            return render(request, 'ccd_app/login.html')

        # Authenticate user
        user = authenticate(request, employee_id=employee_id, password=password)

        if user is not None:
            # Login successful
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')
            # Removed the messages.success with username greeting
            return redirect('dashboard')
        else:
            # Invalid credentials, stay on login page with error
            return render(request, 'ccd_app/login.html', {'error': 'Invalid credentials'})


USER_CREATION_ROLES = ['Supervisor']

@restrict_pages(allowed_roles=USER_CREATION_ROLES)

def user_creation(request):
    is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'

    if request.method == 'POST':
        if is_ajax:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'errors': 'Invalid JSON'}, status=400)
        else:
            data = request.POST

        # Extract data
        username = data.get('username')
        employee_id = data.get('employee_id')
        password = data.get('password')
        role = data.get('role')

        # Validate required fields
        if not all([username, employee_id, password, role]):
            errors = {}
            if not username:
                errors['username'] = 'This field is required.'
            if not employee_id:
                errors['employee_id'] = 'This field is required.'
            if not password:
                errors['password'] = 'This field is required.'
            if not role:
                errors['role'] = 'This field is required.'
            
            if is_ajax:
                return JsonResponse({'success': False, 'errors': errors}, status=400)
            messages.error(request, "Please correct the errors below.")
            context = {'form': data, 'employees': CustomUser.objects.filter(role='Executive').order_by('employee_id')}
            return render(request, 'ccd_app/usercreation.html', context)

        # Check if employee_id already exists
        if CustomUser.objects.filter(employee_id=employee_id).exists():
            if is_ajax:
                return JsonResponse({'success': False, 'errors': {'employee_id': 'Employee ID already exists'}}, status=400)
            messages.error(request, "Employee ID already exists.")
            context = {'form': data, 'employees': CustomUser.objects.filter(role='Executive').order_by('employee_id')}
            return render(request, 'ccd_app/usercreation.html', context)

        # Hash the password using Django's PBKDF2 SHA256
        hashed_password = make_password(password)

        # Create and save the user
        user = CustomUser(
            employee_id=employee_id,
            username=username,
            password=hashed_password,  # Store the PBKDF2 SHA256 hashed password
            plain_password=password,  # If you still need to store plain password (not recommended)
            role=role,
            last_login=timezone.now()
        )
        user.save()

        # Handle response
        if is_ajax:
            return JsonResponse({
                'success': True,
                'username': username,
                'plain_password': password
            })
        messages.success(request, "User created successfully!")
        return render(request, 'ccd_app/usercreation.html', {
            'form': {},
            'employees': CustomUser.objects.filter(role='Executive').order_by('employee_id')
        })

    # GET request
    employees = CustomUser.objects.filter(role='Executive').order_by('employee_id')
    context = {
        'form': {},
        'employees': employees,
    }

    if not is_ajax:
        return render(request, 'ccd_app/usercreation.html', context)
    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@restrict_pages(allowed_roles=['Supervisor'])
def work_allocation(request):
    if request.method == 'POST':
        employee_id = request.POST.get('employee_id')
        scopes = request.POST.getlist('scope')

        try:
            employee = CustomUser.objects.get(employee_id=employee_id)
            with transaction.atomic():
                WorkAllocation.objects.filter(employee=employee).delete()
                for scope in scopes:
                    WorkAllocation.objects.update_or_create(
                        employee=employee,
                        scope=scope,
                        defaults={'username': employee.username}
                    )
            success_message = f"Work allocated to {employee_id} - {', '.join(scopes)}"
            employees = CustomUser.objects.filter(role='Executive').order_by('employee_id')
            print("Employees (POST):", list(employees.values('employee_id', 'username')))  # Debug
            return render(request, 'ccd_app/usercreation.html', {
                'employees': employees,
                'success_message': success_message
            })
        except CustomUser.DoesNotExist:
            messages.error(request, "Employee not found.")
            employees = CustomUser.objects.filter(role='Executive').order_by('employee_id')
            print("Employees (POST Error):", list(employees.values('employee_id', 'username')))  # Debug
            return render(request, 'ccd_app/usercreation.html', {
                'employees': employees,
                'error': 'Employee not found'
            })
    
    employees = CustomUser.objects.filter(role='Executive').order_by('employee_id')
    print("Employees (GET):", list(employees.values('employee_id', 'username')))  # Debug
    return render(request, 'ccd_app/usercreation.html', {
        'employees': employees,
        'error': 'Employee not found' if request.method == 'POST' else None
    })

def get_work_allocations(request):
    employee_id = request.GET.get('employee_id')
    if not employee_id:
        return JsonResponse({'error': 'Employee ID required'}, status=400)
    try:
        employee = CustomUser.objects.get(employee_id=employee_id)
        allocations = WorkAllocation.objects.filter(employee=employee).values('scope', 'allocated_at')
        allocation_data = [
            {'scope': a['scope'], 'date': a['allocated_at'].strftime('%Y-%m-%d') if a['allocated_at'] else 'No date'}
            for a in allocations
        ]
        return JsonResponse({'allocations': allocation_data})
    except CustomUser.DoesNotExist:
        return JsonResponse({'error': 'Employee not found'}, status=404)
    


@restrict_pages(allowed_roles=['Supervisor'])
@login_required
def reports(request):
    # Fetch all employees
    employees = CustomUser.objects.all()
    #print("Employees:", employees.count())  # Debugging: Check if employees are fetched

    # Get the selected employee ID (if the user is authenticated)
    selected_employee_id = request.user.employee_id if request.user.is_authenticated else None
    #print("User:", request.user, "Authenticated:", request.user.is_authenticated, "ID:", selected_employee_id)  # Debugging

    # Render the reports template with the context
    return render(request, 'ccd_app/reports.html', {
        'employees': employees,
        'selected_employee_id': selected_employee_id
    })

EXECUTIVE_PAGES = ['/ccd/dashboard/', '/ccd/discovery/', '/ccd/domain-review/', '/ccd/download/', '/ccd/cleaning/']
ALLOWED_ROLES = ['Supervisor', 'Executive'] 

@restrict_pages(allowed_pages=EXECUTIVE_PAGES, allowed_roles=ALLOWED_ROLES)
def dashboard(request):
    if request.user.role == 'Executive':
        allocated_scopes = WorkAllocation.objects.filter(employee=request.user).values_list('scope', flat=True)
    else:
        allocated_scopes = ['Discovery', 'DomainReview', 'Download', 'Cleaning']  # Full access for Supervisors

    context = {
        'allocated_scopes': list(allocated_scopes),
    }
    return render(request, 'ccd_app/dashboard.html', context)


@restrict_pages(allowed_pages=EXECUTIVE_PAGES, allowed_roles=ALLOWED_ROLES)
def discovery_view(request):
    return render(request, 'ccd_app/discovery.html', {'message': 'Hello from discovery page!'})

@restrict_pages(allowed_pages=EXECUTIVE_PAGES, allowed_roles=ALLOWED_ROLES)
def domain_review_view(request):
    return render(request, 'ccd_app/DomainReview.html')

@restrict_pages(allowed_pages=EXECUTIVE_PAGES, allowed_roles=ALLOWED_ROLES)
def download(request):
    return render(request, 'ccd_app/download.html')

@restrict_pages(allowed_pages=EXECUTIVE_PAGES, allowed_roles=ALLOWED_ROLES)
def cleaning_view(request):
    return render(request, 'ccd_app/cleaning.html')


def check_keyword(request):
    keyword = request.GET.get('keyword')
    offset = int(request.GET.get('offset', 0))  # Default to 0
    limit = int(request.GET.get('limit', 10))   # Default to 15
    query = Q()
    
    if keyword:
        query &= (Q(unique_code__icontains=keyword) |
                  Q(url__icontains=keyword) |
                  Q(title__icontains=keyword) |
                  Q(keyword__icontains=keyword) |
                  Q(course__icontains=keyword) |
                  Q(content_type__icontains=keyword) |
                  Q(link_status__icontains=keyword))
    
    discovery_queryset = Discovery.objects.filter(query)
    total_count = discovery_queryset.count()

    if discovery_queryset.exists():
        # Apply pagination
        paginated_queryset = discovery_queryset[offset:offset + limit]
        details = [
            {
                'unique_code': discovery.unique_code,
                'url': discovery.url,
                'title': discovery.title,
                'keyword': discovery.keyword,
                'course': discovery.course,
                'content_type': discovery.content_type,
                'link_count': discovery.link_count,
                'copyright_status': discovery.copyright_status,
                'link_status': discovery.link_status,
            } for discovery in paginated_queryset
        ]
        return JsonResponse({
            'exists': True,
            'results': details,
            'match_count': total_count  # Total count of all matches
        })
    else:
        return JsonResponse({'exists': False, 'message': 'No matching records found'})

@csrf_exempt
def submit_discovery(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url = data.get('url')
            title = data.get('title')
            keyword = data.get('keyword')
            course = data.get('course')
            content_type = data.get('content_type')
            link_count = data.get('link_count')
            copyright_status = data.get('copyright_status')
            link_status = data.get('link_status')

            # Get the employee_id from the logged-in user's username
            employee_id = request.user.employee_id
            print(f"Employee ID: {employee_id}")  # Debugging

            errors = {}
            if not url: errors['url'] = 'URL is required.'
            if not title: errors['title'] = 'Title is required.'
            if not keyword: errors['keyword'] = 'Keyword is required.'
            if not course: errors['course'] = 'Course name is required.'
            if not content_type: errors['content_type'] = 'Content type is required.'
            if content_type == "webpage" and not link_count: errors['link_count'] = 'Link count is required for webpages.'
            if not copyright_status: errors['copyright_status'] = 'Copyright status is required.'
            if not link_status: errors['link_status'] = 'Link status is required.'

            if errors:
                return JsonResponse({'success': False, 'message': 'Please fill the required field.', 'errors': errors})

            # Find the CustomUser instance based on the employee_id (logged-in user)
            try:
                employee = CustomUser.objects.get(employee_id=employee_id)
                print(f"Employee found: {employee}")  # Debugging
            except CustomUser.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Employee not found.'})

            # Generate unique_code
            last_discovery = Discovery.objects.order_by('-unique_code').first()
            unique_code = 100000 if not last_discovery else int(last_discovery.unique_code) + 1
            unique_code = f"{unique_code:06d}"

            # Create the Discovery object
            discovery = Discovery(
                unique_code=unique_code,
                url=url,
                title=title,
                keyword=keyword,
                course=course,
                content_type=content_type,
                link_count=link_count if link_count else None,
                copyright_status=copyright_status,
                link_status=link_status,
                employee=employee  # Assign the CustomUser instance here
            )
            discovery.save()

            return JsonResponse({'success': True, 'message': 'Form submitted successfully', 'unique_code': unique_code})

        except Exception as e:
            return JsonResponse({'success': False, 'message': f'There was an error with your submission: {str(e)}'})

    return JsonResponse({'success': False, 'message': 'Invalid request method'})


# Domain Review Views
def get_domain_review_data(request):
    url = request.GET.get('domainUrl', None)
    if url:
        try:
            domain_review = Discovery.objects.get(url=url)
            response_data = {
                'url': domain_review.url,
                'title': domain_review.title,
                'keyword': domain_review.keyword,
                'course': domain_review.course,
                'content_type': domain_review.content_type,
                'link_count': domain_review.link_count,
                'copyright_status': domain_review.copyright_status,
                'link_status': domain_review.link_status,
            }
            return JsonResponse(response_data, status=200)
        except Discovery.DoesNotExist:
            return JsonResponse({'message': 'URL not found'}, status=404)
    return JsonResponse({'message': 'Invalid URL'}, status=400)

def check_domain_url(request):
    domain_url = request.GET.get('domainUrl')
    if not domain_url:
        return JsonResponse({'exists': False, 'message': 'No domain URL provided.'})
    
    results = Discovery.objects.filter(url__icontains=domain_url)
    if results.exists():
        details = [
            {
                'url': result.url,
                'title': result.title,
                'keyword': result.keyword,
                'course': result.course,
                'content_type': result.content_type,
                'link_count': result.link_count,
                'copyright_status': result.copyright_status,
                'link_status': result.link_status,
            } for result in results
        ]
        return JsonResponse({'exists': True, 'result': details})
    else:
        return JsonResponse({'exists': False, 'message': 'No matching records found.'})
    

def check_url(request):
    url = request.GET.get('url', '').strip()
    if not url:
        return JsonResponse({'exists': False})
    url_exists = Discovery.objects.filter(url=url).exists()
    return JsonResponse({'exists': url_exists})

@csrf_exempt
def fetch_next_unsubmitted_url(request):
    try:
        discovery_instance = Discovery.objects.filter(processed=False).exclude(
            url__in=DomainReview.objects.values('url')
        ).first()
        if not discovery_instance:
            return JsonResponse({'success': False, 'message': 'No more unsubmitted URLs available.'})
        return JsonResponse({
            'success': True,
            'url': discovery_instance.url,
            'unique_code': discovery_instance.unique_code,
        })
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return JsonResponse({'success': False, 'message': f'Error fetching URL: {str(e)}'})

@csrf_exempt
def submit_domainreview(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url = data.get('url')
            link_status = data.get('link_status')
            content_status = data.get('content_status')
            invalid_reason = data.get('invalid_reason')
            content_type = data.get('content_type')
            employee_id = request.user.employee_id

            errors = {}
            if not url: errors['url'] = 'URL is required.'
            if not link_status: errors['link_status'] = 'Link status is required.'
            if not content_status: errors['content_status'] = 'Content status is required.'
            if not content_type: errors['content_type'] = 'Content type is required.'
            if content_status == "invalid" and not invalid_reason: errors['invalid_reason'] = 'Invalid reason is required for content status "invalid".'
            
            if errors:
                return JsonResponse({'success': False, 'message': 'There were errors with your submission.', 'errors': errors})
            try:
                employee = CustomUser.objects.get(employee_id=employee_id)
                print(f"Employee found: {employee}")  # Debugging
            except CustomUser.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Employee not found.'})

            discovery_instance = Discovery.objects.get(url=url)
            unique_code_value = discovery_instance.unique_code

            domain_review = DomainReview(
                id=unique_code_value,
                url=discovery_instance,
                link_status=link_status,
                content_status=content_status,
                invalid_reason=invalid_reason if content_status == "invalid" else None,
                content_type=content_type,
                employee=employee
            )
            domain_review.save()
            return JsonResponse({'success': True, 'message': 'Form submitted successfully'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'There was an error with your submission: {str(e)}'})
    return JsonResponse({'success': False, 'message': 'Invalid request method'})

def check_domainurl(request):
    url = request.GET.get('domainUrl')
    if not url:
        logger.error("URL parameter is missing or invalid")
        return JsonResponse({'exists': False, 'message': 'URL parameter is missing or invalid'})

    discoveries = Discovery.objects.filter(url=url)
    logger.info(f"Found {discoveries.count()} matching records")
    if discoveries.exists():
        results = [
            {
                'unique_code': discovery.unique_code,
                'url': discovery.url,
                'title': discovery.title,
                'keyword': discovery.keyword,
                'course': discovery.course,
                'content_type': discovery.content_type,
                'link_count': discovery.link_count,
                'copyright_status': discovery.copyright_status,
                'link_status': discovery.link_status,
            } for discovery in discoveries
        ]
        return JsonResponse({'exists': True, 'results': results})
    else:
        return JsonResponse({'exists': False, 'message': 'No matching records found'})
    
# Download Views
def check_downloadurl(request):
    url = request.GET.get('downloadURL')
    if not url:
        logger.error("URL parameter is missing or invalid")
        return JsonResponse({'exists': False, 'message': 'URL parameter is missing or invalid'})
    
    downloads = DomainReview.objects.filter(url_id__url=url)
    logger.info(f"Found {downloads.count()} matching records")
    if downloads.exists():
        results = [
            {
                'id': download.id,
                'url_id': download.url_id.url if isinstance(download.url_id, DomainReview) else download.url_id,
                'link_status': download.link_status,
                'content_status': download.content_status,
                'invalid_reason': download.invalid_reason,
                'content_type': download.content_type,
            } for download in downloads
        ]
        return JsonResponse({'exists': True, 'results': results})
    else:
        return JsonResponse({'exists': False, 'message': 'No matching records found'})

@csrf_exempt
def submit_download(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url_id = data.get('url')
            download_status = data.get('download_status')
            path_link = data.get('path_link')
            reason_for_notdownloaded = data.get('reason')
            employee_id = request.user.employee_id
            
            domain_review_instance = DomainReview.objects.get(url=url_id)
            unique_code = domain_review_instance.id
            content_type = domain_review_instance.content_type
            try:
                employee = CustomUser.objects.get(employee_id=employee_id)
                print(f"Employee found: {employee}")  # Debugging
            except CustomUser.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Employee not found.'})

            if download_status == "downloaded":
                download_instance = Download(
                    id=unique_code,
                    url_id=domain_review_instance,
                    download_status=download_status,
                    path_link=path_link,
                    reason_for_notdownloaded=None,
                    employee = employee,
                    content_type = content_type
                )
            elif download_status == "not_downloaded":
                download_instance = Download(
                    id=unique_code,
                    url_id=domain_review_instance,
                    download_status=download_status,
                    path_link=None,
                    reason_for_notdownloaded=reason_for_notdownloaded,
                    employee = employee,
                    content_type = content_type
                )
            download_instance.save()
            return JsonResponse({'success': True, 'message': 'Form submitted successfully.'})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON format.'})
        except Exception as e:
            print(f"An error occurred: {str(e)}")
            return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'})
    return JsonResponse({'success': False, 'message': 'Invalid request method'})

@csrf_exempt
def fetch_next_url(request):
    try:
        content_types = ['video', 'audio', 'pdf', 'ppt']
        domain_review_instance = DomainReview.objects.filter(
            processed=False,
            content_type__in=content_types,
            link_status='open'
        ).exclude(
            url__in=DomainReview.objects.filter(processed=True).values('url')
        ).first()
        if not domain_review_instance:
            return JsonResponse({'success': False, 'message': 'No more unsubmitted URLs available.'})
        
        domain_review_instance.processed = True
        domain_review_instance.save()
        
        discovery_data = {
            'unique_code': domain_review_instance.url.unique_code,
            'url': domain_review_instance.url.url,
        } if domain_review_instance.url else None
        
        response_data = {
            'success': True,
            'url': domain_review_instance.url.url,
            'unique_code': domain_review_instance.id,
            'discovery': discovery_data
        }
        return JsonResponse(response_data)
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return JsonResponse({'success': False, 'message': f'Error fetching URL: {str(e)}'})

@csrf_exempt
def fetch_url_details(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            url_id = data.get('url')
            domain_review = DomainReview.objects.get(url_id=url_id)
            response_data = {
                'link_status': domain_review.link_status,
                'content_status': domain_review.content_status,
                'invalid_reason': domain_review.invalid_reason,
                'content_type': domain_review.content_type,
                'processed': domain_review.processed,
            }
            return JsonResponse(response_data, status=200)
        except DomainReview.DoesNotExist:
            return JsonResponse({'error': 'URL not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid request method'}, status=405)

# Cleaning Views
import urllib.parse

def check_cleaningurlWebpage(request):
    url = request.GET.get('downloadURL')
    if url:
        url = urllib.parse.unquote(url)
    
    logger.info(f"Received URL: {url}")
    if not url:
        logger.error("URL parameter is missing or invalid")
        return JsonResponse({'exists': False, 'message': 'URL parameter is missing or invalid'})
    
    downloads = DomainReview.objects.filter(url_id__url=url)
    logger.info(f"Found {downloads.count()} matching records")
    if downloads.exists():
        results = [
            {
                'id': download.id,
                'url_id': download.url_id.url if isinstance(download.url_id, DomainReview) else download.url_id,
                'link_status': download.link_status,
                'content_status': download.content_status,
                'invalid_reason': download.invalid_reason,
                'content_type': download.content_type,
            } for download in downloads
        ]
        return JsonResponse({'exists': True, 'results': results})
    else:
        logger.info(f"No records found for URL: {url}")
        return JsonResponse({'exists': False, 'message': 'No matching records found'})

@csrf_exempt
def check_downloadCleaningUrl(request):
    if request.method == 'GET':
        try:
            url = request.GET.get('linkcleaningurl')
            if not url:
                return JsonResponse({'exists': False, 'message': 'URL parameter is required'}, status=400)
            
            url = urllib.parse.unquote(url)
            logger.info(f"Processed linkcleaningurl========debug====: {url}")
            
            try:
                URLValidator()(url)
            except ValidationError:
                return JsonResponse({'exists': False, 'message': 'Invalid URL format'}, status=400)
            
            logger.info(f"Attempting query for URL: {url}")
            download = Download.objects.filter(url_id__url=url).first()
            logger.info(f"Query result: {'None' if download is None else download.id}")
            
            if download:
                domain_review = download.url_id
                discovery_url = domain_review.url
                result = {
                    'id': str(download.id),
                    'url': str(discovery_url.url),
                    'download_status': str(download.download_status) if download.download_status else '',
                    'path_link': str(download.path_link) if download.path_link else '',
                    'reason_for_notdownloaded': str(download.reason_for_notdownloaded) if download.reason_for_notdownloaded else 'N/A',
                }
                logger.info(f"Result: {result}")
                return JsonResponse({'exists': True, 'results': [result]})
            else:
                return JsonResponse({'exists': False, 'message': 'No matching records found'})
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return JsonResponse({'exists': False, 'message': f'Unexpected error: {str(e)}'}, status=500)
    return JsonResponse({'exists': False, 'message': 'Invalid request method'}, status=405)

@csrf_exempt
def fetch_next_webpage_url(request):
    try:
        content_types = ['Webpage']
        webpage_cleaning = DomainReview.objects.filter(
            processed=False,
            content_type__in=content_types,
            link_status='open'
        ).exclude(
            url__in=DomainReview.objects.filter(processed=True).values('url')
        ).first()
        if not webpage_cleaning:
            return JsonResponse({'success': False, 'message': 'No more unsubmitted URLs available.'})
        
        webpage_cleaning.processed = True
        webpage_cleaning.save()
        
        discovery_data = {'url': webpage_cleaning.url.url} if webpage_cleaning.url else None
        return JsonResponse({
            'success': True,
            'url': discovery_data.get('url', None),
            'discovery': discovery_data
        })
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return JsonResponse({'success': False, 'message': f'Error fetching URL: {str(e)}'})

@csrf_exempt
def fetch_next_downloaded_url(request):
    try:
        download_cleaning = Download.objects.filter(
            downloadprocessed=False,
        ).filter(
            Q(download_status="downloaded") |
            (Q(download_status="not_downloaded") & Q(reason_for_notdownloaded__icontains="webpage"))
        ).exclude(
            url_id__in=Download.objects.filter(downloadprocessed=True).values('url_id')
        ).first()
        if not download_cleaning:
            return JsonResponse({'success': False, 'message': 'No more unsubmitted URLs available.'})
        
        if download_cleaning.url_id:
            domain_review_instance = download_cleaning.url_id
            if domain_review_instance:
                discovery_instance = domain_review_instance.url
                if discovery_instance:
                    parsed_url = urlparse(discovery_instance.url)
                    clean_url = urlunparse(parsed_url._replace(fragment=''))
                    cleaning_data = {'url': clean_url}
                    download_cleaning.downloadprocessed = True
                    download_cleaning.save()
                    return JsonResponse({'success': True, 'cleaning_data': cleaning_data})
        return JsonResponse({'success': False, 'message': 'No valid URL found in DomainReview model.'})
    except Exception as e:
        print(f"Error occurred: {str(e)}")
        return JsonResponse({'success': False, 'message': f'Error fetching URL: {str(e)}'})


@csrf_exempt
def submit_cleaning(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Invalid request method'})

    try:
        print(f"Received raw data: {request.body}")
        data = json.loads(request.body)
        print(f"Parsed data: {data}")

        # Extract fields from the client data
        cleaning_status = data.get('CleaningStatus')
        webpage_url_id = data.get('cleaningurl')
        download_url_id = data.get('linkcleaningurl')
        path_link = data.get('pathLink') 
        description = data.get('descriptionInput')
        duration = data.get('duration')
        advertisment_level = data.get('advertisementLevel')
        copyright_status = data.get('copyrights')
        crawl_method = data.get('Crawlmethod')
        error = data.get('error')
        reason = data.get('reason')
        content_type_client = data.get('contentType')
        employee_id = request.user.employee_id

        print(f"Error field value: {error}")

        # Validate employee
        try:
            employee = CustomUser.objects.get(employee_id=employee_id)
            print(f"Employee found: {employee}")
        except CustomUser.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Employee not found.'})

        if not cleaning_status:
            return JsonResponse({'success': False, 'message': 'Cleaning status is required'})

        if cleaning_status == "Webpage":
            if not webpage_url_id:
                return JsonResponse({'success': False, 'message': 'Webpage URL is required'})
            if not error:
                return JsonResponse({'success': False, 'message': 'Error status is required'})

            try:
                domain_review_instance = DomainReview.objects.get(url=webpage_url_id)
            except DomainReview.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Webpage URL not found in DomainReview.'})

            unique_code = domain_review_instance.id
            discovery_instance = domain_review_instance.url
            title = discovery_instance.title
            keyword = discovery_instance.keyword
            content_type = domain_review_instance.content_type
            link_count = discovery_instance.link_count
            link_status = domain_review_instance.link_status
            content_status = domain_review_instance.content_status
            download_status = None

            if error == "error":
                if not reason:
                    return JsonResponse({'success': False, 'message': 'Reason is required when error is selected'})
                description = advertisment_level = copyright_status = crawl_method = None
            elif error == "notanError":
                mandatory_fields = [description, advertisment_level, copyright_status, crawl_method]
                if not all(field is not None for field in mandatory_fields):
                    return JsonResponse({
                        'success': False,
                        'message': 'Description, advertisement level, copyright status, and crawl method are required when not an error'
                    })
            else:
                return JsonResponse({'success': False, 'message': 'Invalid error status'})

            cleaning_instance = Cleaning(
                unique_code=unique_code,
                cleaning_status=cleaning_status,
                webpage_url_id=domain_review_instance,
                download_url_id=None,
                title=title,
                keyword=keyword,
                content_type=content_type,
                link_count=link_count,
                link_status=link_status,
                content_status=content_status,
                download_status=download_status,
                path_Link=None,  
                description=description,
                duration=None,
                advertisment_level=advertisment_level,
                copyright_status=copyright_status,
                crawl_method=crawl_method,
                error=error,
                reason=reason,
                employee=employee
            )

        elif cleaning_status == "DownloadedLinkContent":
            if not download_url_id:
                return JsonResponse({'success': False, 'message': 'Download URL is required'})
            if not error:
                return JsonResponse({'success': False, 'message': 'Error status is required'})

            try:
                download_instance = Download.objects.get(url_id__url=download_url_id)
            except Download.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Download URL not found in Download records.'})

            unique_code = download_instance.id
            domainreview = download_instance.url_id
            discovery = domainreview.url
            title = discovery.title
            keyword = discovery.keyword
            content_type = domainreview.content_type
            link_count = None
            link_status = domainreview.link_status
            content_status = domainreview.content_status
            download_status = download_instance.download_status

            print(f"error: {error}, content_type (db): {content_type}, content_type_client: {content_type_client}, duration: {duration}")

            if error == "error":
                if not reason:
                    return JsonResponse({'success': False, 'message': 'Reason is required when error is selected'})
                description = path_link = duration = advertisment_level = copyright_status = crawl_method = None
            elif error == "notanError":
                mandatory_fields = [description, path_link, advertisment_level, copyright_status, crawl_method]
                if not all(field is not None for field in mandatory_fields):
                    return JsonResponse({
                        'success': False,
                        'message': 'Path link, description, advertisement level, copyright status, and crawl method are required when not an error'
                    })
                if content_type_client in ['video', 'audio']:
                    if duration is None or duration == "":
                        return JsonResponse({
                            'success': False,
                            'message': 'Video duration is required for video or audio content types when not an error'
                        })
                elif content_type_client in ['pdf', 'ppt','webpage']:
                    duration = None

            else:
                return JsonResponse({'success': False, 'message': 'Invalid error status'})

            cleaning_instance = Cleaning(
                unique_code=unique_code,
                cleaning_status=cleaning_status,
                webpage_url_id=None,
                download_url_id=download_instance,
                title=title,
                keyword=keyword,
                content_type=content_type,
                link_count=link_count,
                link_status=link_status,
                content_status=content_status,
                download_status=download_status,
                path_Link=path_link, 
                description=description,
                duration=duration,
                advertisment_level=advertisment_level,
                copyright_status=copyright_status,
                crawl_method=crawl_method,
                error=error,
                reason=reason,
                employee=employee
            )
        else:
            return JsonResponse({'success': False, 'message': 'Invalid cleaning status'})

        cleaning_instance.save()
        return JsonResponse({'success': True, 'message': 'Form submitted successfully'})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON format'})
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        return JsonResponse({'success': False, 'message': f'An error occurred: {str(e)}'})


@restrict_pages(allowed_roles=['Supervisor'])
def submit_report(request):
    if request.method == 'POST':
        report_type = request.POST.get('reports')
        scope = request.POST.get('scope')
        employee_id = request.POST.get('employee_id')
        from_date = request.POST.get('from_date')
        to_date = request.POST.get('to_date')

        scope_to_model = {
            'discovery': Discovery,
            'domainreview': DomainReview,
            'download': Download,
            'cleaning': Cleaning,
        }

        if from_date and to_date:
            from_date = timezone.make_aware(timezone.datetime.strptime(from_date, '%Y-%m-%d'))
            to_date = timezone.make_aware(timezone.datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
        else:
            messages.error(request, "From Date and To Date are required.")
            return render(request, 'ccd_app/reports.html', {'employees': CustomUser.objects.filter(role='Executive')})

        if report_type == 'overall_report':
            if scope not in scope_to_model:
                messages.error(request, "Invalid scope selected.")
                return render(request, 'ccd_app/reports.html', {'employees': CustomUser.objects.filter(role='Executive')})
            
            model = scope_to_model[scope]
            queryset = model.objects.filter(date__range=[from_date, to_date])
            # Exclude specific columns based on model
            exclude_columns = ['processed'] if scope in ['discovery', 'domainreview'] else ['downloadprocessed'] if scope == 'download' else []
            data = list(queryset.values())
            sheet_name = f"{scope.capitalize()}_Overall"

        elif report_type == 'userwise_report':
            if not employee_id:
                messages.error(request, "Employee ID is required for Userwise Report.")
                return render(request, 'ccd_app/reports.html', {'employees': CustomUser.objects.filter(role='Executive')})

            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                for scope_name, model in scope_to_model.items():
                    exclude_columns = ['processed'] if scope_name in ['discovery', 'domainreview'] else ['downloadprocessed'] if scope_name == 'download' else []
                    
                    if employee_id == 'all':
                        queryset = model.objects.filter(date__range=[from_date, to_date])
                        sheet_name = f"{scope_name.capitalize()}_All_Employees"
                    else:
                        queryset = model.objects.filter(
                            employee__employee_id=employee_id,
                            date__range=[from_date, to_date]
                        )
                        sheet_name = f"{employee_id}_{scope_name.capitalize()}"

                    data = list(queryset.values())
                    if data:
                        df = pd.DataFrame(data)
                        # Remove excluded columns
                        df = df.drop(columns=[col for col in exclude_columns if col in df.columns])
                        for col in df.columns:
                            if pd.api.types.is_datetime64_any_dtype(df[col]):
                                df[col] = df[col].dt.tz_localize(None)
                        df.to_excel(writer, sheet_name=sheet_name, index=False)

            output.seek(0)
            filename = f"{employee_id}_all_scopes_report.xlsx" if employee_id != 'all' else "all_employees_all_scopes_report.xlsx"
            response = HttpResponse(
                output,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename={filename}'
            return response

        else:
            messages.error(request, "Invalid report type.")
            return render(request, 'ccd_app/reports.html', {'employees': CustomUser.objects.filter(role='Executive')})

        if not data:
            messages.error(request, "No data found for the selected criteria.")
            return render(request, 'ccd_app/reports.html', {'employees': CustomUser.objects.filter(role='Executive')})

        df = pd.DataFrame(data)
        # Remove excluded columns
        df = df.drop(columns=[col for col in exclude_columns if col in df.columns])
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].dt.tz_localize(None)

        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=sheet_name, index=False)
        output.seek(0)

        filename = f"{scope}_report.xlsx"
        response = HttpResponse(
            output,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename={filename}'
        return response

    employees = CustomUser.objects.filter(role='Executive')
    return render(request, 'ccd_app/reports.html', {'employees': employees})

@login_required
def generate_report(request):
    if request.method != 'POST':
        logger.warning(f"Invalid request method: {request.method}")
        return JsonResponse({'success': False, 'message': 'Only POST requests are supported.'}, status=405)

    try:
        report_type = request.POST.get('reports')
        scope = request.POST.get('scope')
        from_date = request.POST.get('from_date')
        to_date = request.POST.get('to_date')
        employee_id = request.POST.get('employee_id')
        content_type_filter = request.POST.get('contentType')  # New parameter for content_type filter (only for overall_report)
        is_download = request.POST.get('download') == 'true'

        # Validation and date conversion logic
        if not from_date or not to_date:
            return JsonResponse({'success': False, 'message': 'From Date and To Date are required.'})

        from_date = timezone.make_aware(timezone.datetime.strptime(from_date, '%Y-%m-%d'))
        to_date = timezone.make_aware(timezone.datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59))

        scope_to_model = {
            'discovery': Discovery,
            'domainreview': DomainReview,
            'download': Download,
            'cleaning': Cleaning,
        }

        report_data = {
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d'),
        }

        if report_type == 'overall_report':
            if not scope:
                logger.warning("Missing scope for overall_report")
                return JsonResponse({'success': False, 'message': 'Scope is required for Overall Report.'})
            if scope not in scope_to_model:
                logger.warning(f"Invalid scope: {scope}")
                return JsonResponse({'success': False, 'message': f"Invalid scope selected: '{scope}'"})

            current_model = scope_to_model[scope]
            logger.info(f"Using model: {current_model.__name__}")

            # Base query for filtering by date
            base_query = current_model.objects.filter(date__range=[from_date, to_date])

            # Calculate total_count from previous table
            if scope == 'discovery':
                total_count = 0  # Adjust if needed
            elif scope == 'domainreview':
                total_count = Discovery.objects.filter(date__range=[from_date, to_date]).count()
            elif scope == 'download':
                content_types = ['video', 'audio', 'pdf', 'ppt']
                total_count = DomainReview.objects.filter(
                    date__range=[from_date, to_date],
                    content_type__in=content_types,
                    link_status='open'
                ).count()
            elif scope == 'cleaning':
                webpage_content_types = ['Webpage']
                webpage_total = DomainReview.objects.filter(
                    date__range=[from_date, to_date],
                    content_type__in=webpage_content_types,
                    link_status='open'
                ).count()
                download_total = Download.objects.filter(
                    date__range=[from_date, to_date],
                ).filter(
                    Q(download_status="downloaded") |
                    (Q(download_status="not_downloaded") & Q(reason_for_notdownloaded__icontains="webpage"))
                ).count()
                total_count = webpage_total + download_total
            else:
                logger.warning(f"Unrecognized scope: {scope}")
                return JsonResponse({'success': False, 'message': f"Unrecognized scope: '{scope}'"})

            # Calculate complete_count with detailed breakdowns
            complete_count = {}
            content_type_counts = {}

            if scope == 'discovery':
                logger.info("Processing discovery scope")
                complete_count = {
                    'open_links': base_query.filter(link_status='open').count(),
                    'not_open_links': base_query.exclude(link_status='open').count(),
                }

            elif scope == 'domainreview':
                logger.info("Processing domainreview scope")
                complete_count = {
                    'open_links': base_query.filter(link_status='open').count(),
                    'not_open_links': base_query.exclude(link_status='open').count(),
                    'valid_content': base_query.filter(content_status='valid').count(),
                    'not_valid_content': base_query.exclude(content_status='valid').count(),
                }

            elif scope == 'download':
                logger.info("Processing download scope")
                complete_count = {
                    'downloaded': base_query.filter(download_status='downloaded').count(),
                    'not_downloaded': base_query.filter(download_status='not_downloaded').count(),
                }

            elif scope == 'cleaning':
                logger.info("Processing cleaning scope")
                complete_count = {
                    'errors': base_query.filter(error='error').count(),
                    'not_errors': base_query.filter(error='notanError').count(),
                }

            # Add content_type breakdown only for overall_report if filter is provided
            print(content_type_filter)
            if content_type_filter:
                content_type_counts[content_type_filter] = base_query.filter(content_type=content_type_filter).count()
                # Optionally include all content types for completeness
                '''
                all_content_types = base_query.values_list('content_type', flat=True).distinct()
                for ct in all_content_types:
                    if ct != content_type_filter:
                        content_type_counts[ct] = base_query.filter(content_type=ct).count()
                        '''

            complete_total = sum(complete_count.values())
            pending_count = max(0, total_count - complete_total)
            percentage_complete = (complete_total / total_count * 100) if total_count > 0 else 0
            print(content_type_counts)
            report_data.update({
                'scope': scope,
                'total_count': total_count,
                'complete_count': complete_count,
                'complete_total': complete_total,
                'pending_count': pending_count,
                'percentage_complete': round(percentage_complete, 2),
                'content_type_counts': content_type_counts if content_type_filter else {}
            })

            logger.info("Returning JSON response for overall_report")
            return JsonResponse({'success': True, 'data': report_data})

        elif report_type == 'userwise_report':
            scope_counts = {}
            total_count = 0
            
            if employee_id == 'all':
                # Get all unique employee IDs
                employee_ids = set()
                for model in scope_to_model.values():
                    employee_ids.update(model.objects.filter(date__range=[from_date, to_date]).values_list('employee__employee_id', flat=True).distinct())

                # Breakdown by employee
                employee_breakdown = {}
                for emp_id in employee_ids:
                    if emp_id:  # Skip if emp_id is None
                        emp_counts = {}
                        for scope_name, model in scope_to_model.items():
                            count = model.objects.filter(employee__employee_id=emp_id, date__range=[from_date, to_date]).count()
                            emp_counts[scope_name] = count
                            total_count += count
                        employee_breakdown[emp_id] = emp_counts
                report_data.update({
                    'employee_id': 'all',
                    'employee_breakdown': employee_breakdown,
                    'total_count': total_count
                })
            else:
                # Single employee case
                for scope_name, model in scope_to_model.items():
                    count = model.objects.filter(employee__employee_id=employee_id, date__range=[from_date, to_date]).count()
                    scope_counts[scope_name] = count
                    total_count += count
                report_data.update({
                    'employee_id': employee_id,
                    'scopes': scope_counts,
                    'total_count': total_count
                })

            logger.info("Returning JSON response for userwise_report")
            return JsonResponse({'success': True, 'data': report_data})
        else:
            logger.warning(f"Invalid report type: {report_type}")
            return JsonResponse({'success': False, 'message': 'Invalid report type.'})

    except Exception as e:
        logger.error(f"Error in generate_report: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'message': f"An error occurred: {str(e)}"}, status=500)


def get_all_users(request):
    if request.method == 'GET':
        # Fetch username and plain_password
        users = CustomUser.objects.all().values('employee_id','username', 'plain_password','role')
        user_list = list(users)
        return JsonResponse({'success': True, 'users': user_list})
    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=405)

def get_work_allocations(request):
    if request.method == 'GET':
        employee_id = request.GET.get('employee_id')
        if employee_id:
            allocations = WorkAllocation.objects.filter(employee__employee_id=employee_id).values('employee_id', 'username', 'scope', 'allocated_at')
        else:
            allocations = WorkAllocation.objects.all().values('employee_id', 'username', 'scope', 'allocated_at')

        grouped_allocations = {}
        for alloc in allocations:
            key = f"{alloc['employee_id']}-{alloc['username']}"
            if key not in grouped_allocations:
                grouped_allocations[key] = {
                    'employee_id': alloc['employee_id'],
                    'username': alloc['username'],
                    'scopes': [],
                    'allocated_at': None
                }
            grouped_allocations[key]['scopes'].append(alloc['scope'])
            current_timestamp = alloc['allocated_at']
            if not grouped_allocations[key]['allocated_at'] or current_timestamp > grouped_allocations[key]['allocated_at']:
                grouped_allocations[key]['allocated_at'] = current_timestamp

        allocation_list = [
            {**group, 'allocated_at': group['allocated_at'].isoformat()} 
            for group in grouped_allocations.values()
        ]
        return JsonResponse({'success': True, 'allocations': allocation_list})
    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=405)

@login_required
def downloadGeneratedReport(request):
    logger.info("Entering generate_report view")
    if request.method != 'POST':
        logger.info("Non-POST request, rendering reports.html")
        employees = CustomUser.objects.filter(role='Executive')
        return render(request, 'ccd_app/reports.html', {'employees': employees})

    try:
        report_type = request.POST.get('reports')
        scope = request.POST.get('scope')
        from_date = request.POST.get('from_date')
        to_date = request.POST.get('to_date')
        employee_id = request.POST.get('employee_id')
        is_download = request.POST.get('download') == 'true'

        logger.info(f"Request parameters: report_type={report_type}, scope={scope}, from_date={from_date}, to_date={to_date}, employee_id={employee_id}, is_download={is_download}")

        if not report_type:
            logger.warning("Missing report_type")
            return JsonResponse({'success': False, 'message': 'Report type is required.'})

        if not from_date or not to_date:
            logger.warning("Missing date fields")
            return JsonResponse({'success': False, 'message': 'From Date and To Date are required.'})

        logger.info("Parsing dates")
        from_date = timezone.make_aware(timezone.datetime.strptime(from_date, '%Y-%m-%d'))
        to_date = timezone.make_aware(timezone.datetime.strptime(to_date, '%Y-%m-%d').replace(hour=23, minute=59, second=59))
        logger.info(f"Parsed dates: from_date={from_date}, to_date={to_date}")

        scope_to_model = {
            'discovery': Discovery,
            'domainreview': DomainReview,
            'download': Download,
            'cleaning': Cleaning,
        }

        report_data = {
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d'),
        }

        def generate_excel_data(model, scope, from_date, to_date, employee_id=None):
            """Helper function to generate Excel data with a Grand Total row."""
            data = []
            # Queryset based on whether it's userwise or overall report
            if employee_id == 'all':
                queryset = model.objects.filter(date__range=[from_date, to_date])
            elif employee_id:
                try:
                    employee = CustomUser.objects.get(employee_id=employee_id)
                    queryset = model.objects.filter(employee=employee, date__range=[from_date, to_date])
                except CustomUser.DoesNotExist:
                    logger.error(f"Employee {employee_id} does not exist")
                    return pd.DataFrame()
            else:  # For overall_report
                queryset = model.objects.filter(date__range=[from_date, to_date])

            logger.info(f"Queryset count for {scope}: {queryset.count()}")
            content_types = queryset.values_list('content_type', flat=True).distinct()
            logger.info(f"Content types: {list(content_types)}")

            # Ensure 'other' is included if not present
            if not content_types:
                logger.warning(f"No content types found for {scope}, defaulting to 'other'")
                content_types = ['other']
            elif 'other' not in content_types and 'other' not in [ct.lower() for ct in content_types]:
                content_types = list(content_types) + ['other']

            # Initialize totals
            totals = {'Total Count': 0}
            if scope == 'discovery' or scope == 'domainreview':
                totals.update({'Open': 0, 'Not Open': 0})
            elif scope == 'download':
                totals.update({'Downloaded': 0, 'Not Downloaded': 0})
            elif scope == 'cleaning':
                totals.update({'Error': 0, 'Not an Error': 0})

            if scope == 'discovery':
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    open_count = ct_queryset.filter(link_status='open').count()
                    not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                    
                    open_count = min(open_count, ct_total)
                    not_open_count = min(not_open_count, ct_total - open_count)
                    
                    data.append({
                        'content_type': ct,
                        'Total Count': ct_total,
                        'Open': open_count,
                        'Not Open': not_open_count
                    })
                    totals['Total Count'] += ct_total
                    totals['Open'] += open_count
                    totals['Not Open'] += not_open_count

                # Add Grand Total row
                data.append({
                    'content_type': 'Grand Total',
                    **totals
                })
                columns = ['content_type', 'Total Count', 'Open', 'Not Open']

            elif scope == 'domainreview':
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    open_count = ct_queryset.filter(link_status='open').count()
                    not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                    
                    open_count = min(open_count, ct_total)
                    not_open_count = min(not_open_count, ct_total - open_count)
                    
                    data.append({
                        'content_type': ct,
                        'Total Count': ct_total,
                        'Open': open_count,
                        'Not Open': not_open_count
                    })
                    totals['Total Count'] += ct_total
                    totals['Open'] += open_count
                    totals['Not Open'] += not_open_count

                data.append({
                    'content_type': 'Grand Total',
                    **totals
                })
                columns = ['content_type', 'Total Count', 'Open', 'Not Open']

            elif scope == 'download':
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    downloaded_count = ct_queryset.filter(download_status='downloaded').count()
                    not_downloaded_count = ct_queryset.filter(download_status__in=['not_downloaded', None]).count()
                    
                    downloaded_count = min(downloaded_count, ct_total)
                    not_downloaded_count = min(not_downloaded_count, ct_total - downloaded_count)
                    
                    data.append({
                        'content_type': ct,
                        'Total Count': ct_total,
                        'Downloaded': downloaded_count,
                        'Not Downloaded': not_downloaded_count
                    })
                    totals['Total Count'] += ct_total
                    totals['Downloaded'] += downloaded_count
                    totals['Not Downloaded'] += not_downloaded_count

                data.append({
                    'content_type': 'Grand Total',
                    **totals
                })
                columns = ['content_type', 'Total Count', 'Downloaded', 'Not Downloaded']

            elif scope == 'cleaning':
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    error_count = ct_queryset.filter(error='error').count()
                    not_error_count = ct_queryset.filter(error__in=['notanError', None]).count()
                    
                    error_count = min(error_count, ct_total)
                    not_error_count = min(not_error_count, ct_total - error_count)
                    
                    data.append({
                        'content_type': ct,
                        'Total Count': ct_total,
                        'Error': error_count,
                        'Not an Error': not_error_count
                    })
                    totals['Total Count'] += ct_total
                    totals['Error'] += error_count
                    totals['Not an Error'] += not_error_count

                data.append({
                    'content_type': 'Grand Total',
                    **totals
                })
                columns = ['content_type', 'Total Count', 'Error', 'Not an Error']

            logger.info(f"Generated data rows for {scope}: {len(data)}")
            logger.debug(f"Data content: {data}")
            df = pd.DataFrame(data, columns=columns)
            return df

        if report_type == 'overall_report':
            if not scope:
                logger.warning("Missing scope for overall_report")
                return JsonResponse({'success': False, 'message': 'Scope is required for Overall Report.'})
            if scope not in scope_to_model:
                logger.warning(f"Invalid scope: {scope}")
                return JsonResponse({'success': False, 'message': f"Invalid scope selected: '{scope}'"})

            current_model = scope_to_model[scope]
            logger.info(f"Using model: {current_model.__name__}")

            queryset = current_model.objects.filter(date__range=[from_date, to_date])
            total_count = queryset.count()
            logger.info(f"Total count for {scope}: {total_count}")
            if total_count == 0:
                logger.warning(f"No records found for {scope} between {from_date} and {to_date}")

            complete_count = {}

            if scope == 'discovery':
                logger.info("Processing discovery scope")
                complete_count = {
                    'open': 0,
                    'not_open': 0,
                    'by_content_type': {}
                }
                
                open_total = queryset.filter(link_status='open').count()
                not_open_total = queryset.exclude(link_status__in=['open', None]).count()
                
                complete_count['open'] = min(open_total, total_count)
                complete_count['not_open'] = min(not_open_total, total_count - complete_count['open'])
                
                content_types = queryset.values_list('content_type', flat=True).distinct()
                logger.info(f"Distinct content types: {list(content_types)}")
                
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    open_count = ct_queryset.filter(link_status='open').count()
                    not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                    
                    open_count = min(open_count, ct_total)
                    not_open_count = min(not_open_count, ct_total - open_count)
                    
                    complete_count['by_content_type'][ct] = {
                        'open': open_count,
                        'not_open': not_open_count,
                        'total_count': ct_total
                    }

            elif scope == 'domainreview':
                logger.info("Processing domainreview scope")
                complete_count = {
                    'link_status': {'open': 0, 'not_open': 0},
                    'content_status': {'valid': 0, 'not_valid': 0},
                    'by_content_type': {}
                }
                
                open_total = queryset.filter(link_status='open').count()
                not_open_total = queryset.exclude(link_status__in=['open', None]).count()
                
                complete_count['link_status']['open'] = min(open_total, total_count)
                complete_count['link_status']['not_open'] = min(not_open_total, total_count - complete_count['link_status']['open'])
                
                valid_total = queryset.filter(content_status='valid').count()
                not_valid_total = queryset.exclude(content_status__in=['valid', None]).count()
                
                complete_count['content_status']['valid'] = min(valid_total, total_count)
                complete_count['content_status']['not_valid'] = min(not_valid_total, total_count - complete_count['content_status']['valid'])
                
                content_types = queryset.values_list('content_type', flat=True).distinct()
                logger.info(f"Distinct content types: {list(content_types)}")
                
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    open_count = ct_queryset.filter(link_status='open').count()
                    not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                    valid_count = ct_queryset.filter(content_status='valid').count()
                    not_valid_count = ct_queryset.exclude(content_status__in=['valid', None]).count()
                    
                    open_count = min(open_count, ct_total)
                    not_open_count = min(not_open_count, ct_total - open_count)
                    valid_count = min(valid_count, ct_total)
                    not_valid_count = min(not_valid_count, ct_total - valid_count)
                    
                    complete_count['by_content_type'][ct] = {
                        'link_status': {'open': open_count, 'not_open': not_open_count},
                        'content_status': {'valid': valid_count, 'not_valid': not_valid_count},
                        'total_count': ct_total
                    }

            elif scope == 'download':
                logger.info("Processing download scope")
                complete_count = {
                    'downloaded': 0,
                    'not_downloaded': 0,
                    'by_content_type': {}
                }
                
                downloaded_total = queryset.filter(download_status='downloaded').count()
                not_downloaded_total = queryset.filter(download_status__in=['not_downloaded', None]).count()
                
                complete_count['downloaded'] = min(downloaded_total, total_count)
                complete_count['not_downloaded'] = min(not_downloaded_total, total_count - complete_count['downloaded'])
                
                content_types = queryset.values_list('content_type', flat=True).distinct()
                logger.info(f"Distinct content types: {list(content_types)}")
                
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    downloaded_count = ct_queryset.filter(download_status='downloaded').count()
                    not_downloaded_count = ct_queryset.filter(download_status__in=['not_downloaded', None]).count()
                    
                    downloaded_count = min(downloaded_count, ct_total)
                    not_downloaded_count = min(not_downloaded_count, ct_total - downloaded_count)
                    
                    complete_count['by_content_type'][ct] = {
                        'downloaded': downloaded_count,
                        'not_downloaded': not_downloaded_count,
                        'total_count': ct_total
                    }

            elif scope == 'cleaning':
                logger.info("Processing cleaning scope")
                complete_count = {
                    'error': 0,
                    'not_an_error': 0,
                    'by_content_type': {}
                }
                
                error_total = queryset.filter(error='error').count()
                not_error_total = queryset.filter(error__in=['notanError', None]).count()
                
                complete_count['error'] = min(error_total, total_count)
                complete_count['not_an_error'] = min(not_error_total, total_count - complete_count['error'])
                
                content_types = queryset.values_list('content_type', flat=True).distinct()
                logger.info(f"Distinct content types: {list(content_types)}")
                
                for ct in content_types:
                    ct_queryset = queryset.filter(content_type=ct)
                    ct_total = ct_queryset.count()
                    error_count = ct_queryset.filter(error='error').count()
                    not_error_count = ct_queryset.filter(error__in=['notanError', None]).count()
                    
                    error_count = min(error_count, ct_total)
                    not_error_count = min(not_error_count, ct_total - error_count)
                    
                    complete_count['by_content_type'][ct] = {
                        'error': error_count,
                        'not_an_error': not_error_count,
                        'total_count': ct_total
                    }

            report_data.update({
                'scope': scope,
                'total_count': total_count,
                'complete_count': complete_count,
            })

            if is_download:
                output = BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    df = generate_excel_data(current_model, scope, from_date, to_date)
                    logger.info(f"Excel DataFrame shape: {df.shape}")
                    logger.info(f"Excel DataFrame content: \n{df.to_string()}")
                    if df.empty:
                        logger.warning("Generated DataFrame is empty, adding default row")
                        if scope == 'discovery' or scope == 'domainreview':
                            default_data = [{
                                'content_type': 'No Data',
                                'Total Count': 0,
                                'Open': 0,
                                'Not Open': 0
                            }]
                        elif scope == 'download':
                            default_data = [{
                                'content_type': 'No Data',
                                'Total Count': 0,
                                'Downloaded': 0,
                                'Not Downloaded': 0
                            }]
                        else:  # cleaning
                            default_data = [{
                                'content_type': 'No Data',
                                'Total Count': 0,
                                'Error': 0,
                                'Not an Error': 0
                            }]
                        df = pd.DataFrame(default_data)
                    df.to_excel(writer, sheet_name=scope.capitalize(), index=False)

                    worksheet = writer.sheets[scope.capitalize()]
                    bold_font = Font(bold=True)
                    for row in range(1, worksheet.max_row + 1):
                        if worksheet.cell(row=row, column=1).value == 'Grand Total':
                            for col in range(1, worksheet.max_column + 1):
                                cell = worksheet.cell(row=row, column=col)
                                cell.font = bold_font

                output.seek(0)
                filename = f"overall_{scope}_generatedreport_{from_date.strftime('%Y%m%d')}_to_{to_date.strftime('%Y%m%d')}.xlsx"
                response = HttpResponse(
                    output,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename={filename}'
                logger.info(f"Returning Excel file: {filename}")
                return response

            logger.info("Returning JSON response for overall_report")
            return JsonResponse({'success': True, 'data': report_data})

        elif report_type == 'userwise_report':
            if not employee_id:
                logger.warning("Missing employee_id for userwise_report")
                return JsonResponse({'success': False, 'message': 'Employee ID is required for Userwise Report.'})

            scope_counts = {}
            for scope_name, model in scope_to_model.items():
                if employee_id == 'all':
                    queryset = model.objects.filter(date__range=[from_date, to_date])
                    total_count = queryset.count()
                else:
                    try:
                        employee = CustomUser.objects.get(employee_id=employee_id)
                        queryset = model.objects.filter(employee=employee, date__range=[from_date, to_date])
                        total_count = queryset.count()
                    except CustomUser.DoesNotExist:
                        logger.error(f"Employee with ID {employee_id} does not exist.")
                        return JsonResponse({'success': False, 'message': 'Employee ID not found.'})

                logger.info(f"Total count for {scope_name} (employee_id={employee_id}): {total_count}")

                if scope_name == 'discovery':
                    scope_counts[scope_name] = {
                        'total_count': total_count,
                        'open': 0,
                        'not_open': 0,
                        'by_content_type': {}
                    }
                    
                    open_total = queryset.filter(link_status='open').count()
                    not_open_total = queryset.exclude(link_status__in=['open', None]).count()
                    
                    scope_counts[scope_name]['open'] = min(open_total, total_count)
                    scope_counts[scope_name]['not_open'] = min(not_open_total, total_count - scope_counts[scope_name]['open'])
                    
                    content_types = queryset.values_list('content_type', flat=True).distinct()
                    for ct in content_types:
                        ct_queryset = queryset.filter(content_type=ct)
                        ct_total = ct_queryset.count()
                        open_count = ct_queryset.filter(link_status='open').count()
                        not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                        
                        open_count = min(open_count, ct_total)
                        not_open_count = min(not_open_count, ct_total - open_count)
                        
                        scope_counts[scope_name]['by_content_type'][ct] = {
                            'open': open_count,
                            'not_open': not_open_count,
                            'total_count': ct_total
                        }

                elif scope_name == 'domainreview':
                    scope_counts[scope_name] = {
                        'total_count': total_count,
                        'link_status': {'open': 0, 'not_open': 0},
                        'by_content_type': {}
                    }
                    
                    open_total = queryset.filter(link_status='open').count()
                    not_open_total = queryset.exclude(link_status__in=['open', None]).count()
                    
                    scope_counts[scope_name]['link_status']['open'] = min(open_total, total_count)
                    scope_counts[scope_name]['link_status']['not_open'] = min(not_open_total, total_count - scope_counts[scope_name]['link_status']['open'])
                    
                    content_types = queryset.values_list('content_type', flat=True).distinct()
                    for ct in content_types:
                        ct_queryset = queryset.filter(content_type=ct)
                        ct_total = ct_queryset.count()
                        open_count = ct_queryset.filter(link_status='open').count()
                        not_open_count = ct_queryset.exclude(link_status__in=['open', None]).count()
                        
                        open_count = min(open_count, ct_total)
                        not_open_count = min(not_open_count, ct_total - open_count)
                        
                        scope_counts[scope_name]['by_content_type'][ct] = {
                            'open': open_count,
                            'not_open': not_open_count,
                            'total_count': ct_total
                        }

                elif scope_name == 'download':
                    scope_counts[scope_name] = {
                        'total_count': total_count,
                        'downloaded': 0,
                        'not_downloaded': 0,
                        'by_content_type': {}
                    }
                    
                    downloaded_total = queryset.filter(download_status='downloaded').count()
                    not_downloaded_total = queryset.filter(download_status__in=['not_downloaded', None]).count()
                    
                    scope_counts[scope_name]['downloaded'] = min(downloaded_total, total_count)
                    scope_counts[scope_name]['not_downloaded'] = min(not_downloaded_total, total_count - scope_counts[scope_name]['downloaded'])
                    
                    content_types = queryset.values_list('content_type', flat=True).distinct()
                    for ct in content_types:
                        ct_queryset = queryset.filter(content_type=ct)
                        ct_total = ct_queryset.count()
                        downloaded_count = ct_queryset.filter(download_status='downloaded').count()
                        not_downloaded_count = ct_queryset.filter(download_status__in=['not_downloaded', None]).count()
                        
                        downloaded_count = min(downloaded_count, ct_total)
                        not_downloaded_count = min(not_downloaded_count, ct_total - downloaded_count)
                        
                        scope_counts[scope_name]['by_content_type'][ct] = {
                            'downloaded': downloaded_count,
                            'not_downloaded': not_downloaded_count,
                            'total_count': ct_total
                        }

                elif scope_name == 'cleaning':
                    scope_counts[scope_name] = {
                        'total_count': total_count,
                        'error': 0,
                        'not_an_error': 0,
                        'by_content_type': {}
                    }
                    
                    error_total = queryset.filter(error='error').count()
                    not_error_total = queryset.filter(error__in=['notanError', None]).count()
                    
                    scope_counts[scope_name]['error'] = min(error_total, total_count)
                    scope_counts[scope_name]['not_an_error'] = min(not_error_total, total_count - scope_counts[scope_name]['error'])
                    
                    content_types = queryset.values_list('content_type', flat=True).distinct()
                    for ct in content_types:
                        ct_queryset = queryset.filter(content_type=ct)
                        ct_total = ct_queryset.count()
                        error_count = ct_queryset.filter(error='error').count()
                        not_error_count = ct_queryset.filter(error__in=['notanError', None]).count()
                        
                        error_count = min(error_count, ct_total)
                        not_error_count = min(not_error_count, ct_total - error_count)
                        
                        scope_counts[scope_name]['by_content_type'][ct] = {
                            'error': error_count,
                            'not_an_error': not_error_count,
                            'total_count': ct_total
                        }

            report_data.update({
                'employee_id': employee_id,
                'scopes': scope_counts,
            })

            if is_download:
                output = BytesIO()
                with pd.ExcelWriter(output, engine='openpyxl') as writer:
                    for scope_name, counts in scope_counts.items():
                        df = generate_excel_data(
                            scope_to_model[scope_name],
                            scope_name,
                            from_date,
                            to_date,
                            employee_id
                        )
                        logger.info(f"Excel DataFrame shape for {scope_name}: {df.shape}")
                        logger.info(f"Excel DataFrame content for {scope_name}: \n{df.to_string()}")
                        if df.empty:
                            logger.warning(f"Generated DataFrame is empty for {scope_name}, adding default row")
                            if scope_name == 'discovery' or scope_name == 'domainreview':
                                default_data = [{
                                    'content_type': 'No Data',
                                    'Total Count': 0,
                                    'Open': 0,
                                    'Not Open': 0
                                }]
                            elif scope_name == 'download':
                                default_data = [{
                                    'content_type': 'No Data',
                                    'Total Count': 0,
                                    'Downloaded': 0,
                                    'Not Downloaded': 0
                                }]
                            else:  # cleaning
                                default_data = [{
                                    'content_type': 'No Data',
                                    'Total Count': 0,
                                    'Error': 0,
                                    'Not an Error': 0
                                }]
                            df = pd.DataFrame(default_data)
                        df.to_excel(writer, sheet_name=scope_name.capitalize(), index=False)

                        worksheet = writer.sheets[scope_name.capitalize()]
                        bold_font = Font(bold=True)
                        for row in range(1, worksheet.max_row + 1):
                            if worksheet.cell(row=row, column=1).value == 'Grand Total':
                                for col in range(1, worksheet.max_column + 1):
                                    cell = worksheet.cell(row=row, column=col)
                                    cell.font = bold_font

                output.seek(0)
                filename = f"userwise_{employee_id}_generatedreport_{from_date.strftime('%Y%m%d')}_to_{to_date.strftime('%Y%m%d')}.xlsx"
                response = HttpResponse(
                    output,
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                response['Content-Disposition'] = f'attachment; filename={filename}'
                logger.info(f"Returning Excel file: {filename}")
                return response

            logger.info("Returning JSON response for userwise_report")
            return JsonResponse({'success': True, 'data': report_data})

        else:
            logger.warning(f"Invalid report_type: {report_type}")
            return JsonResponse({'success': False, 'message': 'Invalid report type.'})

    except Exception as e:
        logger.error(f"Unexpected error in generate_report: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'message': f"Server error: {str(e)}"})   
@login_required                               
def logout_view(request):
    logout(request)
    return redirect('login')
function switchSection(clickedLink) {
    const sectionId = clickedLink.getAttribute("data-section");

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active-section');
    });

    // Show the selected section
    document.getElementById(sectionId).classList.add('active-section');

    // Update active link
    document.querySelectorAll('.navbar a').forEach(link => link.classList.remove('active'));
    clickedLink.classList.add('active');

    // Store active section in localStorage
    localStorage.setItem("activeSection", sectionId);
}
function toggleLinkCountTextbox() {
    const contentType = document.getElementById('contentType').value;
    const approxLinkCountDiv = document.getElementById('approxLinkCount');
    
    // Show the 'Approximate Link Count' input if 'webpage' is selected
    if (contentType === 'webpage') {
        approxLinkCountDiv.style.display = 'block';
    } else {
        approxLinkCountDiv.style.display = 'none';
    }
}
function handleStatusChange() {
    const status = document.getElementById('linkStatusReview').value;
    // Currently not using this, but you might need it later.
}

function handleContentChange() {
    const contentStatus = document.getElementById('contentReview').value;
    const invalidReasonDiv = document.getElementById('invalidReason');

    if (contentStatus === 'Invalid') {
        invalidReasonDiv.style.display = 'block';
    } else {
        invalidReasonDiv.style.display = 'none';
    }
}
function handleDropdowns() {
    handleStatusChange();
    handleContentChange();
}
function handleContentTypeChange() {
    const contentType = document.getElementById('contentType').value;
    const approxLinkCountDiv = document.getElementById('approxLinkCount');

    if (contentType === 'webpage') {
        approxLinkCountDiv.style.display = 'block';
    } else {
        approxLinkCountDiv.style.display = 'none';
    }
}
function toggleDownloadFields() {
    const status = document.getElementById('downloadstatus').value;
    const downloadedField = document.getElementById('downloaded-field');
    const notDownloadedField = document.getElementById('not-downloaded-field');

    // Show/hide fields based on selected download status
    if (status === 'downloaded') {
        downloadedField.style.display = 'block';
        notDownloadedField.style.display = 'none';
    } else if (status === 'not_downloaded') {
        notDownloadedField.style.display = 'block';
        downloadedField.style.display = 'none';
    } else {
        downloadedField.style.display = 'none';
        notDownloadedField.style.display = 'none';
    }
}
function checkActiveSection() {
    const activeSection = localStorage.getItem("activeSection");
    if (activeSection) {
        switchSection(document.querySelector(`[data-section="${activeSection}"]`));
    }
}
function toggleCleaningFields() {
    const status = document.getElementById('CleaningStatus').value;
    const descriptionField = document.getElementById('description-field');
    const pathLinkField = document.getElementById('path-link-field');
    const videoDurationField = document.getElementById('video-duration-field');
    const advertisementLevelField = document.getElementById('advertisement-level-field');

    // Show common fields
    descriptionField.style.display = 'block';
    pathLinkField.style.display = 'block';
    advertisementLevelField.style.display = 'block';

    // Show/hide fields based on selected cleaning status
    if (status === 'Webpage') {
        videoDurationField.style.display = 'none'; // Hide video duration for Webpage
    } else if (status === 'DownloadedLinkContent') {
        videoDurationField.style.display = 'block'; // Show video duration for Downloaded Link Content
    }
}
let counter = parseInt(localStorage.getItem('counter')) || 100000;  
function generateUniqueCode() {
const uniqueCode = counter.toString();  // Convert counter to string
counter++;  // Increment counter for the next unique code
localStorage.setItem('counter', counter);  // Save updated counter to localStorage
return uniqueCode;  // Return the generated unique code
}

function handleFormSubmission(event) {
    event.preventDefault();  // Prevent the form from submitting normally
    
    console.log('Form submit triggered');
    
    const csrfToken = getCookie('csrftoken');  // Retrieve CSRF token
    const unique_code= generateUniqueCode();
    // Collect form data
    const formData = {
        unique_code: unique_code,
        url: document.querySelector('[name="url"]').value,
        keyword: document.querySelector('[name="keyword"]').value,
        course: document.querySelector('[name="course"]').value,
        content_type: document.querySelector('[name="content_type"]').value,
        link_count: linkCountInput && linkCountInput.offsetParent !== null ? linkCountInput.value || null : null,
        copyright_status: document.querySelector('[name="copyright_status"]').value,
        link_status: document.querySelector('[name="link_status"]').value
    };
    
    // Ensure formData is populated
    console.log('Form Data:', formData);
    
    // Make the POST request to the server
    fetch('/ccd/submit-discovery/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,  // Include CSRF token in headers
        },
        body: JSON.stringify(formData), // Send the form data as JSON
    })
    .then(response => response.json())  // Parse JSON response
    .then(data => {
        console.log(data);  // Log the response for debugging
        if (data.success) {
            alert('Form submitted successfully!');
            document.querySelector('form').reset(); 
        } else {
            alert('There was an error: ' + data.message);
        }
    })
    .catch(error => console.error('Error:', error));
}


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
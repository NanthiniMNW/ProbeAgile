// Function to handle the change in the content status dropdown
function handleContentChange() {
    const contentStatus = document.getElementById('contentReview').value;
    const invalidReasonDiv = document.getElementById('invalidReason');

    // Show or hide the reason input based on the selected content status
    if (contentStatus === 'invalid') {
        invalidReasonDiv.style.display = 'block';
    } else {
        invalidReasonDiv.style.display = 'none';
    }
}

// Function to handle the change in the link status dropdown
// Function to handle form submission
function handleDomainReviewSubmission(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the CSRF token from cookies to prevent CSRF attacks
    const csrfToken = getCookie('csrftoken');

    // Create the form data object from the form fields
    const formData = {
        url: document.querySelector('[name="domainUrl"]').value,
        link_status: document.querySelector('[name="linkStatusReview"]').value,
        content_status: document.querySelector('[name="content"]').value,
        invalid_reason: document.querySelector('[name="reasonforinvalidstatus"]').value,
        content_type: document.querySelector('[name="contentType"]').value,
    };

    // Send a POST request to the server with the form data as JSON
    fetch('/ccd/submit_domainreview/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',  // We are sending JSON
            'X-CSRFToken': csrfToken,           // Include CSRF token for security
        },
        body: JSON.stringify(formData),  // Convert form data to JSON format
    })
    .then(response => response.json())  // Parse the JSON response from the server
    .then(data => {
        if (data.success) {
            // If submission is successful, alert the user and reset the form
            alert('Form submitted successfully!');
            document.querySelector('form').reset();  // Reset form fields

            // Clear the table and message after form reset
            clearTableAndMessage();

            // Optionally re-enable the next button if needed
            // document.getElementById('nextButton').disabled = false;
        } else {
            // If there was an error, alert the user with the message returned from the server
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        // Handle any network or fetch errors
        console.error('Error:', error);
        alert('There was an error submitting the form. Please try again.');
    });
}

// Clear the table and the message when form is reset
function clearTableAndMessage() {
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTable = document.getElementById('matchedurlTable');

    domainURLMessage.textContent = "";  // Clear the message
    domainURLMessage.style.color = "";  // Reset the message color
    matchedurlDetails.style.display = "none";  // Hide the matched URL details section
    matchedurlTable.innerHTML = "";  // Clear the table content
}




function switchSection(tabElement) {
    // Get all sections with class 'content-section'
    var sections = document.querySelectorAll('.content-section');

    // Hide all sections first
    sections.forEach(function(section) {
        section.classList.remove('active-section');
    });

    // Get the section corresponding to the clicked tab
    var sectionId = tabElement.getAttribute('data-section');
    var activeSection = document.getElementById(sectionId);

    // Show the selected section
    if (activeSection) {
        activeSection.classList.add('active-section');
    }

    // Optional: Highlight the active tab (add a class to the clicked tab)
    var tabs = document.querySelectorAll('.navbar a');
    tabs.forEach(function(tab) {
        tab.classList.remove('active-tab');
    });

    tabElement.classList.add('active-tab');
}

let debounceTimeout;

function handleUrlInput() {
    console.log("Input event triggered (manual)");
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        console.log("Debounce completed, calling searchurlKeyword");
        searchurlKeyword();
    }, 500); // 500ms delay for manual typing
}

function searchurlKeyword() {
    const keywordInput = document.getElementById('domainUrlInput').value.trim();
    const domainURLMessage = document.getElementById('domainURLMessage');
    const matchedurlDetails = document.getElementById('matchedurlDetails');
    const matchedurlTable = document.getElementById('matchedurlTable');

    if (keywordInput === "") {
        console.log("Input is empty.");
        domainURLMessage.textContent = "Please enter a search keyword.";
        domainURLMessage.style.color = "red";
        matchedurlDetails.style.display = "none";
        matchedurlTable.innerHTML = '';
        return;
    }

    console.log("Fetching with domainUrl:", keywordInput);
    domainURLMessage.textContent = "Loading...";
    domainURLMessage.style.color = "black";

    fetch(`/ccd/check_domainurl/?domainUrl=${encodeURIComponent(keywordInput)}`)
    .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log("Data received:", data);
        matchedurlTable.innerHTML = ''; // Clear previous table

        if (data.exists && data.results && data.results.length > 0) {
            console.log("Matching records found, generating table...");
            domainURLMessage.textContent = "Matching records found.";
            domainURLMessage.style.color = "green";
            matchedurlDetails.style.display = "block";
            matchedurlTable.innerHTML = generateurlTable(data.results);
        } else {
            console.log("No matching records found.");
            domainURLMessage.textContent = data.message || "No matching records found.";
            domainURLMessage.style.color = "red";
            matchedurlDetails.style.display = "none";
        }
    })
    .catch(error => {
        console.error('Error checking keyword:', error);
        domainURLMessage.textContent = "An error occurred: " + error.message;
        domainURLMessage.style.color = "red";
        matchedurlDetails.style.display = "none";
    });
}

function generateurlTable(results) {
    console.log('Results for table:', results);
    let tableHTML = `
        <div style="overflow-x: auto; margin-top: 10px;">
            <table border="1" cellpadding="3" cellspacing="0" style="width: 100%; table-layout: auto; font-size: 12px;">
                <thead>
                    <tr>
                        <th>Unique ID</th>
                        <th>URL</th>
                        <th>Title</th>
                        <th>Keyword</th>
                        <th>Course Name</th>
                        <th>Content Type</th>
                        <th>Link Count</th>
                        <th>Copyright Status</th>
                        <th>Link Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    results.forEach(result => {
        tableHTML += `
            <tr>
                <td>${result.unique_code || 'N/A'}</td>
                <td>${result.url || 'N/A'}</td>
                <td>${result.title || 'N/A'}</td>
                <td>${result.keyword || 'N/A'}</td>
                <td>${result.course || 'N/A'}</td>
                <td>${result.content_type || 'N/A'}</td>
                <td>${result.link_count || 'N/A'}</td>
                <td>${result.copyright_status || 'N/A'}</td>
                <td>${result.link_status || 'N/A'}</td>
            </tr>
        `;
    });
    tableHTML += `</tbody></table></div>`;
    console.log('Generated Table HTML:', tableHTML);
    return tableHTML;
}
document.querySelector('[name="content"]').addEventListener('change', function(event) {
    const reasonField = document.querySelector('[name="reasonforinvalidstatus"]');
    
    if (event.target.value === 'invalid') {
        reasonField.style.display = 'block';  // Show the input field if content_status is 'invalid'
        reasonField.setAttribute('required', true);  // Make it required
    } else {
        reasonField.style.display = 'none';  // Hide the input field if content_status is not 'invalid'
        reasonField.removeAttribute('required');  // Remove the required attribute if not needed
    }
});



let hasClickListener = false;

function handleNextButtonClick() {
    console.log("Next button clicked");
    const csrfToken = getCookie('csrftoken');

    fetch('/ccd/fetch-next-unsubmitted-url/', {
        method: 'GET',
        headers: {
            'X-CSRFToken': csrfToken,
        },
    })
    .then(response => {
        console.log("Response status:", response.status);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json(); // Parse JSON directly
    })
    .then(data => {
        console.log("Next URL data:", data);
        if (data.success && data.url) {
            const url = data.url;
            const uniqueCode = data.unique_code;
            console.log('Next URL:', url);
            console.log('Unique Code:', uniqueCode);

            // Update the input field and trigger search
            const urlInput = document.getElementById('domainUrlInput');
            urlInput.value = url;
            console.log("Input updated to:", urlInput.value);

            // Immediately fetch details for the new URL
            searchurlKeyword();
        } else {
            alert(data.message || 'No more unsubmitted URLs available.');
        }
    })
    .catch(error => {
        console.error('Error fetching next URL:', error);
        alert('Error fetching URL: ' + error.message);
    });
}

// Ensure getCookie is defined
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
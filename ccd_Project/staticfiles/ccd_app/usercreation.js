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

async function registerUser() {
    try {
        const username = document.getElementById("username").value;
        const employee_id = document.getElementById("employeeid").value;
        const password = document.getElementById("password").value;
        const role = document.querySelector('input[name="role"]:checked').value;

        const response = await fetch('/ccd/usercreation/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
                username: username,
                employee_id: employee_id,
                password: password,
                role: role,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.errors && errorData.errors.employee_id) {
                throw new Error(errorData.errors.employee_id); // Specific error for employee_id
            }
            throw new Error(errorData.errors || 'Registration failed');
        }

        const data = await response.json();
        if (data.success) {
            alert("User registered successfully!");
            if (data.redirect_url) {
                window.location.href = data.redirect_url;  // Redirect to the dashboard
            }
        } else {
            alert("Error: " + JSON.stringify(data.errors));
        }
    } catch (error) {
        console.error('Registration Error:', error);
        alert(`Registration failed: ${error.message}`);
    }
}

document.getElementById("submitBtn").addEventListener("click", (event) => {
    event.preventDefault();
    registerUser();
});


document.getElementById('employeeid_alloc').addEventListener('change', function() {
    const selectElement = this;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const username = selectedOption.getAttribute('data-username');
    const employeeId = selectedOption.value;
    const displayArea = document.getElementById('selected_employee_name');

    if (employeeId && username && employeeId !== "") {
        // Initial display with just the selected info
        displayArea.innerHTML = `<b>Selected: ${employeeId} - ${username}</b>`;
        
        fetch(`/ccd/get_work_allocations/?employee_id=${encodeURIComponent(employeeId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch allocations');
            return response.json();
        })
        .then(data => {
            console.log('Work allocations:', data);
            if (data.allocations && data.allocations.length > 0) {
                const allocationText = data.allocations.map(alloc => `${alloc.scope} (${alloc.date})`).join(', ');
                displayArea.innerHTML = `<b>Selected: ${employeeId} - ${username}</b><br><b>Previous Allocations: ${allocationText}</b>`;
            } else {
                displayArea.innerHTML = `<b>Selected: ${employeeId} - ${username}</b><br><b>No previous allocations</b>`;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayArea.innerHTML = `<b>Selected: ${employeeId} - ${username}</b><br><b>Error loading allocations: ${error.message}</b>`;
        });
    } else {
        displayArea.innerHTML = '<b>Please select an employee</b>';
    }
});

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
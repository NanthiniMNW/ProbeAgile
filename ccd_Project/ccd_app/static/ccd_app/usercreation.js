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
            throw new Error(errorData.errors || 'Registration failed');
        }

        const data = await response.json();
        if (data.success) {
            alert(`User registered successfully!\nUsername: ${data.username}\nPassword: ${data.plain_password}`);
            document.getElementById("usercreation").reset();
        } else {
            alert("Error: " + JSON.stringify(data.errors));
        }
    } catch (error) {
        console.error('Registration Error:', error);
        alert(`Registration failed: ${error.message}`);
    }
}

// Event listeners
document.getElementById("submitBtn").addEventListener("click", (event) => {
    event.preventDefault();
    registerUser();
});

// Show users when button is clicked
document.getElementById('showUsersBtn').addEventListener('click', () => {
    fetchAllUsers();
});

// Hide users when hide button is clicked
document.getElementById('hideUsersBtn').addEventListener('click', () => {
    document.getElementById('userList').style.display = 'none';
});

document.getElementById('employeeid_alloc').addEventListener('change', function() {
    const selectElement = this;
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const username = selectedOption.getAttribute('data-username');
    const employeeId = selectedOption.value;
    const displayArea = document.getElementById('selected_employee_name');

    if (employeeId && username && employeeId !== "") {
        displayArea.innerHTML = `<span style="color: rgb(61, 83, 145);"><b>Selected:</b> ${employeeId} - ${username}</span>`;
        
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
                const allocation = data.allocations[0];
                const allocationText = allocation.scopes.join(', ');
                const allocatedAt = new Date(allocation.allocated_at).toLocaleString();
                displayArea.innerHTML = `
                    <span style="color: rgb(61, 83, 145);"><b>Selected:</b> ${employeeId} - ${username}</span><br>
                    <span style="color: rgb(61, 83, 145);"><b>Previous Allocations:</b> ${allocationText} (Last allocated: ${allocatedAt})</span>
                `;
            } else {
                displayArea.innerHTML = `
                    <span style="color: rgb(61, 83, 145);"><b>Selected:</b> ${employeeId} - ${username}</span><br>
                    <span style="color: rgb(61, 83, 145);"><b>No previous allocations</b></span>
                `;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            displayArea.innerHTML = `
                <span style="color: rgb(61, 83, 145);"><b>Selected:</b> ${employeeId} - ${username}</span><br>
                <span style="color: rgb(255, 0, 0);"><b>Error loading allocations:</b> ${error.message}</span>
            `;
        });
    } else {
        displayArea.innerHTML = '<span style="color: rgb(255, 0, 0);"><b>Please select an employee</b></span>';
    }
});

async function fetchAllUsers() {
    try {
        const response = await fetch('/ccd/all_users/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        if (data.success) {
            const userTableBody = document.getElementById('userTableBody');
            userTableBody.innerHTML = ''; // Clear existing content
            data.users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.employee_id}</td>
                    <td>${user.username}</td>
                    <td>${user.plain_password || 'N/A'}</td>
                    <td>${user.role}</td>
                `;
                userTableBody.appendChild(row);
            });
            document.getElementById('userList').style.display = 'block';
        } else {
            document.getElementById('userTableBody').innerHTML = '<tr><td colspan="2">Error loading users</td></tr>';
            document.getElementById('userList').style.display = 'block';
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        document.getElementById('userTableBody').innerHTML = `<tr><td colspan="2">Error: ${error.message}</td></tr>`;
        document.getElementById('userList').style.display = 'block';
    }
}

async function fetchWorkAllocations() {
    try {
        const response = await fetch('/ccd/work_allocations/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (!response.ok) throw new Error('Failed to fetch work allocations');
        const data = await response.json();
        console.log('Fetched data:', data);

        if (data.success) {
            const workTableBody = document.getElementById('workTableBody');
            workTableBody.innerHTML = ''; // Clear existing content
            data.allocations.forEach(allocation => {
                const row = document.createElement('tr');
                const allocatedAt = allocation.allocated_at 
                    ? new Date(allocation.allocated_at).toLocaleString() 
                    : 'N/A';
                row.innerHTML = `
                    <td>${allocation.employee_id || 'N/A'}</td>
                    <td>${allocation.username || 'N/A'}</td>
                    <td>${allocation.scopes.join(', ') || 'N/A'}</td>
                    <td>${allocatedAt}</td>
                `;
                workTableBody.appendChild(row);
            });
            document.getElementById('workAllocationList').style.display = 'block';
        } else {
            document.getElementById('workTableBody').innerHTML = '<tr><td colspan="4">Error loading work allocations</td></tr>';
            document.getElementById('workAllocationList').style.display = 'block';
        }
    } catch (error) {
        console.error('Fetch Error:', error);
        document.getElementById('workTableBody').innerHTML = `<tr><td colspan="4">Error: ${error.message}</td></tr>`;
        document.getElementById('workAllocationList').style.display = 'block';
    }
}

// Show work allocations when button is clicked
document.getElementById('showWorkDetailsBtn').addEventListener('click', () => {
    fetchWorkAllocations();
});

// Hide work allocations when hide button is clicked
document.getElementById('hideWorkDetailsBtn').addEventListener('click', () => {
    document.getElementById('workAllocationList').style.display = 'none';
});

// Clear tables and hide them on page load/refresh
document.addEventListener('DOMContentLoaded', () => {
    // Clear user table
    const userTableBody = document.getElementById('userTableBody');
    if (userTableBody) {
        userTableBody.innerHTML = '';
    }
    // Hide user table
    const userList = document.getElementById('userList');
    if (userList) {
        userList.style.display = 'none';
    }

    // Clear work allocation table
    const workTableBody = document.getElementById('workTableBody');
    if (workTableBody) {
        workTableBody.innerHTML = '';
    }
    // Hide work allocation table
    const workAllocationList = document.getElementById('workAllocationList');
    if (workAllocationList) {
        workAllocationList.style.display = 'none';
    }
});
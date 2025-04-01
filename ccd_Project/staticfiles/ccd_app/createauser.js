function validateForm(event) {
    event.preventDefault();
    
    // Get form elements
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    
    // Get error elements
    const usernameError = document.getElementById('usernameError');
    const passwordError = document.getElementById('passwordError');
    
    // Reset error messages
    usernameError.style.display = 'none';
    passwordError.style.display = 'none';
    submitBtn.disabled = false;

    let isValid = true;

    // Validate username
    if (username.value.length < 4) {
        usernameError.style.display = 'block';
        isValid = false;
    }

    // Validate password
    if (password.value.length < 8) {
        passwordError.style.display = 'block';
        isValid = false;
    }

    // If valid, submit the form
    if (isValid) {
        document.getElementById('usercreation').submit();
    } else {
        submitBtn.disabled = true;
    }

    return isValid;
}

// Add event listener to form
document.getElementById('usercreation').addEventListener('submit', validateForm);

// Real-time validation
const inputs = document.querySelectorAll('input');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        validateForm({ preventDefault: () => {} });
    });
});
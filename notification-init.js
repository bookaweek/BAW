// notification-init.js

// Check for service worker support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
            console.log('Service Worker registered with scope:', registration.scope);
        }, function(err) {
            console.log('Service Worker registration failed:', err);
        });
    });
}

// Function to request notification permission
function requestNotificationPermission() {
    Notification.requestPermission().then(function(result) {
        if (result === 'granted') {
            console.log('Notification permission granted.');
        } else if (result === 'denied') {
            console.log('Notification permission denied.');
        } else {
            console.log('Notification permission dismissed.');
        }
    });
}

// Function to show notification
function showNotification(title, options) {
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    }
}

// Toggle management for notifications
let notificationsEnabled = false;
function toggleNotifications() {
    notificationsEnabled = !notificationsEnabled;
    if (notificationsEnabled) {
        requestNotificationPermission();
    } else {
        console.log('Notifications disabled.');
    }
}
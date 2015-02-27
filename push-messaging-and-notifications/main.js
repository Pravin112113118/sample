'use strict';

var API_KEY = '<YOUR API KEY HERE>';

var curlCommandDiv = document.querySelector('.js-curl-command');
var isPushEnabled = false;

function showCurlCommand(subscription) {
  // The curl command to trigger a push message straight from GCM
  var subscriptionId = subscription.subscriptionId;
  var endpoint = subscription.endpoint;
  var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
    '" --header Content-Type:"application/json" ' + endpoint + 
    ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

  // Below is a curl command to test sending a push message
  console.log(curlCommand);
  curlCommandDiv.textContent = curlCommand;
}

function unsubscribe() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;
  curlCommandDiv.textContent = '';

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // To unsubscribe from push messaging, you need get the
    // subcription object, which you can call unsubscribe() on.
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {
        // Check we have a subscription to unsubscribe
        if (!pushSubscription) {
          // No subscription object, so set the state
          // to allow the user to subscribe to push
          isPushEnabled = false;
          pushButton.disabled = false;
          return;
        }
        
        var subscriptionId = pushSubscription.subscriptionId;
        // TODO: Make a request to your server to remove
        // the subscriptionId from your data store so you 
        // don't attempt to send them push messages anymore

        // We have a subcription, so call unsubscribe on it
        pushSubscription.unsubscribe().then(function(successful) {
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
          isPushEnabled = false;

          if (!successful) {
            console.error('We were unable to unregister from push');
            return;
          }
        }).catch(function(e) {
          // We failed to unsubscribe, this can lead to
          // an unusual state, so may be best to remove 
          // the subscription id from your data store and 
          // inform the user that you disabled push

          console.log('Unsubscription error: ', e);
          pushButton.disabled = false;
        });
      }).catch(function(e) {
        console.error('Error thrown while unsubscribing from push messaging.', e);
      });
  });
}


function subscribe() {
  // Disable the button so it can't be changed while
  // we process the permission request
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe()
      .then(function(subscription) {
        // The subscription was successful
        isPushEnabled = true;

        // TODO: Send the subscription.subscriptionId and 
        // subscription.endpoint to your server
        // and save it to send a push message at a later date
        // sendSubscriptionToServer is defined in subscription-controller.js
        // (This is so sendSubscriptionToServer can be imported in the
        // service-worker.js file)
        sendSubscriptionToServer(subscription);
        showCurlCommand(subscription);
        
        pushButton.textContent = 'Disable Push Messages';
        pushButton.disabled = false;
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          // The user denied the notification permission which
          // means we failed to subscribe and the user will need
          // to manually change the notification permission to
          // subscribe to push messages
          console.warn('Permission for Notifications was denied');
          pushButton.disabled = true;
        } else {
          // A problem occurred with the subscription, this can
          // often be down to an issue or lack of the gcm_sender_id
          // and / or gcm_user_visible_only
          console.error('Unable to subscribe to push.', e);
          pushButton.disabled = false;
        }
      });
  });
}

// Once the service worker is registered set the initial state
function initialiseState() {
  // Are Notifications supported?
  if (!('Notification' in window)) {
    console.warn('Notifications aren\'t supported.');
    return;
  }

  // Check the current Notification permission.
  // If its denied, it's a permanent block until the
  // user changes the permission
  if (Notification.permission === 'denied') {
    console.warn('The user has blocked notifications.');
    return;
  }

  // Check if push messaging is supported
  if (!('PushManager' in window)) {
    console.warn('Push messaging isn\'t supported.');
    return;
  }

  // We need the service worker registration to check for a subscription
  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    // Do we already have a push message subscription?
    serviceWorkerRegistration.pushManager.getSubscription()
      .then(function(subscription) {
        // Enable any UI which subscribes / unsubscribes from
        // push messages.
        var pushButton = document.querySelector('.js-push-button');
        pushButton.disabled = false;

        if (!subscription) {
          // We aren’t subscribed to push, so set UI
          // to allow the user to enable push
          return;
        }

        showCurlCommand(subscription);

        // Set your UI to show they have subscribed for
        // push messages
        pushButton.textContent = 'Disable Push Messages';
        isPushEnabled = true;
      })
      .catch(function(err) {
        console.warn('Error during getSubscription()', err);
      });
  });
}


window.addEventListener('load', function() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.addEventListener('click', function() {
    if (isPushEnabled) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  // Check that service workers are supported, if so, progressively
  // enhance and add push messaging support, otherwise continue without it.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(initialiseState);
  } else {
    console.warn('Service workers aren\'t supported in this browser.');
  }
});
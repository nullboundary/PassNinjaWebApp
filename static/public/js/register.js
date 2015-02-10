var login = (function(ninjaSignIn, $, undefined) {

  'use strict';
  var provider = {
    google: {
      loginURL: '/auth/gplus',
      authURL: 'https://accounts.google.com/o/oauth2/auth',
      queryParams: {
        client_id: '969868015384-o3odmnhi4f6r4tq2jismc3d3nro2mgvb.apps.googleusercontent.com',
        redirect_uri: window.location.protocol + '//' + window.location.host + '/auth/success',
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        state: 'state'
      },
      popupOptions: {
        width: 452,
        height: 633
      }
    },
    linkedin: {
      loginURL: '/auth/linkedin',
      authURL: 'https://www.linkedin.com/uas/oauth2/authorization',
      queryParams: {
        client_id: '75mfhvxm75cuur',
        redirect_uri: window.location.protocol + '//' + window.location.host + '/auth/success',
        response_type: 'code',
        scope: 'r_basicprofile r_emailaddress',
        state: 'state'
      },
      popupOptions: {
        width: 452,
        height: 633
      }
    }
  };
  /***********************************************************


  ***********************************************************/
  function init() {

      //set to correct login status
      setMenuItems();

      //setup nav button listeners
      $(document).on('click', '#logout-btn', logOut);
      $(document).on('click', '#pass-btn', function(e){
        if(isAuthenticated()){
          loadAccount();
        }
      });

      //oauth signin buttons
      $(document).on('click', '.signin', signIn);

      //setup login modal handlers
      var dialog = document.querySelector('dialog#login-modal');

      dialogPolyfill.registerDialog(dialog); //register with polyfill

      //on click login nav button
      $(document).on('click', '#login-btn', function() {
        console.log(dialog);
        dialog.showModal();

      });

      //on click dialog close button
      $(document).on('click', '#login-close', function() {
        dialog.close();
      });

      //click outside modal box
      $(document).on('click', 'dialog#login-modal', function(e) {
        if (!dialog.open) { //don't close if not open...
          return;
        }
        if (clickedInDialog(dialog, e)) { //don't close if clicked inside modal
          return;
        }
        dialog.close();
      });




  }
  /***********************************************************


  ***********************************************************/
  function setMenuItems() {

    if (isAuthenticated()) { //show logout
      $('#login-btn').hide();
      $('#logout-btn').show();
      $('#pass-btn').show();

    } else { //show login

      $('#login-btn').show();
      $('#logout-btn').hide();
      $('#pass-btn').hide();
    }

  }

  /***********************************************************


  ***********************************************************/
  function clickedInDialog(dialog, mouseEvent) {
    var rect = dialog.getBoundingClientRect();
    return rect.top <= mouseEvent.clientY && mouseEvent.clientY <= rect.top + rect.height && rect.left <= mouseEvent.clientX && mouseEvent.clientX <= rect.left + rect.width;
  }

  /***********************************************************


  ***********************************************************/
  function signIn(e) {
      e.preventDefault();

      $('#login-spin').show(); //show spinner
      $('.signin').prop('disabled', true); //disable sigin buttons

      var authProvider = $(this).attr('id');
      if (isAuthenticated()) { //already logged in
        loadAccount();
      } else { //initiate oauth sign in
        if (setState(provider[authProvider])) {
          var url = getAuthUrl(provider[authProvider]); //get the provider url
          //Set Oauth Popup
          oAuthPopup(provider[authProvider], url);
        }
      }

    }
    /***********************************************************


    ***********************************************************/
  function isAuthenticated() {

      var token = readCookie('token');

      if (token) { //a simple check if the token expired.
        if (token.split('.').length === 3) {
          var base64Url = token.split('.')[1];
          var base64 = base64Url.replace('-', '+').replace('_', '/');
          var exp = JSON.parse(window.atob(base64)).exp;
          return Math.round(new Date().getTime() / 1000) <= exp;
        } else {
          return true;
        }
      }
      return false;
    }
    /***********************************************************


    ***********************************************************/
  function logOut() {

    window.sessionStorage.clear(); //clear it all
    eraseCookie('token'); //remove token.
    window.location = "/";


  }

  /***********************************************************


   ***********************************************************/
  function oAuthPopup(auth, url) {

      //open the oauth window
      var options = auth.popupOptions;
      var popupWindow = window.open(url, '_blank', 'width=' + options.width + ',height=' + options.height);

      //focus the oauth window
      if (popupWindow && popupWindow.focus) {
        popupWindow.focus();
      }

      var polling = window.setInterval(function() {
        try {
          if (popupWindow.document.domain === document.domain && (popupWindow.location.search || popupWindow.location.hash)) {

            popupWindow.close();
            window.clearInterval(polling);
            post(auth.loginURL, popupWindow.location.search);

          }
        } catch (error) {}

        if (popupWindow.closed) {
          window.clearInterval(polling);
        }
      }, 35);
    }
    /***********************************************************


     ***********************************************************/
  function getAuthUrl(authProvider) {

    var str = $.param(authProvider.queryParams);
    console.log(authProvider.authURL + "?" + str);
    return authProvider.authURL + "?" + str;
  }
  /***********************************************************


  ***********************************************************/
  function setState(authProvider) {
    var sid = readCookie("sid");
    if (!sid) {
      return false;
    }
    authProvider.queryParams.state = sid;
    return true;
  }

  /***********************************************************


  ***********************************************************/
  function post(provider, query) {

    var jqxhr = $.post(provider + query)
      .done(function(data) {
        createCookie("token", data.token);
        loadAccount();
      })
      .fail(function(response) {
        if (response.status === 401 || response.status === 403) {
          logOut();
        }
      })
      .always(function() {

      });

  }

  /***********************************************************


  ***********************************************************/
  function loadAccount() {

    var authToken = readCookie('token');

    if (authToken) {
      window.location = "/accounts/home";
    }
  }

  /***********************************************************


  ***********************************************************/
  function createCookie(name, value, days) {
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
      } else var expires = "";
      document.cookie = name + "=" + value + expires + "; path=/";
    }
    /***********************************************************


    ***********************************************************/
  function readCookie(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    }
    /***********************************************************


    ***********************************************************/
  function eraseCookie(name) {
    createCookie(name, "", -1);
  }



  ninjaSignIn.init = function() {
    init();
  };

}(ninjaSignIn = window.ninjaSignIn || {}, jQuery));

ninjaSignIn.init();

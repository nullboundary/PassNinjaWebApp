var login = (function (ninjaSignIn, $, undefined) {

  'use strict';
  var provider = {
    google: {
      loginURL: '/auth/gplus',
      authURL: 'https://accounts.google.com/o/oauth2/auth',
      queryParams: {
        client_id: '969868015384-o3odmnhi4f6r4tq2jismc3d3nro2mgvb.apps.googleusercontent.com',
        redirect_uri: window.location.origin || window.location.protocol + '//' + window.location.host,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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

      $(document).on('click', '.signin', signIn);

    }
    /***********************************************************


    ***********************************************************/
  function signIn(e) {
      e.preventDefault();
      var authProvider = $(this).attr('id');
      if (isAuthenticated()) { //already logged in
        loadAccount();
      } else { //initiate oauth sign in
        var url = getAuthUrl(provider[authProvider]); //get the provider url
        //Set Oauth Popup
        oAuthPopup(provider[authProvider], url);
      }

    }
    /***********************************************************


    ***********************************************************/
  function isAuthenticated() {
      return window.sessionStorage.getItem('token')
    }
    /***********************************************************


    ***********************************************************/
  function logOut() {
    // The backend doesn't care about logouts, delete the token and you're good to go.
    window.sessionStorage.removeItem('token');
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

      var polling = window.setInterval(function () {
        try {
          if (popupWindow.document.domain === document.domain && (popupWindow.location.search || popupWindow.location.hash)) {
            //var queryParams = popupWindow.location.search.substring(1).replace(/\/$/, '');
            //var queryParams = getQueryParam(popupWindow.location.search.substr(1).split('&'));
            //var hashParams = popupWindow.location.hash.substring(1).replace(/\/$/, '');
            //console.log(queryParams['code']);
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
  function post(provider, query) {

    var jqxhr = $.post(provider + query)
      .done(function (data) {
        window.sessionStorage.setItem('token', data.token);
        loadAccount();
      })
      .fail(function (response) {
        if (response.status === 401 || response.status === 403) {
          window.sessionStorage.removeItem('token');
        }
      })
      .always(function () {

      });



  }

  /***********************************************************


  ***********************************************************/
  function loadAccount() {

    var authToken = isAuthenticated();
    if (authToken) {
      var params = {
        token: authToken
      }
      var tokenParam = jQuery.param(params);
      //document.cookie = "name=token";
      document.cookie = "token="+authToken;
      window.location = "/accounts/home" //?" + tokenParam;
    }
  }

  ninjaSignIn.init = function () {
    init();
  };

}(ninjaSignIn = window.ninjaSignIn || {}, jQuery));

ninjaSignIn.init();
